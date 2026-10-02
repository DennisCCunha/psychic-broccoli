const ROOM_CODE_STORAGE_KEY = 'psychic-b-room-code';

export class RoomCodeStore {
  read() {
    return localStorage.getItem(ROOM_CODE_STORAGE_KEY);
  }

  write(code) {
    localStorage.setItem(ROOM_CODE_STORAGE_KEY, code);
  }

  generate() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  getOrCreate() {
    const saved = this.read();
    if (saved) return saved;
    const code = this.generate();
    this.write(code);
    return code;
  }
}

export default RoomCodeStore;
