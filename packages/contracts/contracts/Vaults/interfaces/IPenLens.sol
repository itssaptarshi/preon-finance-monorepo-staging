// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

interface IPenLens {
    function stakingRewardsByDystPool(address dystPoolAddress)
        external
        view
        returns (address);
}
