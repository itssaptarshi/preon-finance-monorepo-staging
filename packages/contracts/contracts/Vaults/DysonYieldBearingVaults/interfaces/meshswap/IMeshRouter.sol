// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.2;

interface IMeshRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;

    function getAmountsOut(uint256 amountIn, address[] calldata path) external returns (uint256[] memory);
    function getAmountsIn(uint256 amountOut, address[] calldata path) external returns (uint256[] memory);
}
