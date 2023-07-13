// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

interface ITraderJoeZap {
    function zapOut(address _from, uint256 amount) external;
}
