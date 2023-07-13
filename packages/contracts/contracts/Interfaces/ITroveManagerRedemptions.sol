// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

interface ITroveManagerRedemptions {
    function redeemCollateral(
        uint _STARamount,
        uint _STARMaxFee,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint _partialRedemptionHintNICR,
        uint _maxIterations,
        address _redeemSender
    ) external;

    function redeemCollateralSingle(
        uint256 _STARamount,
        uint256 _STARMaxFee,
        address _target,
        address _upperHint,
        address _lowerHint,
        uint256 _hintAICR,
        address _collToRedeem,
        address _redeemer
    ) external;

    function updateRedemptionsEnabled(bool _enabled) external;
}
