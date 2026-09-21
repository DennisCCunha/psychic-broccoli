# psychic-broccoli
Pequeno app para ajudar nas mesas de boardgames, com controle de rodadas, cronometro de turnos, sorteio de jogs e rankings

## Componentes WebRTC

As implementações de conexão, sinalização MQTT, desenho, chat de texto e voz vivem em `js/components/webrtc/`. Consuma o barrel `js/components/webrtc/index.js` ou os módulos locais diretamente; `js/conn.js`, `js/drawing.js`, `js/text-chat.js`, `js/voice-chat.js` e `js/mqtt-signaling.js` permanecem apenas como adaptadores para consumidores legados. O `peer-event-listener.js` fornece a ponte entre eventos e callbacks antigos sem reintroduzir dependência dos módulos legados.

### Música sincronizada

`MusicSyncController` sincroniza playlist, play/pause, posição e volume pelo canal WebRTC. O host é a única autoridade de controle; cada participante executa o áudio localmente por meio de um adapter do player oficial do provedor.

```js
import { MusicSyncController } from './js/components/webrtc/index.js';

const music = new MusicSyncController(connection, {
	isHost: role === 'host',
	player: providerPlayer
});

if (role === 'host') {
	music.setPlaylist([{ provider: 'spotify', id: 'track-id', title: 'Track' }]);
	await music.play(0);
	music.setVolume(0.7);
}
```

O adapter deve implementar `load(item)`, `play(position)`, `pause()`, `seek(position)` e `setVolume(volume)`. O WebRTC transporta apenas comandos de sincronização; o áudio de serviços como Spotify, YouTube Music, Deezer e SoundCloud continua sendo reproduzido pelo player oficial em cada navegador.
