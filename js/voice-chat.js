export class VoiceChat {
  constructor(peerManager) {
    this.peerManager = peerManager;
    this.localStream = null;
    this.muted = false;
    this.active = false;
    // peerId → { audio, stream, analyser, gainNode, context }
    this.peers = new Map();
    this.onStateChange = () => {};
    this.onPeerActivity = () => {};

    peerManager.onTrack = (event, peerId) => this._handleRemoteTrack(event, peerId);
  }

  async start() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    for (const track of this.localStream.getAudioTracks()) {
      this.peerManager.addLocalTrack(track, this.localStream);
    }
    this._startLocalActivityDetection();
    this.active = true;
    this.onStateChange({ active: true, muted: this.muted });
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        track.enabled = !muted;
      }
    }
    this.onStateChange({ active: this.active, muted: this.muted });
  }

  setPeerVolume(peerId, volume) {
    const peer = this.peers.get(peerId);
    if (peer?.gainNode) peer.gainNode.gain.value = Math.max(0, Math.min(2, volume));
  }

  stop() {
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        this.peerManager.removeLocalTrack(track);
        track.stop();
      }
      this.localStream = null;
    }
    if (this._localContext) {
      this._localContext.close();
      this._localContext = null;
    }
    for (const [peerId, peer] of this.peers) {
      peer.audio.srcObject = null;
      peer.audio.remove();
      peer.context?.close();
      this.peers.delete(peerId);
    }
    this.active = false;
    this.onStateChange({ active: false, muted: this.muted });
  }

  // Returns a snapshot of peer speaking states for the UI to poll or receive via onPeerActivity
  getPeerStates() {
    return [...this.peers.entries()].map(([peerId, p]) => ({
      peerId,
      speaking: p.speaking ?? false
    }));
  }

  _handleRemoteTrack(event, peerId) {
    if (!event.streams?.length) return;
    const stream = event.streams[0];

    let peer = this.peers.get(peerId);
    if (!peer) {
      const audio = document.createElement('audio');
      audio.autoplay = true;
      audio.style.display = 'none';
      document.body.appendChild(audio);
      peer = { audio, stream: null, context: null, gainNode: null, analyser: null, speaking: false };
      this.peers.set(peerId, peer);
    }

    peer.audio.srcObject = stream;
    peer.stream = stream;
    this._startRemoteActivityDetection(peerId, peer, stream);
  }

  _startRemoteActivityDetection(peerId, peer, stream) {
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(gain);
      gain.connect(analyser);
      gain.connect(ctx.destination);
      peer.context = ctx;
      peer.gainNode = gain;
      peer.analyser = analyser;
      this._pollActivity(peerId, peer);
    } catch { /* AudioContext not supported — silent fallback */ }
  }

  _startLocalActivityDetection() {
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(this.localStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      this._localContext = ctx;
      this._localAnalyser = analyser;
      this._pollActivity('local', { analyser, speaking: false }, true);
    } catch { /* silent fallback */ }
  }

  _pollActivity(peerId, peer, isLocal = false) {
    const buf = new Uint8Array(peer.analyser.fftSize);
    const tick = () => {
      if (!peer.analyser) return;
      peer.analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += Math.abs(v - 128);
      const speaking = (sum / buf.length) > 2;
      if (speaking !== peer.speaking) {
        peer.speaking = speaking;
        this.onPeerActivity({ peerId: isLocal ? 'local' : peerId, speaking });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

