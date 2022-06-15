# Sandwich Bot Demo
> Monitors mempool for Uniswap V2 and V3(Multicall) buy transactions, performs sandwich on profitable transactions using Flashbots.

## Setup
1. Add PRIVATE_KEY, GOERLI_WSS_URL variables in .env file
2. Fill variables in src/trade_variables.js file

## Deploy Contracts
1. Add ETHERSCAN_API_KEY in .env file
2. ```
   $ npx hardhat run scripts/deploy.js --network goerli
   $ npx hardhat verify --network goerli <Contract address> <WETH address> 
   ```
3. Send ETH to sandwich contract to wrap to WETH

