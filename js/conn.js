const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];



export class PeerConnectionManager {
  constructor({
    roomCode,
    role = 'host',
    userName = 'Player',
    identityLabel = userName,
    iceServers = DEFAULT_ICE_SERVERS,
    onStateChange = () => {},
    onPeerConnected = () => {},
    onPeersChange = () => {},
    onMessage = () => {},
    onTrack = () => {},
    onError = () => {}
  } = {}) {
    if (!roomCode || !String(roomCode).trim()) {
      throw new Error('A shared room code is required to create a WebRTC connection.');
    }

    this.role = role;
    this.sharedCode = String(roomCode).trim();
    this.identityLabel = String(identityLabel || userName || 'Player').trim() || 'Player';
    this.iceServers = iceServers;
    this.peerId = this.createPeerId();
    this.onStateChange = onStateChange;
    this.onPeerConnected = onPeerConnected;
    this.onPeersChange = onPeersChange;
    this.onMessage = onMessage;
    this.onTrack = onTrack;
    this.onError = onError;
    this.localTracks = [];
    this.connections = new Map();
    this.peers = new Map([[this.peerId, this.createPeer(this.peerId, this.identityLabel, true)]]);
    this.pendingMessages = [];
    this.signalChannelName = `psychic-b-${this.sharedCode}`;
    this.signalChannel = typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel(this.signalChannelName)
      : null;
    this.state = {
      role: this.role,
      sharedCode: this.sharedCode,
      userName: this.identityLabel,
      identityLabel: this.identityLabel,
      peerId: this.peerId,
      connectionState: 'new',
      connected: false,
      peers: this.getPeers(),
      peerConnection: null,
      dataChannel: null,
      remotePeerId: null,
      pendingMessages: this.pendingMessages
    };

    if (this.signalChannel) {
      this.signalChannel.onmessage = (event) => this.handleSignal(event.data);
    }

    if (typeof window !== 'undefined' && 'addEventListener' in window) {
      this.storageListener = (event) => {
        if (!event.key || !event.key.startsWith(this.signalChannelName) || !event.newValue) {
          return;
        }

        this.handleSignal(this.parseSignalPayload(event.newValue));
      };
      window.addEventListener('storage', this.storageListener);
    }
  }

  createPeerId() {
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.randomUUID) {
      return globalThis.crypto.randomUUID();
    }

