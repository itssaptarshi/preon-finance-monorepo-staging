// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

interface IBaseOracle {
    /// @dev Return the value of the given input as USD per unit.
    /// @param token The ERC-20 token to check the value.
    function getPrice(address token) external view returns (uint);
}
