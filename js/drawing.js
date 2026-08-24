export class DrawingBoard {
  constructor(peerManager, { isHost = false } = {}) {
    this.peerManager = peerManager;
    this.isHost = isHost;
    this.locked = false;
    this.onStroke = () => {};
    this.onClear = () => {};
    this.onLockChange = () => {};

    const prev = peerManager.onMessage.bind(peerManager);
    peerManager.onMessage = (payload, meta) => {
      if (payload?.type === 'draw') this._receive(payload);
      prev(payload, meta);
    };
  }

  // Host can always draw; guests are gated by the host-controlled lock flag.
  canDraw() {
    return this.isHost || !this.locked;
  }

  sendStroke(stroke) {
    if (!this.canDraw()) return;
    this.peerManager.sendMessage({ type: 'draw', op: 'stroke', stroke });
  }

  sendClear() {
    if (!this.canDraw()) return;
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
