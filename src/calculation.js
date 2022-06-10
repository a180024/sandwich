const ethers = require("ethers");
const { getUniv2DataGivenAmountIn } = require("./utils.js");
const { MAX_WETH_TO_SANDWICH } = require("./trade_variables.js");

const BN_18 = ethers.utils.parseUnits("1.0");
const TOLERANCE = ethers.utils.parseUnits("0.01"); // 1%

function binarySearch(
  left,
  right,
  amountIn,
  amountOutMin,
  reserveWETH,
  reserveToken
) {
  const mid = right.add(left).div(2);
  if (right.sub(left).lte(TOLERANCE.mul(mid).div(BN_18))) {
    return mid;
  }
  const frontRunState = getUniv2DataGivenAmountIn(
    mid,
    reserveWETH,
    reserveToken
  );
  const victimState = getUniv2DataGivenAmountIn(
    amountIn,
    frontRunState.newReserveA,
    frontRunState.newReserveB
  );
  const victimAmountOut = victimState.amountOut;
  if (victimAmountOut.gte(amountOutMin)) {
    return binarySearch(
      mid,
      right,
      amountIn,
      amountOutMin,
      reserveWETH,
      reserveToken
    );
  } else {
    return binarySearch(
      left,
      mid,
      amountIn,
      amountOutMin,
      reserveWETH,
      reserveToken
    );
  }
}

function calcOptimalSandwichAmount(
  amountIn,
  amountOutMin,
  reserveWETH,
  reserveToken
) {
  const lowerBound = ethers.utils.parseUnits("0");
  const upperBound = ethers.utils.parseUnits(MAX_WETH_TO_SANDWICH.toString());
  const optimalSandwichAmount = binarySearch(
    lowerBound,
    upperBound,
    amountIn,
    amountOutMin,
    reserveWETH,
    reserveToken
  );
  return optimalSandwichAmount;
}

function calcRawProfits(
  amountIn,
  amountOutMin,
  reserveWETH,
  reserveToken,
  optimalSandwichAmount
) {
  const frontrunState = getUniv2DataGivenAmountIn(
    optimalSandwichAmount,
    reserveWETH,
    reserveToken
  );
  const victimState = getUniv2DataGivenAmountIn(
    amountIn,
    frontrunState.newReserveA,
    frontrunState.newReserveB
  );
  const backrunState = getUniv2DataGivenAmountIn(
    frontrunState.amountOut,
    victimState.newReserveB,
    victimState.newReserveA
  );

  if (victimState.amountOut.lt(amountOutMin)) {
    return null;
  }

  const rawProfits = backrunState.amountOut.sub(optimalSandwichAmount);

  return rawProfits;
}

exports.calcOptimalSandwichAmount = calcOptimalSandwichAmount;
exports.calcRawProfits = calcRawProfits;
