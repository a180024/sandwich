const {
  provider,
  wallet,
  SANDWICH_CONTRACT,
  CHAIN_ID,
  WETH,
} = require("./trade_variables.js");
const { encodeFunctionData, getRawTransaction } = require("./utils.js");
const abi = require("./abi/Sandwich.json");

const buildFlashbotsTx = async (
  sandwichStates,
  token,
  victimTx,
  maxBaseFeePerGas,
  maxPriorityFeePerGas
) => {
  const nonce = await provider.getTransactionCount(wallet.address);

  const frontrunTxData = encodeFunctionData(abi, "swap", [
    sandwichStates.optimalSandwichAmount,
    sandwichStates.frontrunState.amountOut,
    [WETH, token],
  ]);

  const backrunTxData = encodeFunctionData(abi, "swap", [
    sandwichStates.frontrunState.amountOut,
    sandwichStates.backrunState.amountOut,
    [token, WETH],
  ]);

  const transactionBundle = [
    {
      signer: wallet,
      transaction: {
        to: SANDWICH_CONTRACT,
        data: frontrunTxData,
        type: 2,
        chainId: CHAIN_ID,
        maxPriorityFeePerGas: 0,
        maxFeePerGas: maxBaseFeePerGas,
        gasLimit: 250000,
        nonce: nonce,
      },
    },
    {
      signedTransaction: getRawTransaction(victimTx),
    },
    {
      signer: wallet,
      transaction: {
        to: SANDWICH_CONTRACT,
        data: backrunTxData,
        type: 2,
        chainId: CHAIN_ID,
        maxPriorityFeePerGas: maxPriorityFeePerGas,
        maxFeePerGas: maxBaseFeePerGas,
        value: 0,
        gasLimit: 250000,
        nonce: nonce + 1,
      },
    },
  ];

  return transactionBundle;
};

exports.buildFlashbotsTx = buildFlashbotsTx;
