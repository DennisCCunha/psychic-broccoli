export class VoiceChatUI {
  constructor(voiceChat, peerManager) {
    this._voice = voiceChat;
    this._peerManager = peerManager;
    this._container = null;
    this._peerListEl = null;

    voiceChat.onStateChange = (state) => this._syncControls(state);
    voiceChat.onPeerActivity = ({ peerId, speaking }) => this._updateSpeaking(peerId, speaking);
    peerManager.onPeersChange = (peers) => this._renderPeers(peers);
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
        <ul class="voice-peer-list"></ul>
      </div>
    `;
    this._startBtn = container.querySelector('.voice-start-btn');
    this._muteBtn = container.querySelector('.voice-mute-btn');
    this._statusEl = container.querySelector('.voice-status');
    this._peerListEl = container.querySelector('.voice-peer-list');

    this._startBtn.addEventListener('click', async () => {
      if (this._voice.active) {
        this._voice.stop();
      } else {
        try {
          await this._voice.start();
        } catch {
          if (this._statusEl) this._statusEl.textContent = 'Mic access denied.';
        }
      }
    });

    this._muteBtn.addEventListener('click', () => this._voice.setMuted(!this._voice.muted));
    this._syncControls({ active: this._voice.active, muted: this._voice.muted });
  }

  unmount() {
    this._voice.stop();
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
    this._startBtn = null;
    this._muteBtn = null;
    this._statusEl = null;
    this._peerListEl = null;
  }

  _syncControls({ active, muted }) {
    if (!this._startBtn) return;
    this._startBtn.textContent = active ? 'Stop voice' : 'Start voice';
    this._muteBtn.disabled = !active;
    this._muteBtn.textContent = muted ? 'Unmute' : 'Mute';
    if (this._statusEl) {
      this._statusEl.textContent = !active ? 'Inactive' : (muted ? 'Muted' : 'Active');
    }
  }

  _renderPeers(peers) {
    if (!this._peerListEl) return;
    this._peerListEl.replaceChildren();
    for (const peer of peers.filter((p) => p.connected)) {
      const li = this._makePeerRow(peer);
      this._peerListEl.appendChild(li);
    }
  }

  _makePeerRow(peer) {
    const li = document.createElement('li');
    li.className = 'voice-peer-row';
    li.dataset.peerId = peer.peerId;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'voice-peer-name';
    nameSpan.textContent = peer.label;

    const indicator = document.createElement('span');
    indicator.className = 'voice-speaking-indicator';
    indicator.title = 'Speaking';

    const muteLabel = document.createElement('label');
    muteLabel.className = 'voice-peer-mute-label';
    muteLabel.textContent = 'Mute';

    const muteCheckbox = document.createElement('input');
    muteCheckbox.type = 'checkbox';
    muteCheckbox.className = 'voice-peer-mute';

    const volumeLabel = document.createElement('label');
    volumeLabel.className = 'voice-peer-volume-label';
    volumeLabel.textContent = 'Vol';

    const volumeInput = document.createElement('input');
    volumeInput.type = 'range';
    volumeInput.min = '0';
    volumeInput.max = '2';
    volumeInput.step = '0.05';
    volumeInput.value = '1';
    volumeInput.className = 'voice-peer-volume';
    volumeInput.addEventListener('input', () => {
      this._voice.setPeerVolume(peer.peerId, Number(volumeInput.value));
    });

    volumeLabel.appendChild(volumeInput);
    li.append(indicator, nameSpan, volumeLabel);
    return li;
  }

  _updateSpeaking(peerId, speaking) {
    const selector = peerId === 'local'
      ? '.voice-speaking-local'
      : `.voice-peer-row[data-peer-id="${CSS.escape(peerId)}"] .voice-speaking-indicator`;
    const el = this._container?.querySelector(selector);
    if (el) el.classList.toggle('voice-speaking-indicator--active', speaking);
  }
}
