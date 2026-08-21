import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getDatabase, ref, push, onChildAdded,
  query, orderByChild, startAfter, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';

export class FirebaseSignalingChannel {
  constructor(config, channelName, peerId) {
    const appName = channelName;
    const app = getApps().find((a) => a.name === appName)
      ?? initializeApp(config, appName);
    this.db = getDatabase(app);
    // Firebase paths can't contain . # $ [ ] /
    const safeName = channelName.replace(/[.#$[\]/]/g, '_');
    this.base = `psychic_b_signals/${safeName}`;
    this.peerId = peerId;
    this.onmessage = null;
    this._unsubs = [];
    // Only process signals sent after this instance was created
    this._startTs = Date.now() - 5000;
  }

  listen() {
    this._subscribe(`${this.base}/to/${this.peerId}`);
    this._subscribe(`${this.base}/broadcast`);
  }

  _subscribe(path) {
    const q = query(ref(this.db, path), orderByChild('_ts'), startAfter(this._startTs));
    const unsub = onChildAdded(q, (snapshot) => {
      const raw = snapshot.val();
      if (!raw || !this.onmessage) return;
      const { _ts, ...message } = raw;
      this.onmessage({ data: message });
    });
    this._unsubs.push(unsub);
  }

  postMessage(message) {
    const path = message.to
      ? `${this.base}/to/${message.to}`
      : `${this.base}/broadcast`;
    push(ref(this.db, path), { ...message, _ts: serverTimestamp() });
  }

  close() {
    this._unsubs.forEach((u) => u());
    this._unsubs = [];
  }
}
