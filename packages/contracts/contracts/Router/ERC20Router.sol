// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "../Interfaces/IPreonRouter.sol";
import "../Interfaces/IERC20.sol";
import "../Dependencies/SafeMath.sol";
import "../STARToken.sol";
import "../Dependencies/SafeERC20.sol";

// ERC20 router contract to be used for routing STAR -> ERC20 and then wrapping.
// simple router using TJ router.
contract ERC20Router is IPreonRouter {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address internal immutable activePoolAddress;
    address internal immutable traderJoeRouter;
    address internal immutable starTokenAddress;
    string constant name = "STARRouter";

    constructor(
        address _activePoolAddress,
        address _traderJoeRouter,
        address _starTokenAddress
    ) public {
        activePoolAddress = _activePoolAddress;
        traderJoeRouter = _traderJoeRouter;
        starTokenAddress = _starTokenAddress;
    }

    // Takes the address of the token in, and gives a certain amount of token out.
    // Auto transfers to active pool.
    function route(
        address _fromUser,
        address _startingTokenAddress,
        address _endingTokenAddress,
        uint256 _amount,
        uint256 _minSwapAmount
    ) external override returns (uint256) {
        require(
            _startingTokenAddress == starTokenAddress,
            "Cannot route from a token other than STAR"
        );
        address[] memory path = new address[](2);
        path[0] = starTokenAddress;
        path[1] = _endingTokenAddress;
        IERC20(starTokenAddress).safeApprove(traderJoeRouter, _amount);
        uint256[] memory amounts = IRouter(traderJoeRouter)
            .swapExactTokensForTokens(
                _amount,
                1,
                path,
                activePoolAddress,
                block.timestamp
            );
        require(
            amounts[1] >= _minSwapAmount,
            "Did not receive enough tokens to account for slippage"
        );

        return amounts[1];
    }

    function unRoute(
        address _targetUser,
        address _startingTokenAddress,
        address _endingTokenAddress,
        uint256 _amount,
        uint256 _minSwapAmount
    ) external override returns (uint256) {
        require(
            _endingTokenAddress == starTokenAddress,
            "Cannot unroute from a token other than STAR"
        );
        address[] memory path = new address[](2);
        path[0] = _startingTokenAddress;
        path[1] = starTokenAddress;
        IERC20(_startingTokenAddress).safeApprove(traderJoeRouter, _amount);
        uint256[] memory amounts = IRouter(traderJoeRouter)
            .swapExactTokensForTokens(
                _amount,
                1,
                path,
                _targetUser,
                block.timestamp
            );
        require(
            amounts[1] >= _minSwapAmount,
            "Did not receive enough tokens to account for slippage"
        );

        return amounts[1];
    }
}

// Router for Uniswap V2, performs STAR -> PREON swaps
interface IRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}
