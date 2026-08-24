import { TextChat } from '/js/text-chat.js';

export class TextChatUI {
  constructor(textChat) {
    this._chat = textChat;
    this._container = null;
    this._listEl = null;
    this._inputEl = null;

    textChat.onMessage = (msg) => this._appendMessage(msg);
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

    for (const msg of this._chat.messages) this._appendMessage(msg);
  }

  unmount() {
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
      this._listEl = null;
      this._inputEl = null;
    }
  }

  _submit() {
    const text = this._inputEl?.value ?? '';
    if (!text.trim()) return;
    this._chat.sendMessage(text);
    this._inputEl.value = '';
  }

  _appendMessage(msg) {
    if (!this._listEl) return;
    const isSelf = msg.from === this._chat.selfLabel;
    const div = document.createElement('div');
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
