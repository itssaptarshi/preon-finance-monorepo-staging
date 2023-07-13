// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

/**
 * The purpose of this contract is to hold STAR tokens for gas compensation:
 * https://github.com/liquity/dev#gas-compensation
 * When a borrower opens a trove, an additional 200 STAR debt is issued,
 * and 200 STAR is minted and sent to this contract.
 * When a borrower closes their active trove, this gas compensation is refunded:
 * 200 STAR is burned from the this contract's balance, and the corresponding
 * 200 STAR debt on the trove is cancelled.
 * See this issue for more context: https://github.com/liquity/dev/issues/186
 */
contract GasPool {
    // do nothing, as the core contracts have permission to send to and burn STAR from this address
}
