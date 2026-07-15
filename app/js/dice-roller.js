
import DiceBox from "https://unpkg.com/@3d-dice/dice-box@1.1.4/dist/dice-box.es.min.js";

class DiceRoller {
  constructor() {
    const diceBoxConfig = {

      container: "#diceRollerContainer", 
      id: "diceCanvas",
      assetPath: "assets/",
      origin: "https://unpkg.com/@3d-dice/dice-box@1.1.4/dist/",
      preloadThemes: ["default-extras"],
      externalThemes: {
        diceOfRolling: "https://unpkg.com/@3d-dice/theme-dice-of-rolling@0.2.1"
      },
      offscreen: !0,
      scale: 10,

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
    this.diceBox.init().then(() => {
      this.diceBox.roll("2d20");
    });
  }

  rollDice(diceNotation) {
    return this.diceBox.roll(diceNotation);
  }
}
export default DiceRoller;
