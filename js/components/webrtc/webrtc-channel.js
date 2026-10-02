import { createConnectionAPI } from './peer-connection-manager.js';

export class WebRTCChannel {
  constructor({
    roomCode,
    role = 'host',
    userName = 'Player',
    identityLabel = userName,
    iceServers,
    signalingTransportFactory = null,
    onStateChange = () => {},
    onPeerConnected = () => {},
    onPeersChange = () => {},
    onMessage = () => {},
    onTrack = () => {},
    onError = () => {}
  } = {}) {
    this.listeners = new Map();

    this.connection = createConnectionAPI({
      roomCode,
      role,
      userName,
      identityLabel,
      iceServers,
      signalingTransportFactory,
      onStateChange: (state) => {
        this.emit('statechange', state);
        onStateChange(state);
      },
      onPeerConnected: (peer) => {
        this.emit('peer-connected', peer);
        onPeerConnected(peer);
      },
      onPeersChange: (peers) => {
        this.emit('peers-change', peers);
        onPeersChange(peers);
      },
      onMessage: (payload, meta) => {
        this.emit('message', payload, meta);
        onMessage(payload, meta);
      },
      onTrack: (event, peerId) => {
        this.emit('track', event, peerId);
        onTrack(event, peerId);
      },
      onError: (error) => {
        this.emit('error', error);
        onError(error);
      }
    });
  }

  on(eventName, callback) {
    if (typeof callback !== 'function') {
      return this;
    }

    const handlers = this.listeners.get(eventName) ?? [];
    handlers.push(callback);
    this.listeners.set(eventName, handlers);
    return this;
  }

  off(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      return this;
    }

    const handlers = this.listeners.get(eventName).filter((handler) => handler !== callback);
    if (handlers.length) {
      this.listeners.set(eventName, handlers);
      return this;
    }

    this.listeners.delete(eventName);
    return this;
  }

  emit(eventName, ...args) {
    const handlers = this.listeners.get(eventName) ?? [];
    for (const handler of handlers) {
      handler(...args);
    }
  }

  connect() {
    this.connection.connect();
    return this;
  }

  send(payload) {
    return this.connection.sendMessage(payload);
  }

  addLocalTrack(track, stream) {
    this.connection.addLocalTrack(track, stream);
    return this;
  }

  removeLocalTrack(track) {
    this.connection.removeLocalTrack(track);
    return this;
  }

  close() {
    this.connection?.closeConnection();
    return this;
  }

  get peerManager() {
    return this.connection;
  }

  get state() {
    return this.connection?.state ?? null;
  }
}

export function createWebRTCChannel(options = {}) {
  return new WebRTCChannel(options);
}

export default WebRTCChannel;
