// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

interface ITellorCaller {
    function getTellorCurrentValue(uint256 _requestId)
        external
        view
        returns (
            bool,
            uint256,
            uint256
        );
}
