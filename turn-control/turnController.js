class Player {
    constructor(nome ="", ordem = 0, run = true, score = [], currentScore = 0) {
        this.nome = nome ? nome : ""
        this.ordem = ordem
        this.run = run; // True if the player can play, false if the player has already played
        this.score = score; // Array of scores for each round
        this.currentScore = currentScore;
    }
    get(){
        return {nome: this.nome, ordem: this.ordem, run: this.run, score: this.score}
    }
}

class TurnController {
    constructor() {
        this.players = [];
        this.playersPreviousOrder = [];
        this.playersNextOrder = [];

        this.addPlayerButton = document.getElementById("addPlayerButton");
        this.addPlayerButton.addEventListener("click", () => {
            // const playerName = prompt("Enter player name:");
            this.addPlayer();
            this.renderPlayerList();
        });
    }

    countplayer(){
        return this.players.length
    }

    addPlayer(name = "Jogador ") {
        let index = (this.players.length)
        let ordem = index + 1;
        this.players.push(new Player(name+index, ordem));
    }

    updateTurnOrder() {
        this.playersPreviousOrder = [...this.players];
        this.playersNextOrder = [...this.players];
    }

    removePlayer(player){
        
    }

    // https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
    shuffleOrder(players){ 
        let currentIndex = players.length;

        // While there remain elements to shuffle...
        while (currentIndex != 0) {

            // Pick a remaining element...
            let randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            // And swap it with the current element.
            [players[currentIndex], players[randomIndex]] = [
            players[randomIndex], players[currentIndex]];
        }
        return players;
    }

    defineOrder(order = []){

    }

    endTurn(player){
        this.players[player.ordem].run = false;
    }

    resetTurn(){    
    }

    nextTurn(){
        for (let player of this.players) {
            if (player.run) {
                player.run = true;
            }
        }
    }

    firstPlayer(player){
        this.players.sort((a, b) => a.ordem - b.ordem);
        let index = this.players.indexOf(player);
        if (index > -1) {
            this.players.splice(index, 1);
            this.players.unshift(player);
            for (let i = 0; i < this.players.length; i++) {
                this.players[i].ordem = i;
            }
        }
    }

    renderPlayerList(){
        let turnOrderList = document.getElementById("turnOrderList");
        turnOrderList.innerHTML = this.render();
    }


    render(){
        let playersHTML = "";
        for (let player of this.players) {
            playersHTML += `<div id="player${player.ordem}" class="">
                <button class="end-turn-button" onclick="turnController.endTurn(${player.ordem})">End Turn</button>
                <span class="player-order">${player.ordem}º</span>
                <input type="text" value="${player.nome}" class="player-name"/>
                <span class="player-score"><label>Score:</label> ${player.currentScore}</span>
                <button class="remove-player-button" onclick="turnController.removePlayer(${player.ordem})"> X </button>
            </div>`;
        }
        return playersHTML;
    }

}

export { TurnController, Player };