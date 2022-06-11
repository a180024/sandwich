// SPDX-License-Identifier: MIT

pragma solidity =0.6.6;

import "./lib/UniswapV2Library.sol";
import "./lib/TransferHelper.sol";

interface IWETH {
  function deposit() external payable;
}

interface IERC20 {
  function transfer(address recipient, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
}

contract Sandwich {
   address owner;
   IWETH public WETH;
   address factory;

   constructor(address _owner, address _WETH, address _factory) public {
     owner = _owner; 
     WETH = IWETH(_WETH);
     factory = _factory;
   }

   receive() external payable {
     WETH.deposit{value:msg.value}();
   }

   function swap(uint amountIn, uint amountOutMin, address[] calldata path) external onlyOwner {
     uint[] memory amounts = UniswapV2Library.getAmountsOut(factory, amountIn, path);
     require(amounts[amounts.length - 1] >= amountOutMin, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');
     TransferHelper.safeTransferFrom(
        path[0], address(this), UniswapV2Library.pairFor(factory, path[0], path[1]), amounts[0]
     );
     _swap(amounts, path, address(this));
   }

   function _swap(uint[] memory amounts, address[] memory path, address _to) internal virtual {
     for (uint i; i < path.length - 1; i++) {
       (address input, address output) = (path[i], path[i + 1]);
       (address token0,) = UniswapV2Library.sortTokens(input, output);
       uint amountOut = amounts[i + 1];
       (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
       address to = i < path.length - 2 ? UniswapV2Library.pairFor(factory, output, path[i + 2]) : _to;
       IUniswapV2Pair(UniswapV2Library.pairFor(factory, input, output)).swap(
         amount0Out, amount1Out, to, new bytes(0)
       );
      }
    }

   function withdraw(address token, uint amount) external onlyOwner {
     require(IERC20(token).balanceOf(address(this)) >= amount);
     IERC20(token).transfer(owner, amount);
   }

   modifier onlyOwner {
     require(msg.sender == owner);
     _;
   }

}


