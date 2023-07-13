// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

import "../TroveManager.sol";
import "../BorrowerOperations.sol";
import "../StabilityPool.sol";
import "../STARToken.sol";

contract EchidnaProxy {
    TroveManager troveManager;
    BorrowerOperations borrowerOperations;
    StabilityPool stabilityPool;
    STARToken starToken;

    constructor(
        TroveManager _troveManager,
        BorrowerOperations _borrowerOperations,
        StabilityPool _stabilityPool,
        STARToken _starToken
    ) public {
        troveManager = _troveManager;
        borrowerOperations = _borrowerOperations;
        stabilityPool = _stabilityPool;
        starToken = _starToken;
    }

    receive() external payable {
        // do nothing
    }

    // TroveManager

    function liquidatePrx(address _user) external {
        troveManager.liquidate(_user);
    }

    function liquidateTrovesPrx(uint _n) external {
        // pass
        // @KingPreon: we no longer have this function
        //        troveManager.liquidateTroves(_n);
    }

    function batchLiquidateTrovesPrx(address[] calldata _troveArray) external {
        troveManager.batchLiquidateTroves(_troveArray, msg.sender);
    }

    function redeemCollateralPrx(
        uint _STARAmount,
        uint _STARMaxFee,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint _partialRedemptionHintNICR,
        uint _maxIterations // uint _maxFee
    ) external {
        troveManager.redeemCollateral(
            _STARAmount,
            _STARMaxFee,
            _firstRedemptionHint,
            _upperPartialRedemptionHint,
            _lowerPartialRedemptionHint,
            _partialRedemptionHintNICR,
            _maxIterations
        );
    }

    // Borrower Operations
    // @KingPreon: changed parameters
    function openTrovePrx(
        uint _maxFeePercentage,
        uint _STARAmount,
        address _upperHint,
        address _lowerHint,
        address[] memory _colls,
        uint[] memory _amounts
    ) external payable {
        borrowerOperations.openTrove(
            _maxFeePercentage,
            _STARAmount,
            _upperHint,
            _lowerHint,
            _colls,
            _amounts
        );
    }

    // @KingPreon: changed params
    function addCollPrx(
        address[] memory _collsIn,
        uint[] memory _amountsIn,
        address _upperHint,
        address _lowerHint,
        uint _maxFeePercentage
    ) external payable {
        borrowerOperations.addColl(
            _collsIn,
            _amountsIn,
            _upperHint,
            _lowerHint,
            _maxFeePercentage
        );
    }

    function withdrawCollPrx(
        address[] memory _collsOut,
        uint[] memory _amountsOut,
        address _upperHint,
        address _lowerHint
    ) external {
        borrowerOperations.withdrawColl(
            _collsOut,
            _amountsOut,
            _upperHint,
            _lowerHint
        );
    }

    function withdrawSTARPrx(
        uint _amount,
        address _upperHint,
        address _lowerHint,
        uint _maxFee
    ) external {
        borrowerOperations.withdrawSTAR(
            _maxFee,
            _amount,
            _upperHint,
            _lowerHint
        );
    }

    function repaySTARPrx(
        uint _amount,
        address _upperHint,
        address _lowerHint
    ) external {
        borrowerOperations.repaySTAR(_amount, _upperHint, _lowerHint);
    }

    function closeTrovePrx() external {
        borrowerOperations.closeTrove();
    }

    function adjustTrovePrx(
        address[] memory _collsIn,
        uint[] memory _amountsIn,
        address[] memory _collsOut,
        uint[] memory _amountsOut,
        uint _STARChange,
        bool _isDebtIncrease,
        address _upperHint,
        address _lowerHint,
        uint _maxFeePercentage
    ) external {
        borrowerOperations.adjustTrove(
            _collsIn,
            _amountsIn,
            _collsOut,
            _amountsOut,
            _STARChange,
            _isDebtIncrease,
            _upperHint,
            _lowerHint,
            _maxFeePercentage
        );
    }

    // Pool Manager
    function provideToSPPrx(uint _amount, address _frontEndTag) external {
        stabilityPool.provideToSP(_amount, _frontEndTag);
    }

    function withdrawFromSPPrx(uint _amount) external {
        stabilityPool.withdrawFromSP(_amount);
    }

    // STAR Token

    function transferPrx(address recipient, uint256 amount)
        external
        returns (bool)
    {
        return starToken.transfer(recipient, amount);
    }

    function approvePrx(address spender, uint256 amount)
        external
        returns (bool)
    {
        return starToken.increaseAllowance(spender, amount);
    }

    function transferFromPrx(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool) {
        return starToken.transferFrom(sender, recipient, amount);
    }

    function increaseAllowancePrx(address spender, uint256 addedValue)
        external
        returns (bool)
    {
        require(starToken.approve(spender, 0));
        return starToken.increaseAllowance(spender, addedValue);
    }

    function decreaseAllowancePrx(address spender, uint256 subtractedValue)
        external
        returns (bool)
    {
        return starToken.decreaseAllowance(spender, subtractedValue);
    }
}
