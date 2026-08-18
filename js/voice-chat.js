export class VoiceChat {
  constructor(peerManager, { onStateChange = () => {} } = {}) {
    this.peerManager = peerManager;
    this.onStateChange = onStateChange;
    this.localStream = null;
    this.remoteAudios = new Map();
    this.muted = false;
    this.active = false;
    this._container = null;
    this._startBtn = null;
    this._muteBtn = null;
    this._audioContainer = null;

    peerManager.onTrack = (event, peerId) => this._handleRemoteTrack(event, peerId);
  }

  async start() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    for (const track of this.localStream.getAudioTracks()) {
      this.peerManager.addLocalTrack(track, this.localStream);
    }
    this.active = true;
    this._syncUI();
    this.onStateChange({ active: true, muted: this.muted });
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        track.enabled = !muted;
      }
    }
    this._syncUI();
    this.onStateChange({ active: this.active, muted: this.muted });
  }

  stop() {
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        this.peerManager.removeLocalTrack(track);
        track.stop();
      }
      this.localStream = null;
    }
    for (const audio of this.remoteAudios.values()) {
      audio.srcObject = null;
      audio.remove();
    }
    this.remoteAudios.clear();
    this.active = false;
    this._syncUI();
    this.onStateChange({ active: false, muted: this.muted });
  }

  mount(container) {
    this._container = container;
    container.innerHTML = `
      <div class="voice-chat-panel">
        <strong class="voice-chat-title">Voice chat</strong>
        <div class="voice-chat-actions">
          <button type="button" class="voice-start-btn">Start voice</button>
          <button type="button" class="voice-mute-btn" disabled>Mute</button>
        </div>
        <span class="voice-status">Inactive</span>
      </div>
    `;
    this._startBtn = container.querySelector('.voice-start-btn');
    this._muteBtn = container.querySelector('.voice-mute-btn');
    this._statusEl = container.querySelector('.voice-status');

    this._audioContainer = document.createElement('div');
    this._audioContainer.hidden = true;
    document.body.appendChild(this._audioContainer);

    this._startBtn.addEventListener('click', async () => {
      if (this.active) {
        this.stop();
      } else {
        try {
          await this.start();
        } catch (err) {
          if (this._statusEl) this._statusEl.textContent = 'Mic access denied.';
        }
      }
    });

    this._muteBtn.addEventListener('click', () => this.setMuted(!this.muted));
    this._syncUI();
  }

  unmount() {
    this.stop();
    if (this._audioContainer) {
      this._audioContainer.remove();
      this._audioContainer = null;
    }
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
    this._startBtn = null;
    this._muteBtn = null;
    this._statusEl = null;
  }

  _syncUI() {
    if (!this._startBtn) return;
    this._startBtn.textContent = this.active ? 'Stop voice' : 'Start voice';
    this._muteBtn.disabled = !this.active;
    this._muteBtn.textContent = this.muted ? 'Unmute' : 'Mute';
    if (this._statusEl) {
      this._statusEl.textContent = !this.active ? 'Inactive' : (this.muted ? 'Muted' : 'Active');
    }
  }

  _handleRemoteTrack(event, peerId) {
    if (!event.streams?.length) return;
    let audio = this.remoteAudios.get(peerId);
    if (!audio) {
      audio = document.createElement('audio');
      audio.autoplay = true;
      (this._audioContainer || document.body).appendChild(audio);
      this.remoteAudios.set(peerId, audio);
    }
    audio.srcObject = event.streams[0];
  }
}
