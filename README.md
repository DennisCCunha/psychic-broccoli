# psychic-broccoli
Pequeno app para ajudar nas mesas de boardgames, com controle de rodadas, cronometro de turnos, sorteio de jogs e rankings

## Componentes WebRTC

As implementações de conexão, sinalização MQTT, desenho, chat de texto, voz e suas UIs vivem exclusivamente em `js/components/webrtc/`. Consuma o barrel `js/components/webrtc/index.js` ou os módulos locais diretamente. O `peer-event-listener.js` fornece a ponte entre eventos e callbacks antigos.

### Autoridade da sala

O `PeerConnectionManager` vincula a autoridade ao `peerId` que participa do handshake WebRTC: no host, ao próprio `peerId`; no convidado, ao peer que enviou a oferta. O campo `role` continua sendo usado para controlar o fluxo local, mas não é uma credencial e não deve ser usado para autorizar comandos remotos.

Mensagens administrativas, como limpar ou bloquear o quadro e sincronizar música, são aceitas somente quando vêm do `authorityPeerId`. Essa validação ocorre antes do encaminhamento para os componentes, portanto alterar `role` ou `isHost` pelo console só modifica a própria aba e não concede autoridade sobre os demais peers.

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
