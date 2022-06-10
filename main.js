const ethers = require("ethers");
require("dotenv").config();
const {
  provider,
  TOKENS_TO_MONITOR,
  WETH,
} = require("./src/trade_variables.js");
const { getUniv2PairAddress, getUniv2Reserve } = require("./src/utils.js");
const {
  calcOptimalSandwichAmount,
  calcRawProfits,
} = require("./src/calculation.js");
const SwapRouter02Abi = require("./src/abi/SwapRouter02.json");

const iface = new ethers.utils.Interface(SwapRouter02Abi);

async function filterTx(tx) {
  const { gasPrice, gasLimit, to, data } = tx;
  let amountIn, amountOutMin, path, token0, token1;
  // UniswapV3Router
  if (to == "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45") {
    const inputData = iface.parseTransaction({ data: data });
    const inputArgs = inputData["args"];
    if (
      inputData["sighash"].toLowerCase() === "0x5ae401dc" &&
      inputArgs["data"] !== undefined
    ) {
      let swapArgs = inputArgs["data"][0];
      const swapSigHash = swapArgs.slice(0, 10);
      if (swapSigHash.toLowerCase() === "0x472b43f3") {
        const swapInputData = iface.parseTransaction({ data: swapArgs });
        [amountIn, amountOutMin, path] = swapInputData["args"];
        token0 = path[0];
        token1 = path[path.length - 1];
      }
    }
  }
  // UniswapV2Router
  if (to == "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D") {
    const sigHash = data.slice(0, 10);
    // swapExactETHForTokens(uint256,address[],address,uint256)
    if (sigHash.toLowerCase() == "0x7ff36ab5") {
      [amountOutMin, path] = ethers.utils.defaultAbiCoder.decode(
        ["uint256", "address[]", "address", "uint256"],
        ethers.utils.hexDataSlice(data, 4)
      );
      amountIn = tx.value;
      token0 = WETH;
      token1 = path[1];
    }
    // swapExactTokensForTokens(uint256,uint256,address[],address,uint256)
    if (sigHash.toLowerCase() == "0x38ed1739") {
      [amountIn, amountOutMin, path] = ethers.utils.defaultAbiCoder.decode(
        ["uint256", "uint256", "address[]", "address", "uint256"],
        ethers.utils.hexDataSlice(data, 4)
      );
      token0 = path[0];
      token1 = path[path.length - 1];
    }
  }

  if (token1 == undefined) {
    return;
  }

  if (
    !TOKENS_TO_MONITOR.map((token) => {
      return token.toLowerCase();
    }).includes(token1.toLowerCase())
  ) {
    return;
  }

  console.log("Potential sandwich transaction found...");
  console.log(
    JSON.stringify(
      {
        swap: token0,
        target: token1,
        amountIn: ethers.utils.formatEther(amountIn.toString()),
        amountOutMin: ethers.utils.formatEther(amountOutMin),
        gasPrice: ethers.utils.formatUnits(gasPrice, "gwei"),
        gasLimit: gasLimit.toString(),
      },
      null,
      "\t"
    )
  );

  const pairAddress = getUniv2PairAddress(WETH, token1);
  const [reserveWETH, reserveToken] = await getUniv2Reserve(
    pairAddress,
    WETH,
    token1
  );

  const optimalSandwichAmount = calcOptimalSandwichAmount(
    amountIn,
    amountOutMin,
    reserveWETH,
    reserveToken
  );
  console.log(
    "Optimal Sandwich amount: ",
    ethers.utils.formatEther(optimalSandwichAmount.toString())
  );

  const rawProfits = calcRawProfits(
    amountIn,
    amountOutMin,
    reserveWETH,
    reserveToken,
    optimalSandwichAmount
  );
  console.log(
    "Raw profits excluding transaction costs: ",
    ethers.utils.formatEther(rawProfits.toString())
  );

  if (rawProfits === null) {
    console.log("Victim receives less than minimum amount");
    return;
  }

  // Add Smart Contract
  // Run Flashbots
  // Calc profits with gas simulation
}

async function main() {
  console.log("Scanning mempool...");
  provider.on("pending", function (hash) {
    provider.getTransaction(hash).then(function (tx) {
      if (tx == null) return;
      filterTx(tx);
    });
  });
}

main();
