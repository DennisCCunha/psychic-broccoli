class Player {
    constructor(nome = "", ordem = 1, run = true, score = [], currentScore = 0) {
        this.nome = nome || "";
        this.ordem = ordem;
        this.run = run;
        this.score = score;
        this.currentScore = currentScore;
    }

    get() {
        return {
            nome: this.nome,
            ordem: this.ordem,
            run: this.run,
            score: [...this.score],
            currentScore: this.currentScore
        };
    }
}

class TurnController {
    constructor(root = document) {
        this.root = root;
        this.players = [];
        this.playersPreviousOrder = [];
        this.playersNextOrder = [];
        this.round = 0;

        this.addPlayerButton = this.root.getElementById("addPlayerButton");
        this.turnOrderList = this.root.getElementById("turnOrderList");
        this.bindEvents();
    }

    bindEvents() {
        this.addPlayerButton?.addEventListener("click", () => {
            this.addPlayer();
            this.renderPlayerList();
        });

        this.turnOrderList?.addEventListener("click", (event) => {
            const button = event.target.closest("button[data-order]");
            if (!button) return;

            const order = Number(button.dataset.order);
            if (button.classList.contains("end-turn-button")) this.endTurn(order);
            if (button.classList.contains("remove-player-button")) this.removePlayer(order);
            this.renderPlayerList();
        });
    }

    countplayer() {
        return this.players.length;
    }

    addPlayer(name = "Jogador ") {
        const index = this.players.length;
        this.players.push(new Player(`${name}${index}`, index + 1));
        return this.players.at(-1);
    }

    updateTurnOrder() {
        this.playersPreviousOrder = [...this.players];
        this.playersNextOrder = [...this.players];
    }

    removePlayer(player) {
        const order = player instanceof Player ? player.ordem : Number(player);
        const index = this.players.findIndex((item) => item.ordem === order);
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
        if (this.players.length && this.players.every((player) => !player.run)) this.round++;
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
    }

    render() {
        return this.players.map((player) => `<div id="player${player.ordem}">
            <button class="end-turn-button" data-order="${player.ordem}">End Turn</button>
            <span class="player-order">${player.ordem}º</span>
            <input type="text" value="${this.escapeHTML(player.nome)}" class="player-name"/>
            <span class="player-score"><label>Score:</label> ${player.currentScore}</span>
            <button class="remove-player-button" data-order="${player.ordem}">X</button>
        </div>`).join("");
    }

    turnTrackerRender() {
        const sequence = document.createElement("div");
        sequence.className = "sequence";
        sequence.id = "turnsequence";

        const sequenceCount = document.createElement("div");
        sequenceCount.className = "sequence-count";
        sequenceCount.textContent = this.roundCounter();
        sequence.appendChild(sequenceCount);

        const sequenceTrack = document.createElement("div");
        sequenceTrack.className = "sequence-track";

        sequence.appendChild(sequenceTrack);
        return sequence;
    }

    turnTrackerRenderPlayers(players) {
        const sequenceTrack = document.getElementById("turnsequence")?.querySelector(".sequence-track");
        if (!sequenceTrack) return;
    
            players.forEach((player, index) => {
            const sequenceElement = document.createElement("div");
            sequenceElement.className = "sequence-element";
            if (index === 0) sequenceElement.classList.add("sequence-element--first");
            if (index >= players.length - 2) sequenceElement.classList.add("sequence-element--reduced");
            sequenceTrack.appendChild(sequenceElement);
        });
    }


    findPlayer(player) {
        if (player instanceof Player) return this.players.includes(player) ? player : null;
        return this.players.find((item) => item.ordem === Number(player)) || null;
    }

    reindexPlayers() {
        this.players.forEach((player, index) => { player.ordem = index + 1; });
    }

    escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, (character) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[character]);
    }
}

export { TurnController, Player };