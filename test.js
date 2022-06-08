const ethers = require("ethers");
const { calcOptimalSandwichAmount } = require("./src/profitability.js");

function main() {
  const optimal = calcOptimalSandwichAmount(
    ethers.utils.parseUnits("0.01"),
    ethers.utils.parseUnits("0.1"),
    ethers.utils.parseUnits("0.2498"),
    ethers.utils.parseUnits("4.04")
  );

  console.log("optimal", optimal);
}

main();
