
import DiceRollerWrapper from '/js/dice-roller.js';
import { TurnController, Player } from '/turn-control/turnController.js';
import { createConnectionAPI } from '/js/conn.js';

function main() {
  document.addEventListener('DOMContentLoaded', async () => {
    const links = document.getElementsByTagName('nav');
    const diceRoller = await loadDiceRoller();
    const contentContainer = document.getElementById('contentContainer');
    const turnController = await loadTurnController(contentContainer);

    const connectionCodeInput = document.getElementById('connectionCodeInput');
    const identityLabelInput = document.getElementById('identityLabelInput');
    const createConnectionButton = document.getElementById('createConnectionBtn');
    const joinConnectionButton = document.getElementById('joinConnectionBtn');
    const sendTestMessageButton = document.getElementById('sendTestMessageBtn');
    const connectionStatus = document.getElementById('connectionStatus');
    const peerList = document.getElementById('peerList');

    let activeConnection = null;

    const setConnectionStatus = (status) => {
      connectionStatus.textContent = status;
    };

    const renderPeers = (peers = []) => {
      peerList.replaceChildren();

      for (const peer of peers.filter((item) => item.connected)) {
        const listItem = document.createElement('li');
        listItem.textContent = `${peer.label}${peer.peerId === activeConnection?.state.peerId ? ' (you)' : ''}`;
        peerList.appendChild(listItem);
      }

      if (!peerList.children.length) {
        const emptyItem = document.createElement('li');
        emptyItem.textContent = 'No connected peers yet.';
        peerList.appendChild(emptyItem);
      }
    };

    const ensureConnection = (role = 'host') => {
      const roomCode = connectionCodeInput.value.trim() || 'psychic-b';

      if (activeConnection) {
        activeConnection.closeConnection();
      }

      activeConnection = createConnectionAPI({
        roomCode,
        role,
        identityLabel: identityLabelInput.value.trim() || 'Player',
        onStateChange: (state) => {
          setConnectionStatus(`Code ${state.sharedCode} • ${state.connectionState}`);
        },
        onPeersChange: renderPeers,
        onPeerConnected: () => {
          setConnectionStatus(`Connected in room ${roomCode}`);
        },
        onMessage: (message) => {
          console.log('Incoming peer message:', message);
          setConnectionStatus(`Message received in room ${roomCode}`);
        },
        onError: (error) => {
          setConnectionStatus(`Connection error: ${error.message || error}`);
          console.error(error);
        }
      });

      activeConnection.connect();
      return activeConnection;
    };

    createConnectionButton.addEventListener('click', () => {
      ensureConnection('host');
    });

    joinConnectionButton.addEventListener('click', () => {
      ensureConnection('guest');
    });

    sendTestMessageButton.addEventListener('click', () => {
      if (!activeConnection) {
        setConnectionStatus('Create or join a shared connection first.');
        return;
      }

      activeConnection.sendMessage({
        type: 'status',
        event: 'turn-update',
        payload: {
          message: 'Shared WebRTC connection active.'
        }
      });

      setConnectionStatus('Test message sent.');
    });

    setConnectionStatus('Ready for a shared WebRTC room.');
    renderPeers();
  });
}

async function loadTurnController(contentContainer) {
  const response = await fetch('/turn-control/turnController.html');
  const html = await response.text();
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  contentContainer.appendChild(tempDiv.firstElementChild);
  return new TurnController();
}

async function loadDiceRoller(contentContainer) {
  const diceRoller = new DiceRollerWrapper();
  await diceRoller.init();
  diceRoller.roll('2d20');
  return diceRoller;
}

main();