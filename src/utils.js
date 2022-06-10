const ethers = require("ethers");

const UniswapV2PairAbi = require("./abi/UniswapV2Pair.json");
const { signer } = require("./trade_variables.js");

const uniswapV2Pair = new ethers.Contract(
  ethers.constants.AddressZero,
  UniswapV2PairAbi,
  signer
);

const sortTokens = (tokenA, tokenB) => {
  if (ethers.BigNumber.from(tokenA).lt(ethers.BigNumber.from(tokenB))) {
    return [tokenA, tokenB];
  }
  return [tokenB, tokenA];
};

const getUniv2PairAddress = (tokenA, tokenB) => {
  const [token0, token1] = sortTokens(tokenA, tokenB);

  const salt = ethers.utils.keccak256(token0 + token1.replace("0x", ""));
  const address = ethers.utils.getCreate2Address(
    "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", // Factory address (contract creator)
    salt,
    "0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f" // init code hash
  );

  return address;
};

const getUniv2Reserve = async (pair, tokenA, tokenB) => {
  const [token0] = sortTokens(tokenA, tokenB);
  const [reserve0, reserve1] = await uniswapV2Pair.attach(pair).getReserves();

  if (tokenA.toLowerCase() === token0.toLowerCase()) {
    return [reserve0, reserve1];
  }
  return [reserve1, reserve0];
};

const getUniv2DataGivenAmountIn = (amountIn, reserveA, reserveB) => {
  const amountInWithFee = amountIn.mul(997); // 0.3% swap fee
  const numerator = amountInWithFee.mul(reserveB);
  const denominator = amountInWithFee.add(reserveA.mul(1000));
  const amountOut = numerator.div(denominator);

  const newReserveA = reserveA.add(amountIn);
  const newReserveB = reserveB.sub(amountOut);

  return {
    amountOut,
    newReserveA,
    newReserveB,
  };
};

exports.getUniv2Reserve = getUniv2Reserve;
exports.getUniv2PairAddress = getUniv2PairAddress;
exports.getUniv2DataGivenAmountIn = getUniv2DataGivenAmountIn;
