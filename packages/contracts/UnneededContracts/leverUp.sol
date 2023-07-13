// // SPDX-License-Identifier: MIT
// // @KingPreon: Ignore File
// pragma solidity 0.8.2;

// import "../Interfaces/ITroveManager.sol";
// import "../Interfaces/ISTARToken.sol";
// import "../Interfaces/IWhitelist.sol";
// import "../Interfaces/IBorrowerOperations.sol";
// import "./calculateMaxWithdrawHelper.sol";
// import "../Dependencies/IERC20.sol";

// contract leverUp {

//     ISTARToken public starToken;
//     ITroveManager public troveManager;
//     IWhitelist public whitelist;
//     IJoeRouter02 public joeRouter;
//     IBorrowerOperations public borrowerOperations;
//     calculateMaxWithdrawHelper public helper;
//     uint public maxFee= 0;// TODO: set properly
//     uint public MAXINT=type(uint).max;
//     constructor(ISTARToken _starToken, ITroveManager _troveManager, IBorrowerOperations, _borrowerOperations, IWhitelist _whitelist, IJoeRouter02 _joeRouter, calculateMaxWithdrawHelper _helper) public {
//         starToken = _starToken;
//         troveManager = _troveManager;
//         borrowerOperations = _borrowerOperations;
//         whitelist = _whitelist;
//         joeRouter = _joeRouter;
//         helper = _helper;
//     }

//     /**
//      * @notice Opens new trove, deposits collateral, draws out STAR, swap STAR for tokenOut, redeposits collateral into trove, draws more debt until STAROut is depleted
//      * @param _colls Addresses of collateral in initial deposit
//      * @param _amountsToAdd Quantities of collateral in initial deposit
//      * @param STAROut Total STAR denominated value of leveraged debt
//      * @param path JoeRouter path to swap, last element in path is tokenOut
//      * @param tokenOut Address of token to be leveraged
//      * @return uint Quantity of token you intent to have a leveraged position in out
//      */

//     function leverSimpleToken(address[] memory _colls, uint[] memory _amountsToAdd, uint STAROut, address[] memory path, address tokenOut) {
//         require(_colls.length == _amountsToAdd.length, 'Collateral and amounts are different lengths');
//         require(path[path.length - 1] == tokenOut, 'Last element in path is not tokenOut');
//         require(path[0]==address(starToken), 'First element in path is not starToken');

//         starToken.delegatecall(abi.encodeWithSignature("approve(address, uint)", address(joeRouter), MAXINT));
//         tokenOut.delegatecall(abi.encodeWithSignature("approve(address, uint)", address(this), MAXINT));
//         uint initialSTAR=starToken.balanceOf(msg.sender);
//         uint initialColl=IERC20(tokenOut).balanceOf(msg.sender);
//         uint debtToWithdraw;
//         address[] memory tokens;
//         tokens.push(tokenOut);
//         (address[] memory existingCollAddress, unit[] memory existingColls) = troveManager.getTroveColls(msg.sender);
//         if (existingColls.length == 0) {
//             //No existing trove, need to open new trove

//             (uint value, uint fee)=helper.calculateCollateralVCFee(_colls, _amountsToAdd);
//             debtToWithdraw = value - fee > STAROut ? STAROut : value - fee;
//             borrowerOperations.delegatecall(abi.encodeWithSignature("openTrove(uint256, uint256, address, address, address[], uint[])", maxFee, debtToWithdraw,msg.sender, msg.sender, _colls, _amountsToAdd));
//             troveManager.openTrove(msg.sender, _colls, _amountsToAdd);
//         } else {
//             // Trove exists already, need to deposit collateral
//             borrowerOperations.delegatecall(abi.encodeWithSignature("addColl(address[],uint[], address, address)", _colls, _amountsToAdd,msg.sender, msg.sender));
//             (uint value, uint fee)= helper.calculateCollateralVCFee(troveManager.getTroveColls(msg.sender));
//             debtToWithdraw = value - fee > STAROut ? STAROut : value - fee;
//             borrowerOperations.delegatecall(abi.encodeWithSignature("withdrawSTAR(uint, uint, address, address)", maxFee, debtToWithdraw ,msg.sender, msg.sender));
//         }
//         STAROut=STAROut-debtToWithdraw; //Calculate how much STAR more to withdraw
//         joeRouter.delegatecall(abi.encodeWithSignature("swapExactTokensForTokens(uint, uint, address[], address, uint)", debtToWithdraw, 0, path, msg.sender, now + 1 minutes));
//         while (STAROut>0) {
//             uint[] memory amounts;
//             amounts.push(IERC20(tokenOut).balanceOf(msg.sender)-initialColl);
//             (uint value, uint fee)=helper.calculateCollateralVCFee(tokens, amounts);
//             debtToWithdraw = value - fee > STAROut ? STAROut : value - fee;
//             borrowerOperations.delegatecall(abi.encodeWithSignature("addColl(address[],uint[], address, address)", tokens, amounts,msg.sender, msg.sender));
//             borrowerOperations.delegatecall(abi.encodeWithSignature("withdrawSTAR(uint, uint, address, address)", maxFee, debtToWithdraw ,msg.sender, msg.sender));
//             STAROut=STAROut-debtToWithdraw;
//             joeRouter.delegatecall(abi.encodeWithSignature("swapExactTokensForTokens(uint, uint, address[], address, uint)", debtToWithdraw, 0, path, msg.sender, now + 1 minutes));
//         }

//     }
// }


