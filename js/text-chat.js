export class TextChat {
  constructor(peerManager, { selfLabel = 'You' } = {}) {
    this.peerManager = peerManager;
    this.selfLabel = selfLabel;
    this.messages = [];
    this._container = null;
    this._listEl = null;
    this._inputEl = null;

    const prev = peerManager.onMessage.bind(peerManager);
    peerManager.onMessage = (payload, meta) => {
      if (payload?.type === 'chat') this._receiveMessage(payload);
      prev(payload, meta);
    };
  }

  mount(container) {
    this._container = container;
    container.innerHTML = `
      <div class="text-chat-panel">
        <strong class="text-chat-title">Text chat</strong>
        <div class="text-chat-messages"></div>
        <div class="text-chat-input-row">
          <input type="text" class="text-chat-input" placeholder="Type a message…" maxlength="500" />
          <button type="button" class="text-chat-send-btn">Send</button>
        </div>
      </div>
    `;
    this._listEl = container.querySelector('.text-chat-messages');
    this._inputEl = container.querySelector('.text-chat-input');
    const sendBtn = container.querySelector('.text-chat-send-btn');

    sendBtn.addEventListener('click', () => this._submit());
    this._inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._submit();
    });

    for (const msg of this.messages) this._appendMessage(msg);
  }

  unmount() {
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
      this._listEl = null;
      this._inputEl = null;
    }
  }

  sendMessage(text) {
    const trimmed = String(text ?? '').trim();
    if (!trimmed) return;
    const msg = { type: 'chat', from: this.selfLabel, text: trimmed, ts: Date.now() };
    this.messages.push(msg);
    this._appendMessage(msg);
    this.peerManager.sendMessage(msg);
  }

  _submit() {
    const text = this._inputEl?.value ?? '';
    if (!text.trim()) return;
    this.sendMessage(text);
    this._inputEl.value = '';
  }

  _receiveMessage(payload) {
    this.messages.push(payload);
    this._appendMessage(payload);
  }

  _appendMessage(msg) {
    if (!this._listEl) return;
    const div = document.createElement('div');
    const isSelf = msg.from === this.selfLabel;
    div.className = `text-chat-msg ${isSelf ? 'text-chat-msg--self' : 'text-chat-msg--peer'}`;
    div.innerHTML = `<span class="text-chat-sender">${this._esc(msg.from)}</span><span class="text-chat-text">${this._esc(msg.text)}</span>`;
    this._listEl.appendChild(div);
    this._listEl.scrollTop = this._listEl.scrollHeight;
  }

  _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
