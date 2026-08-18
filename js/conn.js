import crypto from 'https://cdn.jsdelivr.net/npm/crypto-js@4.2.0/+esm'
import bcrypt from 'https://cdn.jsdelivr.net/npm/bcryptjs@3.0.3/+esm'


const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];


function createPeerId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `peer-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseSignalPayload(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

export function createConnectionAPI({
  roomCode,
  role = 'host',
  userName = 'Player',
  iceServers = DEFAULT_ICE_SERVERS,
  onStateChange = () => {},
  onPeerConnected = () => {},
  onMessage = () => {},
  onError = () => {}
} = {}) {
  if (!roomCode || !String(roomCode).trim()) {
    throw new Error('A shared room code is required to create a WebRTC connection.');
  }

  const sharedCode = String(roomCode).trim();
  const signalChannelName = `psychic-b-${sharedCode}`;
  const peerId = createPeerId();
  const signalChannel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel(signalChannelName)
    : null;

  const state = {
    role,
    sharedCode,
    userName,
    peerId,
    connectionState: 'new',
    connected: false,
    peerConnection: null,
    dataChannel: null,
    remotePeerId: null,
    pendingMessages: []
  };

  function updateState(nextState) {
    Object.assign(state, nextState);
    onStateChange({ ...state });
  }

  function toCloneableDescription(description) {
    if (!description) {
      return null;
    }

    return {
      type: description.type,
      sdp: description.sdp
    };
  }

  function toCloneableCandidate(candidate) {
    if (!candidate) {
      return null;
    }

    return {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
      usernameFragment: candidate.usernameFragment
    };
  }

  function sendSignal(type, payload = {}) {
    const message = {
      type,
      roomCode: sharedCode,
      from: peerId,
      payload
    };

    if (signalChannel) {
      signalChannel.postMessage(message);
      return;
    }

    const storageKey = `${signalChannelName}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(storageKey, JSON.stringify(message));
  }

  function flushPendingMessages() {
    if (!state.dataChannel || state.dataChannel.readyState !== 'open') {
      return;
    }

    while (state.pendingMessages.length) {
      const nextMessage = state.pendingMessages.shift();
      state.dataChannel.send(nextMessage);
    }
  }

  function handleIncomingData(event) {
    const payload = typeof event.data === 'string' ? parseSignalPayload(event.data) : event.data;
    onMessage(payload, { sharedCode, peerId: state.remotePeerId });
  }

  function attachDataChannel(channel) {
    state.dataChannel = channel;

    channel.onopen = () => {
      updateState({
        connectionState: 'connected',
        connected: true
      });
      flushPendingMessages();
      onPeerConnected({ sharedCode, peerId: state.remotePeerId, userName });
    };

    channel.onclose = () => {
      updateState({
        connectionState: 'closed',
        connected: false
      });
    };

    channel.onerror = (error) => {
      onError(error);
    };

    channel.onmessage = handleIncomingData;
  }

  function ensurePeerConnection() {
    if (state.peerConnection) {
      return state.peerConnection;
    }

    const peerConnection = new RTCPeerConnection({ iceServers });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('ice-candidate', {
          candidate: toCloneableCandidate(event.candidate)
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      updateState({
        connectionState: peerConnection.connectionState,
        connected: peerConnection.connectionState === 'connected'
      });

      if (peerConnection.connectionState === 'connected') {
        onPeerConnected({ sharedCode, peerId: state.remotePeerId, userName });
      }
    };

    peerConnection.ondatachannel = (event) => {
      attachDataChannel(event.channel);
    };

    state.peerConnection = peerConnection;
    return peerConnection;
  }

  async function handleSignal(message) {
    if (!message || message.roomCode !== sharedCode || message.from === peerId) {
      return;
    }

    const peerConnection = ensurePeerConnection();
    state.remotePeerId = message.from;

    try {
      if (message.type === 'offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.payload.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        sendSignal('answer', {
          answer: toCloneableDescription(peerConnection.localDescription)
        });
      }

      if (message.type === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.payload.answer));
      }

      if (message.type === 'ice-candidate') {
        if (message.payload.candidate) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(message.payload.candidate));
        }
      }
    } catch (error) {
      onError(error);
    }
  }

  async function connect() {
    try {
      const peerConnection = ensurePeerConnection();

      if (state.role === 'host' && !state.dataChannel) {
        const dataChannel = peerConnection.createDataChannel(`psychic-b-${sharedCode}`);
        attachDataChannel(dataChannel);
      }

      if (state.role === 'host') {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        sendSignal('offer', {
          offer: toCloneableDescription(peerConnection.localDescription)
        });
      }

      updateState({
        connectionState: state.role === 'host' ? 'connecting' : 'waiting',
        connected: false
      });
    } catch (error) {
      onError(error);
    }
  }

  function sendMessage(message) {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);

    if (state.dataChannel && state.dataChannel.readyState === 'open') {
      state.dataChannel.send(payload);
      return true;
    }

    state.pendingMessages.push(payload);
    return false;
  }

  function closeConnection() {
    if (state.dataChannel) {
      state.dataChannel.close();
    }

    if (state.peerConnection) {
      state.peerConnection.close();
    }

    updateState({
      connectionState: 'closed',
      connected: false,
      peerConnection: null,
      dataChannel: null
    });
  }

  if (signalChannel) {
    signalChannel.onmessage = (event) => {
      handleSignal(event.data);
    };
  }

  if (typeof window !== 'undefined' && 'addEventListener' in window) {
    const storageListener = (event) => {
      if (!event.key || !event.key.startsWith(signalChannelName) || !event.newValue) {
        return;
      }

      const message = parseSignalPayload(event.newValue);
      handleSignal(message);
    };

    window.addEventListener('storage', storageListener);
    state.cleanup = () => window.removeEventListener('storage', storageListener);
  }

  return {
    connect,
    sendMessage,
    closeConnection,
    state,
    sharedCode,
    get peerConnection() {
      return state.peerConnection;
    },
    get dataChannel() {
      return state.dataChannel;
    }
  };
}

export const createPeerConnectionApi = createConnectionAPI;
