// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

interface IPriceFeed {
    event LastGoodPriceUpdated(uint256 _lastGoodPrice);

    function fetchPrice() external returns (uint);

    function fetchPrice_v() external view returns (uint);
}
