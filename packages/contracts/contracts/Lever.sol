// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.2;

import "./Router.sol";
import "./Dependencies/ReentrancyGuard.sol";
import "./Dependencies/Initializable.sol";

/**
 * @notice Lever is a contract intended for use in the Preon Finance Lever Up feature. It routes from
 * STAR to some various token out which has to be compatible with the underlying router in the route
 * function, and unRoutes backwards to get STAR out. Sends to the active pool address by intention and
 * route is called in functions openTroveLeverUp and addCollLeverUp in BorrowerOperations.sol. unRoute
 * is called in functions closeTroveUnleverUp and withdrawCollUnleverUp in BorrowerOperations.sol.
 */

contract Lever is Router, ReentrancyGuard {
    constructor() {
        initialize();
    }

    function initialize() public {
        // __Ownable_init();
    }

    // Goes from some token (STAR likely) and gives a certain amount of token out.
    // Auto transfers to active pool from call in BorrowerOperations.sol, aka _toUser is always activePool
    // Goes from _startingTokenAddress to _endingTokenAddress, pulling tokens from _fromUser, of _amount, and gets _minSwapAmount out _endingTokenAddress
    function route(
        address _toUser,
        address _startingTokenAddress,
        address _endingTokenAddress,
        uint256 _amount,
        uint256 _minSwapAmount
    ) external nonReentrant returns (uint256 amountOut) {
        amountOut = swap(
            _startingTokenAddress,
            _endingTokenAddress,
            _amount,
            _minSwapAmount
        );
        IERC20(_endingTokenAddress).transfer(_toUser, amountOut);
    }

    // Takes the address of the token required in, and gives a certain amount of any token (STAR likely) out
    // User first withdraws that collateral from the active pool, then performs this swap. Unwraps tokens
    // for the user in that case.
    // Goes from _startingTokenAddress to _endingTokenAddress, pulling tokens from _fromUser, of _amount, and gets _minSwapAmount out _endingTokenAddress.
    // Use case: Takes token from trove debt which has been transfered to the owner and then swaps it for STAR, intended to repay debt.
    function unRoute(
        address _toUser,
        address _startingTokenAddress,
        address _endingTokenAddress,
        uint256 _amount,
        uint256 _minSwapAmount
    ) external nonReentrant returns (uint256 amountOut) {
        amountOut = swap(
            _startingTokenAddress,
            _endingTokenAddress,
            _amount,
            _minSwapAmount
        );
        IERC20(_endingTokenAddress).transfer(_toUser, amountOut);
    }
}