// interface IJoeRouter01 {
//     function factory() external pure returns (address);

//     function WAVAX() external pure returns (address);

//     function addLiquidity(
//         address tokenA,
//         address tokenB,
//         uint256 amountADesired,
//         uint256 amountBDesired,
//         uint256 amountAMin,
//         uint256 amountBMin,
//         address to,
//         uint256 deadline
//     )
//         external
//         returns (
//             uint256 amountA,
//             uint256 amountB,
//             uint256 liquidity
//         );

//     function addLiquidityAVAX(
//         address token,
//         uint256 amountTokenDesired,
//         uint256 amountTokenMin,
//         uint256 amountAVAXMin,
//         address to,
//         uint256 deadline
//     )
//         external
//         payable
//         returns (
//             uint256 amountToken,
//             uint256 amountAVAX,
//             uint256 liquidity
//         );

//     function removeLiquidity(
//         address tokenA,
//         address tokenB,
//         uint256 liquidity,
//         uint256 amountAMin,
//         uint256 amountBMin,
//         address to,
//         uint256 deadline
//     ) external returns (uint256 amountA, uint256 amountB);

//     function removeLiquidityAVAX(
//         address token,
//         uint256 liquidity,
//         uint256 amountTokenMin,
//         uint256 amountAVAXMin,
//         address to,
//         uint256 deadline
//     ) external returns (uint256 amountToken, uint256 amountAVAX);

//     function removeLiquidityWithPermit(
//         address tokenA,
//         address tokenB,
//         uint256 liquidity,
//         uint256 amountAMin,
//         uint256 amountBMin,
//         address to,
//         uint256 deadline,
//         bool approveMax,
//         uint8 v,
//         bytes32 r,
//         bytes32 s
//     ) external returns (uint256 amountA, uint256 amountB);

//     function removeLiquidityAVAXWithPermit(
//         address token,
//         uint256 liquidity,
//         uint256 amountTokenMin,
//         uint256 amountAVAXMin,
//         address to,
//         uint256 deadline,
//         bool approveMax,
//         uint8 v,
//         bytes32 r,
//         bytes32 s
//     ) external returns (uint256 amountToken, uint256 amountAVAX);

//     function swapExactTokensForTokens(
//         uint256 amountIn,
//         uint256 amountOutMin,
//         address[] calldata path,
//         address to,
//         uint256 deadline
//     ) external returns (uint256[] memory amounts);

//     function swapTokensForExactTokens(
//         uint256 amountOut,
//         uint256 amountInMax,
//         address[] calldata path,
//         address to,
//         uint256 deadline
//     ) external returns (uint256[] memory amounts);

//     function swapExactAVAXForTokens(
//         uint256 amountOutMin,
//         address[] calldata path,
//         address to,
//         uint256 deadline
//     ) external payable returns (uint256[] memory amounts);

//     function swapTokensForExactAVAX(
//         uint256 amountOut,
//         uint256 amountInMax,
//         address[] calldata path,
//         address to,
//         uint256 deadline
//     ) external returns (uint256[] memory amounts);

//     function swapExactTokensForAVAX(
//         uint256 amountIn,
//         uint256 amountOutMin,
//         address[] calldata path,
//         address to,
//         uint256 deadline
//     ) external returns (uint256[] memory amounts);

//     function swapAVAXForExactTokens(
//         uint256 amountOut,
//         address[] calldata path,
//         address to,
//         uint256 deadline
//     ) external payable returns (uint256[] memory amounts);

//     function quote(
//         uint256 amountA,
//         uint256 reserveA,
//         uint256 reserveB
//     ) external pure returns (uint256 amountB);

//     function getAmountOut(
//         uint256 amountIn,
//         uint256 reserveIn,
//         uint256 reserveOut
//     ) external pure returns (uint256 amountOut);

//     function getAmountIn(
//         uint256 amountOut,
//         uint256 reserveIn,
//         uint256 reserveOut
//     ) external pure returns (uint256 amountIn);

//     function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);

//     function getAmountsIn(uint256 amountOut, address[] calldata path) external view returns (uint256[] memory amounts);
// }

// interface IJoeRouter02 is IJoeRouter01 {
//     function removeLiquidityAVAXSupportingFeeOnTransferTokens(
//         address token,
//         uint256 liquidity,
//         uint256 amountTokenMin,
//         uint256 amountAVAXMin,
//         address to,
//         uint256 deadline
//     ) external returns (uint256 amountAVAX);

//     function removeLiquidityAVAXWithPermitSupportingFeeOnTransferTokens(
//         address token,
//         uint256 liquidity,
//         uint256 amountTokenMin,
//         uint256 amountAVAXMin,
//         address to,
//         uint256 deadline,
//         bool approveMax,
//         uint8 v,
//         bytes32 r,
//         bytes32 s
//     ) external returns (uint256 amountAVAX);

//     function swapExactTokensForTokensSupportingFeeOnTransferTokens(
//         uint256 amountIn,
//         uint256 amountOutMin,
//         address[] calldata path,
//         address to,
//         uint256 deadline
//     ) external;

//     function swapExactAVAXForTokensSupportingFeeOnTransferTokens(
//         uint256 amountOutMin,
//         address[] calldata path,
//         address to,
//         uint256 deadline
//     ) external payable;

//     function swapExactTokensForAVAXSupportingFeeOnTransferTokens(
//         uint256 amountIn,
//         uint256 amountOutMin,
//         address[] calldata path,
//         address to,
//         uint256 deadline
//     ) external;
// }
