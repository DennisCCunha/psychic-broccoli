export class Player {
  constructor(nome = '', ordem = 1, run = true, score = [], currentScore = 0, previousRoundScore = 0, id = '') {
    this.id = id || `player-${crypto.randomUUID?.() || Date.now()}`;
    this.nome = nome || '';
    this.ordem = ordem;
    this.run = run;
    this.score = score;
    this.currentScore = currentScore;
    this.previousRoundScore = previousRoundScore;
  }

  get() {
    return {
      nome: this.nome,
      ordem: this.ordem,
      run: this.run,
      score: [...this.score],
      currentScore: this.currentScore,
      previousRoundScore: this.previousRoundScore,
      id: this.id
    };
  }
}

export class TurnController {
  constructor(root = document) {
    this.root = root;
    this.players = [];
    this.playersPreviousOrder = [];
    this.playersNextOrder = [];
    this.round = 1;
    this.orderLocked = false;

    this.addPlayerButton = this.findElement('addPlayerButton');
    this.turnOrderList = this.findElement('turnOrderList');
    this.bindEvents();
  }

  findElement(id) {
    return this.root.getElementById?.(id) || this.root.querySelector(`#${id}`);
  }

  bindEvents() {
    this.addPlayerButton?.addEventListener('click', () => {
      this.addPlayer();
      this.renderPlayerList();
    });

    this.root.querySelector('#endRoundButton')?.addEventListener('click', () => {
      this.nextTurn();
      this.renderPlayerList();
    });

    this.root.querySelector('#lockOrderButton')?.addEventListener('click', () => {
      this.orderLocked = !this.orderLocked;
      this.renderPlayerList();
    });

    this.findElement('turnSequenceTrack')?.addEventListener('click', (event) => this.handleSequenceClick(event));
    this.turnOrderList?.addEventListener('click', (event) => this.handleListClick(event));
    this.turnOrderList?.addEventListener('change', (event) => this.handleListChange(event));
    this.turnOrderList?.addEventListener('dragstart', (event) => this.handleDragStart(event));
    this.turnOrderList?.addEventListener('dragover', (event) => this.handleDragOver(event));
    this.turnOrderList?.addEventListener('drop', (event) => this.handleDrop(event));
  }

  handleSequenceClick(event) {
    const actionButton = event.target.closest('button[data-action]');
    if (!actionButton) return;

    this.handleActionElement(actionButton, actionButton.dataset.action);
  }

  handleListClick(event) {
    const button = event.target.closest('button[data-player-id]');
    if (!button) return;

    const action = button.classList.contains('end-turn-button')
      ? 'toggle-turn'
      : button.classList.contains('remove-player-button')
        ? 'remove-player'
        : button.classList.contains('score-button')
          ? 'score'
          : null;
    if (!action) return;

      this.handleActionElement(button, action);
    }

    handleActionElement(element, action) {
      const player = this.findPlayer(element.dataset.playerId);
      if (!player) return false;

      this.handlePlayerAction(player, action, element.dataset.delta);
      this.renderPlayerList();
      return true;
  }

  handlePlayerAction(player, action, delta) {
    if (action === 'toggle-turn') return this.endTurn(player);
    if (action === 'remove-player') return this.removePlayer(player);
    if (action === 'score') {
      const scoreDelta = Number(delta);
      if (Number.isFinite(scoreDelta)) return this.changeScore(player, scoreDelta);
    }
    return false;
  }

  handleListChange(event) {
    const field = event.target;
    const player = this.findPlayer(field.dataset.playerId);
    if (!player) return;

    if (field.classList.contains('player-name')) {
      player.nome = field.value.trim() || `Jogador ${player.ordem}`;
    }
    if (field.classList.contains('player-order') && !this.orderLocked) {
      this.movePlayer(player, Number(field.value));
    }
    this.renderPlayerList();
  }

