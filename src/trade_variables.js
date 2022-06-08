const ethers = require("ethers");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const WETH = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";
const TOKENS_TO_MONITOR = ["0x845E5517e1cCB9394f49C909870Ea144937B68EC"];
const MAX_WETH_TO_SANDWICH = 10;
const WSS = process.env.GOERLI_WSS_URL;
const provider = new ethers.providers.WebSocketProvider(WSS);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

module.exports = {
  WETH,
  TOKENS_TO_MONITOR,
  MAX_WETH_TO_SANDWICH,
  provider,
  signer,
};
