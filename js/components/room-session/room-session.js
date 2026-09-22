import {
  createConnectionAPI,
  DrawingBoard,
  DrawingBoardUI,
  MqttSignalingChannel,
  TextChat,
  TextChatUI,
  VoiceChat,
  VoiceChatUI
} from '/js/components/webrtc/index.js';

export class RoomSession {
  constructor({ voiceChatPanel, textChatPanel, drawingBoardPanel, onStateChange, onPeersChange, onPeerConnected, onMessage, onError } = {}) {
    this.voiceChatPanel = voiceChatPanel;
    this.textChatPanel = textChatPanel;
    this.drawingBoardPanel = drawingBoardPanel;
    this.onStateChange = onStateChange ?? (() => {});
    this.onPeersChange = onPeersChange ?? (() => {});
    this.onPeerConnected = onPeerConnected ?? (() => {});
    this.onMessage = onMessage ?? (() => {});
    this.onError = onError ?? (() => {});
    this.connection = null;
    this._voiceChat = null;
    this._voiceChatUI = null;
    this._textChat = null;
    this._textChatUI = null;
    this._drawingBoard = null;
    this._drawingBoardUI = null;
  }

  start(role, roomCode, identityLabel) {
    this._teardown();

    this.connection = createConnectionAPI({
      roomCode,
      role,
      identityLabel,
      signalingTransportFactory: (channelName, peerId) =>
        new MqttSignalingChannel(channelName, peerId),
      onStateChange: this.onStateChange,
      onPeersChange: this.onPeersChange,
      onPeerConnected: this.onPeerConnected,
      onMessage: this.onMessage,
      onError: this.onError
    });

    this._textChat = new TextChat(this.connection, { selfLabel: identityLabel });
    this._textChatUI = new TextChatUI(this._textChat);
    this._textChatUI.mount(this.textChatPanel);

    this._voiceChat = new VoiceChat(this.connection);
    this._voiceChatUI = new VoiceChatUI(this._voiceChat, this.connection);
    this._voiceChatUI.mount(this.voiceChatPanel);

    if (this.drawingBoardPanel) {
      this._drawingBoard = new DrawingBoard(this.connection, { isHost: role === 'host' });
      this._drawingBoardUI = new DrawingBoardUI(this._drawingBoard);
      this._drawingBoardUI.mount(this.drawingBoardPanel);
    }

    this.connection.connect();
  }

  sendMessage(message) {
    this.connection?.sendMessage(message);
  }

  close() {
    this._teardown();
  }

  _teardown() {
    this._voiceChatUI?.unmount();
    this._voiceChatUI = null;
    this._voiceChat = null;
    this._textChatUI?.unmount();
    this._textChatUI = null;
    this._textChat = null;
    this._drawingBoardUI?.unmount();
    this._drawingBoardUI = null;
    this._drawingBoard = null;
    this.connection?.closeConnection();
    this.connection = null;
  }
}

export default RoomSession;
