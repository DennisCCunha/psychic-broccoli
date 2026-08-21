// Requires mqtt.js loaded as a global (see index.html)
const DEFAULT_BROKER = 'wss://broker.hivemq.com:8884/mqtt';

export class MqttSignalingChannel {
  constructor(channelName, peerId, brokerUrl = DEFAULT_BROKER) {
    if (!window.mqtt) throw new Error('mqtt.js not loaded — add the script tag to index.html.');
    const safe = channelName.replace(/[^a-zA-Z0-9_/-]/g, '_');
    this.topicBase = `psychic-b/${safe}`;
    this.peerId = peerId;
    this.onmessage = null;

    this._client = window.mqtt.connect(brokerUrl, {
      clientId: `pb_${peerId.replace(/-/g, '').slice(0, 16)}_${Math.random().toString(16).slice(2)}`,
      clean: true,
      reconnectPeriod: 2000
    });

    this._client.on('message', (_topic, buffer) => {
      if (!this.onmessage) return;
      try {
        const message = JSON.parse(buffer.toString());
        this.onmessage({ data: message });
      } catch { /* ignore malformed frames */ }
    });
  }

  listen() {
    this._client.subscribe([
      `${this.topicBase}/to/${this.peerId}`,
      `${this.topicBase}/broadcast`
    ]);
  }

  postMessage(message) {
    const topic = message.to
      ? `${this.topicBase}/to/${message.to}`
      : `${this.topicBase}/broadcast`;
    this._client.publish(topic, JSON.stringify(message), { qos: 0, retain: false });
  }

  close() {
    this._client.end();
  }
}
