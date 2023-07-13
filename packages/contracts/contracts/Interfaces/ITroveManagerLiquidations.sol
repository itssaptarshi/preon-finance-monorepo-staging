// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

interface ITroveManagerLiquidations {
    function batchLiquidateTroves(
        address[] memory _troveArray,
        address _liquidator
    ) external;
}
