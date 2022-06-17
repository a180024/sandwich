const { provider } = require("./src/trade_variables.js");

async function test() {
  console.log(await provider.getFeeData());
}

test();
