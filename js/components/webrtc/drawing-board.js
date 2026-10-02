import { listenToPeerManager } from './peer-event-listener.js';

export class DrawingBoard {
	constructor(peerManager, { isHost = false } = {}) {
		this.peerManager = peerManager;
		this.isHost = isHost;
		this.locked = false;
		this.onStroke = () => {};
		this.onClear = () => {};
		this.onLockChange = () => {};
		listenToPeerManager(peerManager, 'message', (payload) => {
			if (payload?.type === 'draw') this._receive(payload);
		});
	}

	canDraw() { return this.isHost || !this.locked; }

	sendStroke(stroke) {
		if (this.canDraw()) this.peerManager.sendMessage({ type: 'draw', op: 'stroke', stroke });
	}

	sendClear() {
		if (!this.isHost) return;
		this.onClear();
		this.peerManager.sendMessage({ type: 'draw', op: 'clear' });
	}

	setLocked(locked) {
		if (!this.isHost) return;
		this.locked = locked;
		this.peerManager.sendMessage({ type: 'draw', op: 'lock', locked });
		this.onLockChange(this.locked);
	}

	_receive(payload) {
		if (payload.op === 'stroke') this.onStroke(payload.stroke);
		else if (payload.op === 'clear') this.onClear();
		else if (payload.op === 'lock') {
			this.locked = Boolean(payload.locked);
			this.onLockChange(this.locked);
		}
	}
}

export default DrawingBoard;
