import { listenToPeerManager } from './peer-event-listener.js';

const MESSAGE_TYPE = 'music-sync';

export class MusicSyncController {
  constructor(peerManager, { isHost = false, player, clock = () => Date.now() } = {}) {
    if (!peerManager) throw new Error('A peer manager is required.');
    if (!player) throw new Error('A music player adapter is required.');

    this.peerManager = peerManager;
    this.isHost = isHost;
    this.player = player;
    this.clock = clock;
    this.playlist = [];
    this.currentIndex = -1;
    this.playing = false;
    this.position = 0;
    this.volume = 1;
    this.updatedAt = this.clock();
    this.onStateChange = () => {};
    this.unsubscribeMessage = listenToPeerManager(peerManager, 'message', (payload) => {
      if (payload?.type === MESSAGE_TYPE) this._receive(payload);
    });
    this.unsubscribePeerConnected = listenToPeerManager(peerManager, 'peer-connected', (peer) => {
      if (this.isHost) this._sendSnapshot();
    });
  }

  getState() {
    return {
      playlist: this.playlist.map((item) => ({ ...item })),
      currentIndex: this.currentIndex,
      playing: this.playing,
      position: this._currentPosition(),
      volume: this.volume,
      updatedAt: this.updatedAt
    };
  }

  setPlaylist(playlist) {
    this._assertHost();
    this.playlist = playlist.map((item) => ({ ...item }));
    this.currentIndex = this.playlist.length ? 0 : -1;
    this.position = 0;
    this.playing = false;
    this._broadcast('playlist', { playlist: this.playlist, currentIndex: this.currentIndex });
    this._notify();
  }

  async play(index = this.currentIndex, position = this._currentPosition()) {
    this._assertHost();
    if (!this.playlist[index]) return false;

    this.currentIndex = index;
    this.position = Math.max(0, Number(position) || 0);
    this.playing = true;
    this.updatedAt = this.clock();
    await this.player.load(this.playlist[index]);
    await this.player.play(this.position);
    this._broadcast('play', { index, position: this.position, updatedAt: this.updatedAt });
    this._notify();
    return true;
  }

  async pause() {
    this._assertHost();
    this.position = this._currentPosition();
    this.playing = false;
    this.updatedAt = this.clock();
    await this.player.pause();
    this._broadcast('pause', { position: this.position, updatedAt: this.updatedAt });
    this._notify();
  }

  async seek(position) {
    this._assertHost();
    this.position = Math.max(0, Number(position) || 0);
    this.updatedAt = this.clock();
    await this.player.seek(this.position);
    this._broadcast('seek', { position: this.position, updatedAt: this.updatedAt });
    this._notify();
  }

  setVolume(volume) {
    this._assertHost();
    this.volume = Math.max(0, Math.min(1, Number(volume) || 0));
    this.player.setVolume(this.volume);
    this._broadcast('volume', { volume: this.volume });
    this._notify();
  }

  destroy() {
    this.unsubscribeMessage?.();
    this.unsubscribePeerConnected?.();
  }

  _receive(message) {
    if (message.action === 'snapshot') {
      this._applySnapshot(message.state);
      return;
    }

    if (this.isHost) return;
    if (message.action === 'playlist') {
      this.playlist = message.playlist.map((item) => ({ ...item }));
      this.currentIndex = message.currentIndex;
      this.position = 0;
      this.playing = false;
      this._notify();
      return;
    }

    if (message.action === 'play') {
      this._applyPlay(message);
    } else if (message.action === 'pause') {
      this._applyPause(message);
    } else if (message.action === 'seek') {
      this._applySeek(message);
    } else if (message.action === 'volume') {
      this.volume = message.volume;
      this.player.setVolume(this.volume);
      this._notify();
    }
  }

  _applySnapshot(state = {}) {
    this.playlist = (state.playlist ?? []).map((item) => ({ ...item }));
    this.currentIndex = state.currentIndex ?? -1;
    this.position = state.position ?? 0;
    this.playing = Boolean(state.playing);
    this.volume = state.volume ?? 1;
    this.updatedAt = state.updatedAt ?? this.clock();
    this.player.setVolume(this.volume);
    if (this.playing && this.playlist[this.currentIndex]) {
      this.player.load(this.playlist[this.currentIndex]).then(() =>
        this.player.play(this._currentPosition())
      );
    }
    this._notify();
  }

  async _applyPlay(message) {
    this.currentIndex = message.index;
    this.position = message.position ?? 0;
    this.playing = true;
    this.updatedAt = message.updatedAt ?? this.clock();
    await this.player.load(this.playlist[this.currentIndex]);
    await this.player.play(this._currentPosition());
    this._notify();
  }

  async _applyPause(message) {
    this.position = message.position ?? this._currentPosition();
    this.playing = false;
    this.updatedAt = message.updatedAt ?? this.clock();
    await this.player.pause();
    this._notify();
  }

  async _applySeek(message) {
    this.position = message.position ?? 0;
    this.updatedAt = message.updatedAt ?? this.clock();
    await this.player.seek(this.position);
    this._notify();
  }

  _sendSnapshot(peerId) {
    this.peerManager.sendMessage({
      type: MESSAGE_TYPE,
      action: 'snapshot',
      state: this.getState()
    });
  }

  _broadcast(action, payload) {
    this.peerManager.sendMessage({ type: MESSAGE_TYPE, action, ...payload });
  }

  _currentPosition() {
    if (!this.playing) return this.position;
    return this.position + (this.clock() - this.updatedAt) / 1000;
  }

  _notify() {
    this.onStateChange(this.getState());
  }

  _assertHost() {
    if (!this.isHost) throw new Error('Only the host can control shared music.');
  }
}

export default MusicSyncController;
