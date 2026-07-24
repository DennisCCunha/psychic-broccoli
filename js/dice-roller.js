

import Parser from "https://esm.sh/@3d-dice/dice-roller-parser@0.2.6?target=es2022";
import DiceBox from "https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@1.1.4/dist/dice-box.es.min.js";
import BoxControls from "https://esm.sh/@3d-dice/dice-ui@0.5.2/src/boxControls/boxControls.js";


class DiceRollerWarper {
  constructor() {
    const diceBoxConfig = {

      container: "#diceRollerContainer", 
      id: "diceCanvas",
      assetPath: "assets/",
      // origin: "https://unpkg.com/@3d-dice/dice-box@1.1.4/dist/",
      origin: "https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@1.1.4/dist/",

      offscreen: !0,
      scale: 8,

      gravity: 1, 
      mass: 1, 
      friction: 0.8, 
      restitution: 0, 
      angularDamping: 0.4, 
      linearDamping: 0.4, 
      spinForce: 4, 
      throwForce: 5, 
      startingHeight: 8, 
      settleTimeout: 5000, 
      delay: 10, 
      lightIntensity: 1, 
      enableShadows: true, 
      shadowTransparency: 0.8, 
      theme: "default", 
      themeColor: "#2e8555", 
    };
    this.diceBox = new DiceBox(diceBoxConfig);
    this.boxControls = null;

  }

  async init() {
    await this.diceBox.init();
    this.boxControls = new BoxControls(this.diceBox);
    this.diceRoll = new Parser.DiceRoller();

  }

  async roll(diceNotation) {
    let roll = await this.diceBox.roll(diceNotation);
    let results = this.calculateResults(roll);
    return results;
  }

  calculateResults(roll) {
    let results = {sum: 0, avg: 0, min: null, max: null, rolls: []};
    results.rolls = roll.map(dice => dice);
    for (let dice of roll) {
      results.sum += dice.value;
      if (results.min === null || dice.value < results.min) results.min = dice.value;
      if (results.max === null || dice.value > results.max) results.max = dice.value;
    }
    results.avg = results.rolls.length ? results.sum / results.rolls.length : 0;
    return results;
  }

  


}


class RollParser {
  constructor() {
    this.parser = new Parser();
  }

  Parse(diceNotation) {
    let roll = this.parser.parse(diceNotation);
    return roll;
  }


}



export default DiceRollerWarper;