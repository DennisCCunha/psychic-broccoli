import { listenToPeerManager } from './peer-event-listener.js';

export class TextChat {
	constructor(peerManager, { selfLabel = 'You' } = {}) {
		this.peerManager = peerManager;
		this.selfLabel = selfLabel;
		this.messages = [];
		this.onMessage = () => {};
		listenToPeerManager(peerManager, 'message', (payload) => {
			if (payload?.type === 'chat') this._receive(payload);
		});
	}

	sendMessage(text) {
		const trimmed = String(text ?? '').trim();
		if (!trimmed) return;
		const msg = { type: 'chat', from: this.selfLabel, text: trimmed, ts: Date.now() };
		this.messages.push(msg);
		this.peerManager.sendMessage(msg);
		this.onMessage(msg, { self: true });
	}

	_receive(payload) {
		this.messages.push(payload);
		this.onMessage(payload, { self: false });
	}
}

export default TextChat;
