const ethers = require("ethers");
const {
  FlashbotsBundleProvider,
} = require("@flashbots/ethers-provider-bundle");
require("dotenv").config();
const {
  provider,
  getFlashbotsProvider,
  TOKENS_TO_MONITOR,
  WETH,
} = require("./src/trade_variables.js");
const { getUniv2PairAddress, getUniv2Reserves } = require("./src/utils.js");
const {
  calcOptimalSandwichAmount,
  calcSandwichStates,
} = require("./src/calculation.js");
const { buildFlashbotsTx } = require("./src/swap.js");
const SwapRouter02Abi = require("./src/abi/SwapRouter02.json");

const iface = new ethers.utils.Interface(SwapRouter02Abi);

async function filterTx(tx) {
  const { to, data } = tx;
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

  if (
    amountIn == undefined ||
    amountOutMin == undefined ||
    token1 == undefined ||
    token0 == undefined
  ) {
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
      },
      null,
      "\t"
    )
  );

  const pairAddress = getUniv2PairAddress(WETH, token1);
  const [reserveWETH, reserveToken] = await getUniv2Reserves(
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

  const sandwichStates = calcSandwichStates(
    amountIn,
    amountOutMin,
    reserveWETH,
    reserveToken,
    optimalSandwichAmount
  );

  if (sandwichStates === null) {
    console.log("Victim receives less than minimum amount");
    return;
  }

  const rawProfits = sandwichStates.backrunState.amountOut.sub(
    optimalSandwichAmount
  );
  console.log("Raw profits: ", ethers.utils.formatEther(rawProfits).toString());

  // First profitability check
  if (rawProfits < 0) {
    console.log("Not profitable to sandwich before adding tx costs");
    return;
  }

  // Gas Parameters
  const block = await provider.getBlock();
  const baseFeePerGas = block.baseFeePerGas; // wei
  const maxBaseFeePerGas = FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(
    baseFeePerGas,
    1
  );

  // Simulate
  let simulation;
  const flashbotsProvider = await getFlashbotsProvider();
  const targetBlockNumber = (await provider.getBlockNumber()) + 1;
  const transactionBundleSim = await buildFlashbotsTx(
    sandwichStates,
    token1,
    tx,
    maxBaseFeePerGas,
    ethers.utils.parseUnits("0", "gwei")
  );
  const signedTransactions = await flashbotsProvider.signBundle(
    transactionBundleSim
  );
  try {
    simulation = await flashbotsProvider.simulate(
      signedTransactions,
      targetBlockNumber
    );
  } catch (err) {
    console.log("Simulation failed");
    return;
  }

  // Sandwich
  const results = simulation["results"];
  console.log(results.length);
  const frontrunGasUsed = ethers.BigNumber.from(results[0]["gasUsed"]);
  const backrunGasUsed = ethers.BigNumber.from(results[2]["gasUsed"]);
  const maxBribe = rawProfits.sub(frontrunGasUsed.mul(maxBaseFeePerGas));
  console.log(maxBribe.lt(maxBaseFeePerGas));
  // Second profitability check
  if (maxBribe < 0) return;
  const maxPriorityFeePerGas = maxBribe.mul(80).div(100);
  const transactionBundle = await buildFlashbotsTx(
    sandwichStates,
    token1,
    tx,
    maxBaseFeePerGas,
    maxPriorityFeePerGas
  );
  const flashbotsTransactionResponse = await flashbotsProvider.sendBundle(
    transactionBundle,
    targetBlockNumber
  );
  const receipt = await flashbotsTransactionResponse.receipts();
  console.log(receipt);
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
