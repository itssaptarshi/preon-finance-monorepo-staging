// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

import "../Dependencies/CheckContract.sol";
import "../Interfaces/ITroveManager.sol";

contract TroveManagerScript is CheckContract {
    bytes32 public constant NAME = "TroveManagerScript";

    ITroveManager immutable troveManager;

    constructor(ITroveManager _troveManager) public {
        checkContract(address(_troveManager));
        troveManager = _troveManager;
    }

    function redeemCollateral(
        uint _STARAmount,
        uint _STARMaxFee,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint _partialRedemptionHintNICR,
        uint _maxIterations
    )
        external
        returns (
            // uint _maxFee
            uint
        )
    {
        troveManager.redeemCollateral(
            _STARAmount,
            _STARMaxFee,
            _firstRedemptionHint,
            _upperPartialRedemptionHint,
            _lowerPartialRedemptionHint,
            _partialRedemptionHintNICR,
            _maxIterations
            // _maxFee
        );
    }
}
