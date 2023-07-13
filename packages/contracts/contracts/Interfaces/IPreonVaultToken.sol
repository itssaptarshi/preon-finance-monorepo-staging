// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

/**
 * @notice Interface for use of wrapping and unwrapping vault tokens in the Preon Finance borrowing
 * protocol.
 */
interface IPreonVaultToken {
    function deposit(uint256 _amt) external returns (uint256 receiptTokens);

    function depositFor(
        address _borrower,
        address _recipient,
        uint256 _amt
    ) external returns (uint256 receiptTokens);

    function redeem(address _to, uint256 _amt)
        external
        returns (uint256 underlyingTokens);

    function redeem(uint256 _amt) external returns (uint256 underlyingTokens);

    function redeemFor(
        uint256 _amt,
        address _from,
        address _to
    ) external returns (uint256 underlyingTokens);
}