    return `peer-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  parseSignalPayload(value) {
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  }

  createPeer(peerId, label, connected = false) {
    return {
      peerId,
      label,
      connected,
      connectionState: connected ? 'connected' : 'new'
    };
  }

  getPeers() {
    return [...this.peers.values()].map((peer) => ({ ...peer }));
  }

  updateState(nextState = {}) {
    Object.assign(this.state, nextState, { peers: this.getPeers() });
    this.onStateChange({ ...this.state, peers: this.getPeers() });
    this.onPeersChange(this.getPeers());
  }

  updatePeer(peerId, nextState = {}) {
    const current = this.peers.get(peerId) || this.createPeer(peerId, 'Player');
    this.peers.set(peerId, { ...current, ...nextState });
    this.updateState();
  }

  sendSignal(type, payload = {}, to = null) {
    const message = {
      type,
      roomCode: this.sharedCode,
      from: this.peerId,
      to,
      payload
    };

    if (this.signalChannel) {
      this.signalChannel.postMessage(message);
      return;
    }

    const storageKey = `${this.signalChannelName}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(storageKey, JSON.stringify(message));
  }

  toCloneableDescription(description) {
    return description ? { type: description.type, sdp: description.sdp } : null;
  }

  toCloneableCandidate(candidate) {
    return candidate ? {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
      usernameFragment: candidate.usernameFragment
    } : null;
  }

  getConnection(peerId) {
    return this.connections.get(peerId)?.peerConnection || null;
  }

  createConnection(peerId, label = 'Player') {
    const existing = this.connections.get(peerId);
    if (existing) {
      return existing.peerConnection;
    }

    const peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });
    const connection = {
      peerConnection,
      dataChannel: null,
      pendingIceCandidates: [],
      label
    };
    this.connections.set(peerId, connection);
    this.peers.set(peerId, this.createPeer(peerId, label));

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal('ice-candidate', {
          candidate: this.toCloneableCandidate(event.candidate)
        }, peerId);
      }
    };

    peerConnection.onconnectionstatechange = () => {
      const connected = peerConnection.connectionState === 'connected';
      this.updatePeer(peerId, {
        connected,
        connectionState: peerConnection.connectionState
      });
      this.updateState({
        connectionState: this.role === 'host' ? (connected ? 'connected' : peerConnection.connectionState) : peerConnection.connectionState,
        connected: this.hasConnectedPeer()
      });

      if (connected) {
        this.onPeerConnected({
          sharedCode: this.sharedCode,
          peerId,
          userName: this.peers.get(peerId)?.label
        });
        this.sendRoster();
      }
    };

    peerConnection.ondatachannel = (event) => {
      this.attachDataChannel(peerId, event.channel);
    };

    peerConnection.ontrack = (event) => this.onTrack(event, peerId);

    peerConnection.onnegotiationneeded = async () => {
      if (this.role === 'host' && peerConnection.connectionState === 'connected') {
        try {
          await this.sendOffer(peerId);
        } catch (err) {
          this.onError(err);
        }
      }
    };

    for (const { track, stream } of this.localTracks) {
      peerConnection.addTrack(track, stream);
    }

    return peerConnection;
  }

  addLocalTrack(track, stream) {
    this.localTracks.push({ track, stream });
    for (const connection of this.connections.values()) {
      connection.peerConnection.addTrack(track, stream);
    }
  }

  removeLocalTrack(track) {
    this.localTracks = this.localTracks.filter((t) => t.track !== track);
    for (const connection of this.connections.values()) {
      const sender = connection.peerConnection.getSenders().find((s) => s.track === track);
      if (sender) connection.peerConnection.removeTrack(sender);
    }
  }

  hasConnectedPeer() {
    return [...this.peers.values()].some((peer) => peer.peerId !== this.peerId && peer.connected);
  }

  attachDataChannel(peerId, channel) {
    const connection = this.connections.get(peerId);
    if (!connection || !channel) {
      return;
    }

    connection.dataChannel = channel;
    this.state.dataChannel = channel;
    this.state.remotePeerId = peerId;

    channel.onopen = () => {
      this.updatePeer(peerId, { connected: true, connectionState: 'connected' });
      this.updateState({
        connectionState: 'connected',
        connected: this.hasConnectedPeer(),
        dataChannel: channel,
        peerConnection: connection.peerConnection,
        remotePeerId: peerId
      });
      this.sendSignal('identity', { label: this.identityLabel }, peerId);
      this.flushPendingMessages();
      this.sendRoster();
      this.onPeerConnected({
        sharedCode: this.sharedCode,
        peerId,
        userName: this.peers.get(peerId)?.label
      });
    };

    channel.onclose = () => {
      this.updatePeer(peerId, { connected: false, connectionState: 'closed' });
      this.updateState({ connected: this.hasConnectedPeer(), connectionState: 'closed' });
      this.sendRoster();
    };

    channel.onerror = (error) => this.onError(error);
    channel.onmessage = (event) => this.handleData(peerId, event);
  }

  handleData(peerId, event) {
    const payload = typeof event.data === 'string' ? parseSignalPayload(event.data) : event.data;

    if (payload?.type === 'roster') {
      this.applyRoster(payload.peers);
      return;
    }

    if (payload?.type === 'identity') {
      this.updatePeer(peerId, { label: payload.label || 'Player' });
      this.sendRoster();
      return;
    }

    if (this.role === 'host') {
      this.broadcastData(payload, peerId);
    }

    this.onMessage(payload, { sharedCode: this.sharedCode, peerId });
  }

  applyRoster(roster = []) {
    for (const peer of roster) {
      if (peer.peerId !== this.peerId) {
        this.peers.set(peer.peerId, { ...peer });
      }
    }
    this.updateState();
  }

  broadcastData(payload, exceptPeerId = null) {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    for (const [peerId, connection] of this.connections) {
      if (peerId !== exceptPeerId && connection.dataChannel?.readyState === 'open') {
        connection.dataChannel.send(serialized);
      }
    }
  }

  sendRoster() {
    this.broadcastData({ type: 'roster', peers: this.getPeers() });
  }

  async sendOffer(peerId) {
    const peerConnection = this.getConnection(peerId);
    if (!peerConnection) {
      return;
    }

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    this.sendSignal('offer', {
      offer: this.toCloneableDescription(peerConnection.localDescription)
    }, peerId);
  }

  async flushPendingIceCandidates(peerId) {
    const connection = this.connections.get(peerId);
    if (!connection) {
      return;
    }

    while (connection.pendingIceCandidates.length) {
      await connection.peerConnection.addIceCandidate(connection.pendingIceCandidates.shift());
    }
  }

  async handleSignal(message) {
    if (!message || message.roomCode !== this.sharedCode || message.from === this.peerId) {
      return;
    }
    if (message.to && message.to !== this.peerId) {
      return;
    }

    try {
      if (message.type === 'ready' && this.role === 'host') {
        const label = message.payload?.label || 'Player';
        this.updatePeer(message.from, { label });
        const peerConnection = this.createConnection(message.from, label);
        const dataChannel = peerConnection.createDataChannel(`psychic-b-${this.sharedCode}`);
        this.attachDataChannel(message.from, dataChannel);
        await this.sendOffer(message.from);
        return;
      }

      if (message.type === 'offer' && this.role !== 'host') {
        const peerConnection = this.createConnection(message.from, 'Host');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.payload.offer));
        await this.flushPendingIceCandidates(message.from);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        this.sendSignal('answer', {
          answer: this.toCloneableDescription(peerConnection.localDescription)
        }, message.from);
        this.updateState({ connectionState: 'connecting', peerConnection });
        return;
      }

      if (message.type === 'answer') {
        const peerConnection = this.getConnection(message.from);
        if (!peerConnection) {
          return;
        }
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.payload.answer));
        await this.flushPendingIceCandidates(message.from);
        return;
      }

      if (message.type === 'ice-candidate' && message.payload.candidate) {
        const peerConnection = this.getConnection(message.from);
        if (!peerConnection) {
          return;
        }
        const candidate = new RTCIceCandidate(message.payload.candidate);
        const connection = this.connections.get(message.from);
        if (peerConnection.remoteDescription) {
          await peerConnection.addIceCandidate(candidate);
        } else {
          connection.pendingIceCandidates.push(candidate);
        }
      }
    } catch (error) {
      this.onError(error);
    }
  }

  connect() {
    if (this.role === 'host') {
      this.updateState({ connectionState: 'waiting', connected: false });
      return;
    }

    this.sendSignal('ready', { label: this.identityLabel });
    this.updateState({ connectionState: 'waiting', connected: false });
  }

  flushPendingMessages() {
    if (!this.state.dataChannel || this.state.dataChannel.readyState !== 'open') {
      return;
    }

    while (this.pendingMessages.length) {
      this.state.dataChannel.send(this.pendingMessages.shift());
    }
  }

  sendMessage(message) {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);

    if (this.role === 'host') {
      this.broadcastData(payload);
      return this.hasConnectedPeer();
    }

    const connection = [...this.connections.values()][0];
    if (connection?.dataChannel?.readyState === 'open') {
      connection.dataChannel.send(payload);
      return true;
    }

    this.pendingMessages.push(payload);
    return false;
  }

  closeConnection() {
    for (const connection of this.connections.values()) {
      connection.dataChannel?.close();
      connection.peerConnection.close();
    }
    this.connections.clear();
    this.peers = new Map([[this.peerId, this.createPeer(this.peerId, this.identityLabel, true)]]);
    this.signalChannel?.close();
    if (this.storageListener && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageListener);
    }
    this.updateState({
      connectionState: 'closed',
      connected: false,
      peerConnection: null,
      dataChannel: null,
      remotePeerId: null
    });
  }

  get peerConnection() {
    return this.state.peerConnection;
  }

  get dataChannel() {
    return this.state.dataChannel;
  }
}

export function createConnectionAPI(options) {
  return new PeerConnectionManager(options);
}

export const createPeerConnectionApi = createConnectionAPI;