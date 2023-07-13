// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

import "./IPriceFeed.sol";

interface ILiquityBase {
    function getEntireSystemDebt()
        external
        view
        returns (uint entireSystemDebt);
}
