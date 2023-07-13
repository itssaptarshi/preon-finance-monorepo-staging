// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

interface IFarm {
    function notifyRewardAmount(address token, uint256 amount) external;
}
