const ethers = require("ethers");
const {
  FlashbotsBundleProvider,
} = require("@flashbots/ethers-provider-bundle");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const WETH = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";
const TOKENS_TO_MONITOR = [
  "0x845E5517e1cCB9394f49C909870Ea144937B68EC",
  "0x63bfb2118771bd0da7A6936667A7BB705A06c1bA",
];
const MAX_WETH_TO_SANDWICH = 0.1;
const SANDWICH_CONTRACT = "0xa87ff748b05Ed28c4F6847eF830dD607CB9dFD62";

const CHAIN_ID = 5;
const WSS = process.env.GOERLI_WSS_URL;
const FLASHBOTS_ENDPOINT = "https://relay-goerli.flashbots.net";

const provider = new ethers.providers.WebSocketProvider(WSS);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const getFlashbotsProvider = async () => {
  return await FlashbotsBundleProvider.create(
    provider,
    wallet,
    FLASHBOTS_ENDPOINT,
    "goerli"
  );
};

module.exports = {
  WETH,
  TOKENS_TO_MONITOR,
  MAX_WETH_TO_SANDWICH,
  SANDWICH_CONTRACT,
  FLASHBOTS_ENDPOINT,
  CHAIN_ID,
  provider,
  getFlashbotsProvider,
  wallet,
};
