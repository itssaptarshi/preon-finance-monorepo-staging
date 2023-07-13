// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

interface ICollateralReceiver {
    function receiveCollateral(address[] memory _tokens, uint[] memory _amounts)
        external;
}
