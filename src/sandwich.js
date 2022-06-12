const {
  FlashbotsBundleProvider,
} = require("@flashbots/ethers-provider-bundle");
const {
  wallet,
  provider,
  FLASHBOTS_ENDPOINT,
  SANDWICH_CONTRACT,
  CHAIN_ID,
} = require("./src/trade_variables.js");

async function swap(frontRunData, backRunData) {
  const block = await provider.getBlock();
  const nonce = await wssProvider.getTransactionCount(wallet.address);

  const flashbotsProvider = await FlashbotsBundleProvider.create(
    provider,
    wallet,
    FLASHBOTS_ENDPOINT
  );

  // include victim tx
  const bundleSubmitResponse = await flashbotsProvider.sendBundle(
    [
      {
        transaction: {
          chainId: CHAIN_ID,
          type: 2,
          data: frontRunData,
          maxFeePerGas: GWEI * 3n,
          maxPriorityFeePerGas: GWEI * 2n,
          gasLimit: 300000,
          to: SANDWICH_CONTRACT,
          nonce: nonce,
        },
        signer: wallet,
      },
      {
        transaction: {
          chainId: CHAIN_ID,
          type: 2,
          data: backRunData,
          maxFeePerGas: GWEI * 3n,
          maxPriorityFeePerGas: GWEI * 2n,
          gasLimit: 300000,
          to: SANDWICH_CONTRACT,
          nonce: nonce + 1,
        },
        signer: wallet,
      },
    ],
    block + 1
  );

  if ("error" in bundleSubmitResponse) {
    console.warn(bundleSubmitResponse.error.message);
    return;
  }

  const simulate = await bundle.simulate();

  console.log(simulate);
}
