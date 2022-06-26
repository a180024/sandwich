# Sandwich Bot Demo
> Monitors mempool for Uniswap V2 and V3(Multicall) buy transactions, performs sandwich on profitable transactions using Flashbots.

## Setup
- Add PRIVATE_KEY, GOERLI_WSS_URL variables in .env file
- Fill variables in src/trade_variables.js file

## Deploy Contracts
- Add ETHERSCAN_API_KEY in .env file
- ```
   $ npx hardhat run scripts/deploy.js --network goerli
   $ npx hardhat verify --network goerli <Contract address> <WETH address> 
   ```
- Send ETH to sandwich contract to wrap to WETH

