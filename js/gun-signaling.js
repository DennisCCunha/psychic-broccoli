// Requires Gun to be loaded first as a global (see index.html)
const PUBLIC_RELAYS = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://peer.wallie.io/gun',
  'https://gun.eco/gun'
];

export class GunSignalingChannel {
  constructor(channelName, peerId, relays = PUBLIC_RELAYS) {
    if (!window.Gun) throw new Error('Gun.js not loaded — add the script tag to index.html.');
    this.gun = new window.Gun(relays);
    const safe = channelName.replace(/[^a-zA-Z0-9_-]/g, '_');
    this.room = this.gun.get(`psychic_b_${safe}`);
    this.peerId = peerId;
    this.onmessage = null;
    this._seen = new Set();
    // Ignore signals created before this peer joined (minus small clock-skew buffer)
    this._minTs = Date.now() - 4000;
  }

  listen() {
    this.room.get(`to_${this.peerId}`).map().on((data, key) => this._receive(data, key));
    this.room.get('broadcast').map().on((data, key) => this._receive(data, key));
  }

  postMessage(message) {
    const key = `${this.peerId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const path = message.to ? `to_${message.to}` : 'broadcast';
    this.room.get(path).get(key).put({ ...message, _ts: Date.now() });
  }

  close() {
    this.room.get(`to_${this.peerId}`).off();
    this.room.get('broadcast').off();
    this._seen.clear();
  }

  _receive(data, key) {
    if (!data || !this.onmessage) return;
    if (this._seen.has(key)) return;
    if (typeof data._ts === 'number' && data._ts < this._minTs) return;
    this._seen.add(key);
    // Strip Gun internal metadata
    const { _, _ts, ...message } = data;
    if (!message.type) return;
    this.onmessage({ data: message });
  }
}
