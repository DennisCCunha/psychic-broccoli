class Player {
    constructor(nome =""){
        this.nome = nome ? nome : ""
        this.ordem = 0
        this.run = true;
        this.score = 0;
    }
    get(){
        return {nome: this.nome, ordem: this.ordem, run: this.run, score: this.score}
    }
}

class TurnController {
    constructor() {
        this.players = [];

        this.addaddPlayerButton = document.getElementById("addPlayerButton");
        this.addaddPlayerButton.addEventListener("click", () => {
            this.addPlayer(playerName);
            this.updateTurnOrderDisplay();

        });
    }

    countplayer(){
        return this.players.length
    }

    addPlayer(name = "Jogador ") {
        let index = (this.players.length)
        this.players.push(new Player(name + (index + 1)));
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

    defineOrder(players = []){

    }

    endTurn(player){
        
    }

    resetTurn(){
        
    }

    nextTurn(){

    }
}