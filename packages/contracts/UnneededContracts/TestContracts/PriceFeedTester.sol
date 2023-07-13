// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

import "../PriceFeed.sol";

contract PriceFeedTester is PriceFeed {
    function setLastGoodPrice(uint _lastGoodPrice) external {
        lastGoodPrice = _lastGoodPrice;
    }
}
