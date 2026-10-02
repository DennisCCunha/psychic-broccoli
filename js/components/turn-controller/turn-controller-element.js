import { TurnController } from './turn-controller-model.js';

export class TurnControllerElement extends HTMLElement {
  connectedCallback() {
    if (this.controller) return;

    this.innerHTML = `
      <div id="turnControl">
        <div id="divcontrol">
          <div id="playerControl">
            <button id="addPlayerButton" type="button">Adicionar Jogador +</button>
            <button id="endRoundButton" type="button">Encerrar rodada</button>
            <button id="lockOrderButton" type="button" aria-pressed="false">Travar ordem</button>
          </div>
          <div class="turn-tracker" aria-label="Sequência da rodada">
            <div class="sequence">
              <div class="sequence-count"><span id="roundNumber">1</span><small>rodada</small></div>
              <div id="turnSequenceTrack" class="sequence-track"></div>
            </div>
          </div>
          <div id="previousTurn"></div>
          <div id="currentTurn"></div>
        </div>
        <div id="trunOrderContainer">
          <span id="turnOrderLabel">Ordem de Turno:</span>
          <div id="turnOrderList"></div>
        </div>
      </div>`;

    this.controller = new TurnController(this);
    this.controller.renderPlayerList();
  }
}

if (!customElements.get('turn-controller')) {
  customElements.define('turn-controller', TurnControllerElement);
}

export default TurnControllerElement;
