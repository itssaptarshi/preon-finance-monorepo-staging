// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.2;

import {ERC20} from "../../dependencies/ERC20.sol";

interface IDysonStrategy {
    function compound() external;
    function underlying() external view returns (ERC20);
    function underlyingDecimal() external view returns (uint256);
    function deposit(uint256 _amt) external;
    function withdraw(uint256 _amt) external;
    function balanceOfThis() external view returns (uint256);
    function preonTreasury() external view returns (address);
    function beforeDepositAndWithdraw() external;
}
