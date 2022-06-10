const ethers = require("ethers");
const {
  calcOptimalSandwichAmount,
  calcProfitability,
} = require("./src/calculation.js");

function main() {
  const optimalSandwichAmount = calcOptimalSandwichAmount(
    ethers.utils.parseUnits("0.01"),
    ethers.utils.parseUnits("0.02"),
    ethers.utils.parseUnits("0.3878"),
    ethers.utils.parseUnits("2.6077")
  );
  console.log(optimalSandwichAmount);
  // const rawProfits = calcProfitability(
  // ethers.utils.parseUnits("0.01"),
  // ethers.utils.parseUnits("0.1"),
  // ethers.utils.parseUnits("0.2798"),
  // ethers.utils.parseUnits("3.6084"),
  // optimalSandwichAmount
  // );

  // console.log("profit", rawProfits);
}

main();