  handleDragStart(event) {
    const item = event.target.closest('[data-player-id]');
    if (!item || this.orderLocked) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.dataset.playerId);
  }

  handleDragOver(event) {
    if (!this.orderLocked && event.target.closest('[data-player-id]')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }
  }

  handleDrop(event) {
    event.preventDefault();
    if (this.orderLocked) return;
    const sourceId = event.dataTransfer.getData('text/plain');
    const target = event.target.closest('[data-player-id]');
    if (!sourceId || !target || sourceId === target.dataset.playerId) return;

    const sourceIndex = this.players.findIndex((player) => player.id === sourceId);
    const targetIndex = this.players.findIndex((player) => player.id === target.dataset.playerId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const [player] = this.players.splice(sourceIndex, 1);
    const insertionIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    this.players.splice(insertionIndex, 0, player);
    this.reindexPlayers();
    this.renderPlayerList();
  }

  countplayer() {
    return this.players.length;
  }

  addPlayer(name = 'Jogador ') {
    const index = this.players.length;
    this.players.push(new Player(`${name}${index + 1}`, index + 1));
    this.reindexPlayers();
    return this.players.at(-1);
  }

  updateTurnOrder() {
    this.playersPreviousOrder = [...this.players];
    this.playersNextOrder = [...this.players];
  }

  removePlayer(player) {
    const target = this.findPlayer(player);
    const index = target ? this.players.indexOf(target) : -1;
    if (index === -1) return false;

    this.players.splice(index, 1);
    this.reindexPlayers();
    return true;
  }

  shuffleOrder(players = this.players) {
    const shuffled = [...players];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled;
  }

  defineOrder(order = []) {
    const orderedPlayers = order
      .map((item) => item instanceof Player ? item : this.players.find((player) => player.ordem === Number(item)))
      .filter(Boolean);
    const remainingPlayers = this.players.filter((player) => !orderedPlayers.includes(player));
    this.players = [...orderedPlayers, ...remainingPlayers];
    this.reindexPlayers();
    return this.players;
  }

  roundCounter() {
    return this.round;
  }

  movePlayer(player, requestedOrder) {
    if (this.orderLocked) return false;
    const target = this.findPlayer(player);
    const targetOrder = Math.max(1, Math.min(this.players.length, Number(requestedOrder)));
    if (!target || !Number.isFinite(targetOrder)) return false;

    this.players = this.players.filter((item) => item !== target);
    this.players.splice(targetOrder - 1, 0, target);
    this.reindexPlayers();
    return true;
  }

  changeScore(player, delta) {
    const target = this.findPlayer(player);
    if (!target || !Number.isFinite(delta)) return false;
    target.currentScore += delta;
    return true;
  }

  endTurn(player) {
    const target = this.findPlayer(player);
    if (!target) return false;
    target.run = false;
    return true;
  }

  resetTurn() {
    this.players.forEach((player) => { player.run = true; });
  }

  nextTurn() {
    if (this.players.length) {
      this.players.forEach((player) => {
        player.previousRoundScore = player.currentScore;
        player.score.push(player.currentScore);
        player.currentScore = 0;
      });
      this.round += 1;
    }
    this.resetTurn();
    return this.round;
  }

  firstPlayer(player) {
    const target = this.findPlayer(player);
    if (!target) return false;
    this.players = [target, ...this.players.filter((item) => item !== target)];
    this.reindexPlayers();
    return true;
  }

  renderPlayerList() {
    if (this.turnOrderList) this.turnOrderList.innerHTML = this.render();
    this.renderSequence();
    const roundLabel = this.findElement('roundNumber');
    const lockButton = this.findElement('lockOrderButton');
    if (roundLabel) roundLabel.textContent = this.roundCounter();
    if (lockButton) {
      lockButton.textContent = this.orderLocked ? 'Destravar ordem' : 'Travar ordem';
      lockButton.setAttribute('aria-pressed', String(this.orderLocked));
    }
  }

  renderSequence() {
    const sequenceTrack = this.findElement('turnSequenceTrack');
    if (!sequenceTrack) return;

    sequenceTrack.innerHTML = this.players.map((player, index) => `
      <div class="sequence-element${index === 0 ? ' sequence-element--first' : ''}${index >= this.players.length - 2 ? ' sequence-element--reduced' : ''}" data-player-id="${player.id}">
        <div class="player${player.run ? '' : ' player--ended'}">
          <span class="sequence-order">${player.ordem}</span>
          <span class="sequence-name">${this.escapeHTML(player.nome)}</span>
          <span class="sequence-score">
            <span>Score: ${player.currentScore}</span>
            <small>Ant.: ${player.previousRoundScore}</small>
          </span>
        </div>
        <div class="sequence-actions" aria-label="Ações do jogador ${this.escapeHTML(player.nome)}">
          <button type="button" class="sequence-action sequence-action--small" data-action="score" data-player-id="${player.id}" data-delta="-1" aria-label="Diminuir score de ${this.escapeHTML(player.nome)}">-</button>
          <button type="button" class="sequence-action sequence-action--small" data-action="score" data-player-id="${player.id}" data-delta="1" aria-label="Aumentar score de ${this.escapeHTML(player.nome)}">+</button>
          <button type="button" class="sequence-action sequence-action--toggle" data-action="toggle-turn" data-player-id="${player.id}" aria-label="${player.run ? 'Encerrar turno' : 'Turno encerrado'} de ${this.escapeHTML(player.nome)}">${player.run ? 'Encerrar' : 'Fim'}</button>
          <button type="button" class="sequence-action sequence-action--danger" data-action="remove-player" data-player-id="${player.id}" aria-label="Remover ${this.escapeHTML(player.nome)}">Remover</button>
        </div>
      </div>
    `).join('');
  }

  render() {
    return this.players.map((player) => `
      <div class="turn-player${player.run ? '' : ' turn-player--ended'}" draggable="${!this.orderLocked}" data-player-id="${player.id}">
        <input class="player-order" type="number" min="1" max="${this.players.length}" value="${player.ordem}" data-player-id="${player.id}" ${this.orderLocked ? 'disabled' : ''} aria-label="Ordem de ${this.escapeHTML(player.nome)}">
        <input type="text" value="${this.escapeHTML(player.nome)}" class="player-name" data-player-id="${player.id}" aria-label="Nome do jogador">
        <button class="end-turn-button" type="button" data-player-id="${player.id}">${player.run ? 'Encerrar turno' : 'Turno encerrado'}</button>
        <span class="player-score"><span>Score: ${player.currentScore}</span><small>Anterior: ${player.previousRoundScore}</small></span>
        <button class="score-button" type="button" data-player-id="${player.id}" data-delta="-1" aria-label="Deduzir score">-</button>
        <button class="score-button" type="button" data-player-id="${player.id}" data-delta="1" aria-label="Adicionar score">+</button>
        <button class="remove-player-button" type="button" data-player-id="${player.id}" aria-label="Remover jogador">Remover</button>
      </div>
    `).join('');
  }

  findPlayer(player) {
    if (player instanceof Player) return this.players.includes(player) ? player : null;
    return this.players.find((item) => item.id === String(player) || item.ordem === Number(player)) || null;
  }

  reindexPlayers() {
    this.players.forEach((player, index) => { player.ordem = index + 1; });
  }

  escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }
}

export default TurnController;
