// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

// Interface which handles routing of tokens to between wrapped versions etc and STAR or other ERC20s.
interface IPreonRouter {
    // Goes from some token (STAR likely) and gives a certain amount of token out.
    // Auto transfers to active pool.
    // Goes from _startingTokenAddress to _endingTokenAddress, pulling tokens from _fromUser, of _amount, and gets _minSwapAmount out _endingTokenAddress
    function route(
        address _fromUser,
        address _startingTokenAddress,
        address _endingTokenAddress,
        uint _amount,
        uint _minSwapAmount
    ) external returns (uint256 _amountOut);

    // Takes the address of the token required in, and gives a certain amount of any token (STAR likely) out
    // User first withdraws that collateral from the active pool, then performs this swap. Unwraps tokens
    // for the user in that case.
    // Goes from _startingTokenAddress to _endingTokenAddress, pulling tokens from _fromUser, of _amount, and gets _minSwapAmount out _endingTokenAddress.
    // Use case: Takes token from trove debt which has been transfered to the owner and then swaps it for STAR, intended to repay debt.
    function unRoute(
        address _fromUser,
        address _startingTokenAddress,
        address _endingTokenAddress,
        uint _amount,
        uint _minSwapAmount
    ) external returns (uint256 _amountOut);
}
