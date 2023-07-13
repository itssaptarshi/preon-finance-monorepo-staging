// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;
//
import "../Dependencies/CheckContract.sol";
import "../Interfaces/IBorrowerOperations.sol";

contract BorrowerOperationsScript is CheckContract {
    IBorrowerOperations immutable borrowerOperations;

    constructor(IBorrowerOperations _borrowerOperations) public {
        checkContract(address(_borrowerOperations));
        borrowerOperations = _borrowerOperations;
    }

    function openTrove(
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

    function addColl(
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

    function withdrawColl(
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

    function withdrawSTAR(
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

    function repaySTAR(
        uint _amount,
        address _upperHint,
        address _lowerHint
    ) external {
        borrowerOperations.repaySTAR(_amount, _upperHint, _lowerHint);
    }

    function closeTrove() external {
        borrowerOperations.closeTrove();
    }

    function adjustTrove(
        address[] memory _collsIn,
        uint[] memory _amountsIn,
        address[] memory _collsOut,
        uint[] memory _amountsOut,
        uint _STARChange,
        bool _isDebtIncrease,
        address _upperHint,
        address _lowerHint,
        uint _maxFeePercentage
    ) external payable {
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

    function claimCollateral() external {
        borrowerOperations.claimCollateral();
    }
}
