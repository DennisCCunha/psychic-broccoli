
import DiceRollerWrapper from '/js/dice-roller.js';
import { TurnController, Player } from '/turn-control/turnController.js';

function main() {
document.addEventListener('DOMContentLoaded', async () => { // Your code runs safely here
   const links = document.getElementsByTagName('nav');
   const diceRoller = await loadDiceRoller();
   const contentContainer = document.getElementById('contentContainer');
   const turnController = await loadTurnController(contentContainer);

   

   });
}

async function loadTurnController(contentContainer) {
      const response = await fetch('/turn-control/turnController.html');
      const html = await response.text();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      contentContainer.appendChild(tempDiv.firstElementChild);
      return new TurnController();
}

async function loadDiceRoller(contentContainer) {
      const diceRoller = new DiceRollerWrapper();
      await diceRoller.init();
      diceRoller.roll("2d20");
      return diceRoller;
}




main();