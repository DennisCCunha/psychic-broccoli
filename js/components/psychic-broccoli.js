import DiceRollerWrapper from '/js/dice-roller.js';
import { RoomSession } from './room-session/index.js';
import { RoomCodeStore } from './room-code-store.js';

export class PsychicBroccoli {
  constructor() {
    this.roomCodeStore = new RoomCodeStore();
    this.session = null;
    this.activeRoomCode = null;
    this.#init();
  }

  #init() {
    document.addEventListener('DOMContentLoaded', this.onDomReady.bind(this));
  }

  async onDomReady() {
    this.contentContainer = document.getElementById('contentContainer');
    this.turncontroller = document.querySelector('turn-controller')?.controller;
    this.turnTrackerToggle = document.getElementById('turnTrackerToggle');
    this.diceRoller = await this.loadDiceRoller();

    this.connectionCodeInput = document.getElementById('connectionCodeInput');
    this.identityLabelInput = document.getElementById('identityLabelInput');
    this.createConnectionButton = document.getElementById('createConnectionBtn');
    this.joinConnectionButton = document.getElementById('joinConnectionBtn');
    this.shuffleConnectionCodeButton = document.getElementById('shuffleConnectionCodeBtn');
    this.sendTestMessageButton = document.getElementById('sendTestMessageBtn');
    
    this.closeConnectionButton = document.getElementById('closeConnectionBtn');
    this.closeConnectionButton.classList.add('hidden');

    this.connectionStatus = document.getElementById('connectionStatus');
    this.peerList = document.getElementById('peerList');
    this.voiceChatPanel = document.getElementById('voiceChatPanel');
    this.textChatPanel = document.getElementById('textChatPanel');
    this.drawingBoardPanel = document.getElementById('drawingBoardPanel');
    this.commsSidebar = document.getElementById('commsSidebar');
    this.commsToggleBtn = document.getElementById('commsToggleBtn');
    this.navRoomCode = document.getElementById('navRoomCode');

    this.connectionCodeInput.value = this.roomCodeStore.getOrCreate();
    this.navRoomCode.textContent = this.connectionCodeInput.value;

    this.connectionCodeInput.addEventListener('change', this.onRoomCodeChange.bind(this));
    this.navRoomCode.addEventListener('click', this.onNavRoomCodeClick.bind(this));
    this.commsToggleBtn.addEventListener('click', this.onCommsToggleClick.bind(this));
    this.turnTrackerToggle?.addEventListener('click', this.onTurnTrackerToggleClick.bind(this));
    this.createConnectionButton.addEventListener('click', this.onCreateRoomClick.bind(this));
    this.joinConnectionButton.addEventListener('click', this.onJoinRoomClick.bind(this));
    this.shuffleConnectionCodeButton.addEventListener('click', this.onShuffleConnectionCodeClick.bind(this));
    this.sendTestMessageButton.addEventListener('click', this.onSendTestMessageClick.bind(this));
    this.closeConnectionButton.addEventListener('click', this.onCloseConnectionClick.bind(this));

    this.setStatus('Ready for a shared WebRTC room.');
    this.setTurnTrackerEnabled(false);
    this.renderPeers();
  }

  setTurnTrackerEnabled(enabled) {
    this.turncontroller?.setEnabled(enabled);
    this.turnTrackerToggle?.setAttribute('aria-pressed', String(enabled));
  }

  onTurnTrackerToggleClick() {
    this.setTurnTrackerEnabled(!this.turncontroller?.enabled);
  }

  onRoomCodeChange() {
    const code = this.connectionCodeInput.value.trim() || this.roomCodeStore.getOrCreate();
    this.connectionCodeInput.value = code;
    this.roomCodeStore.write(code);
    this.navRoomCode.textContent = code;
  }

  onNavRoomCodeClick() {
    navigator.clipboard?.writeText(this.navRoomCode.textContent);
    this.setStatus(`Room code ${this.navRoomCode.textContent} copied to clipboard.`);
  }

  onCommsToggleClick() {
    const collapsed = this.commsSidebar.classList.toggle('comms-sidebar--collapsed');
    this.commsToggleBtn.setAttribute('aria-expanded', String(!collapsed));
  }

  onShuffleConnectionCodeClick() {
    const newCode = this.roomCodeStore.generate();
    this.connectionCodeInput.value = newCode;
    this.roomCodeStore.write(newCode);
    this.navRoomCode.textContent = newCode;
  }

  onCreateRoomClick() {
    this.startSession('host');
    this.closeConnectionButton.classList.remove('hidden');
  }

  onJoinRoomClick() {
    this.startSession('guest');
    this.closeConnectionButton.classList.remove('hidden');
  }

  onSendTestMessageClick() {
    if (!this.session?.connection) {
      this.setStatus('Create or join a shared connection first.');
      return;
    }
    this.session.sendMessage({
      type: 'status',
      event: 'turn-update',
      payload: { message: 'Shared WebRTC connection active.' }
    });
    this.setStatus('Test message sent.');
  }

  onCloseConnectionClick() {
    if (!this.session) {
      this.setStatus('No active connection to close.');
      return;
    }
    this.session.close();
    this.session = null;
    this.renderPeers();
    this.setStatus('Connection closed.');
    this.closeConnectionButton.classList.add('hidden');
  }

  setStatus(text) {
    this.connectionStatus.textContent = text;
  }

  renderPeers(peers = []) {
    this.peerList.replaceChildren();
    for (const peer of peers.filter((p) => p.connected)) {
      const li = document.createElement('li');
      li.textContent = `${peer.label}${peer.peerId === this.session?.connection?.state.peerId ? ' (you)' : ''}`;
      this.peerList.appendChild(li);
    }
    if (!this.peerList.children.length) {
      const li = document.createElement('li');
      li.textContent = 'No connected peers yet.';
      this.peerList.appendChild(li);
    }
  }

  startSession(role) {
    const roomCode = this.connectionCodeInput.value.trim() || 'psychic-b';
    const identityLabel = this.identityLabelInput.value.trim() || 'Player';
    this.activeRoomCode = roomCode;

    this.session?.close();
    this.session = new RoomSession({
      voiceChatPanel: this.voiceChatPanel,
      textChatPanel: this.textChatPanel,
      drawingBoardPanel: this.drawingBoardPanel,
      onStateChange: this.onSessionStateChange.bind(this),
      onPeersChange: this.renderPeers.bind(this),
      onPeerConnected: this.onSessionPeerConnected.bind(this),
      onMessage: this.onSessionMessage.bind(this),
      onError: this.onSessionError.bind(this)
    });
    this.session.start(role, roomCode, identityLabel);
  }

  onSessionStateChange(state) {
    this.setStatus(`Code ${state.sharedCode} • ${state.connectionState}`);
  }

  onSessionPeerConnected() {
    this.setStatus(`Connected in room ${this.activeRoomCode}`);
  }

  onSessionMessage(message) {
    console.log('Incoming peer message:', message);
    this.setStatus(`Message received in room ${this.activeRoomCode}`);
  }

  onSessionError(error) {
    this.setStatus(`Connection error: ${error.message || error}`);
    console.error(error);
  }

  async loadDiceRoller() {
    const diceRoller = new DiceRollerWrapper();
    await diceRoller.init();
    return diceRoller;
  }
}

export default PsychicBroccoli;
