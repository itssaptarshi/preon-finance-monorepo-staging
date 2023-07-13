// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

import "../Dependencies/SafeMath.sol";
import "../Dependencies/LiquityMath.sol";
import "../Interfaces/IERC20.sol";
import "../Interfaces/IBorrowerOperations.sol";
import "../Interfaces/ITroveManager.sol";
import "../Interfaces/IStabilityPool.sol";
import "../Interfaces/IPriceFeed.sol";
import "../Interfaces/ISPREON.sol";
import "./BorrowerOperationsScript.sol";
import "./ETHTransferScript.sol";
import "./SPREONScript.sol";

contract BorrowerWrappersScript is
    BorrowerOperationsScript,
    ETHTransferScript,
    SPREONScript
{
    using SafeMath for uint;

    bytes32 public constant NAME = "BorrowerWrappersScript";

    ITroveManager immutable troveManager;
    IStabilityPool immutable stabilityPool;
    IERC20 immutable starToken;
    IERC20 immutable preonToken;
    ISPREON immutable sPREON;

    constructor(
        address _borrowerOperationsAddress,
        address _troveManagerAddress,
        address _sPREONAddress
    )
        public
        BorrowerOperationsScript(
            IBorrowerOperations(_borrowerOperationsAddress)
        )
        SPREONScript(_sPREONAddress)
    {
        checkContract(_troveManagerAddress);
        ITroveManager troveManagerCached = ITroveManager(_troveManagerAddress);
        troveManager = troveManagerCached;

        IStabilityPool stabilityPoolCached = troveManagerCached.stabilityPool();
        checkContract(address(stabilityPoolCached));
        stabilityPool = stabilityPoolCached;

        //        IPriceFeed priceFeedCached = troveManagerCached.priceFeed();
        //        checkContract(address(priceFeedCached));
        //        priceFeed = priceFeedCached;

        address starTokenCached = address(troveManagerCached.starToken());
        checkContract(starTokenCached);
        starToken = IERC20(starTokenCached);

        address preonTokenCached = address(troveManagerCached.preonToken());
        checkContract(preonTokenCached);
        preonToken = IERC20(preonTokenCached);

        ISPREON sPREONCached = troveManagerCached.sPREON();
        require(
            _sPREONAddress == address(sPREONCached),
            "BorrowerWrappersScript: Wrong SPREON address"
        );
        sPREON = sPREONCached;
    }

    //    function claimCollateralAndOpenTrove(uint _maxFee, uint _STARAmount, address _upperHint, address _lowerHint) external payable {
    //        uint balanceBefore = address(this).balance;
    //
    //        // Claim collateral
    //        borrowerOperations.claimCollateral();
    //
    //        uint balanceAfter = address(this).balance;
    //
    //        // already checked in CollSurplusPool
    //        assert(balanceAfter > balanceBefore);
    //
    //        uint totalCollateral = balanceAfter.sub(balanceBefore).add(msg.value);
    //
    //        // Open trove with obtained collateral, plus collateral sent by user
    //        borrowerOperations.openTrove{ value: totalCollateral }(_maxFee, _STARAmount, _upperHint, _lowerHint);
    //    }
    //
    //    function claimSPRewardsAndRecycle(uint _maxFee, address _upperHint, address _lowerHint) external {
    //        uint collBalanceBefore = address(this).balance;
    //        uint preonBalanceBefore = preonToken.balanceOf(address(this));
    //
    //        // Claim rewards
    //        stabilityPool.withdrawFromSP(0);
    //
    //        uint collBalanceAfter = address(this).balance;
    //        uint preonBalanceAfter = preonToken.balanceOf(address(this));
    //        uint claimedCollateral = collBalanceAfter.sub(collBalanceBefore);
    //
    //        // Add claimed ETH to trove, get more STAR and stake it into the Stability Pool
    //        if (claimedCollateral != 0) {
    //            _requireUserHasTrove(address(this));
    //            uint STARAmount = _getNetSTARAmount(claimedCollateral);
    //            borrowerOperations.adjustTrove{ value: claimedCollateral }(_maxFee, 0, STARAmount, true, _upperHint, _lowerHint);
    //            // Provide withdrawn STAR to Stability Pool
    //            if (STARAmount != 0) {
    //                stabilityPool.provideToSP(STARAmount, address(0));
    //            }
    //        }
    //
    //        // Stake claimed PREON
    //        uint claimedPREON = preonBalanceAfter.sub(preonBalanceBefore);
    //        if (claimedPREON != 0) {
    //             .stake(claimedPREON);
    //        }
    //    }
    //
    //    function claimStakingGainsAndRecycle(uint _maxFee, address _upperHint, address _lowerHint) external {
    //        uint collBalanceBefore = address(this).balance;
    //        uint starBalanceBefore = starToken.balanceOf(address(this));
    //        uint preonBalanceBefore = preonToken.balanceOf(address(this));
    //
    //        // Claim gains
    //        sPREON.unstake(0);
    //
    //        uint gainedCollateral = address(this).balance.sub(collBalanceBefore); // stack too deep issues :'(
    //        uint gainedSTAR = starToken.balanceOf(address(this)).sub(starBalanceBefore);
    //
    //        uint netSTARAmount;
    //        // Top up trove and get more STAR, keeping ICR constant
    //        if (gainedCollateral != 0) {
    //            _requireUserHasTrove(address(this));
    //            netSTARAmount = _getNetSTARAmount(gainedCollateral);
    //            borrowerOperations.adjustTrove{ value: gainedCollateral }(_maxFee, 0, netSTARAmount, true, _upperHint, _lowerHint);
    //        }
    //
    //        uint totalSTAR = gainedSTAR.add(netSTARAmount);
    //        if (totalSTAR != 0) {
    //            stabilityPool.provideToSP(totalSTAR, address(0));
    //
    //            // Providing to Stability Pool also triggers PREON claim, so stake it if any
    //            uint preonBalanceAfter = preonToken.balanceOf(address(this));
    //            uint claimedPREON = preonBalanceAfter.sub(preonBalanceBefore);
    //            if (claimedPREON != 0) {
    //                sPREON.mint(claimedPREON);
    //            }
    //        }
    //
    //    }
    //
    //    function _getNetSTARAmount(uint _collateral) internal returns (uint) {
    //        uint price = priceFeed.fetchPrice();
    //        uint ICR = troveManager.getCurrentICR(address(this), price);
    //
    //        uint STARAmount = _collateral.mul(price).div(ICR);
    //        uint borrowingRate = troveManager.getBorrowingRateWithDecay();
    //        uint netDebt = STARAmount.mul(LiquityMath.DECIMAL_PRECISION).div(LiquityMath.DECIMAL_PRECISION.add(borrowingRate));
    //
    //        return netDebt;
    //    }

    function _requireUserHasTrove(address _depositor) internal view {
        require(
            troveManager.isTroveActive(_depositor),
            "BorrowerWrappersScript: caller must have an active trove"
        );
    }
}
