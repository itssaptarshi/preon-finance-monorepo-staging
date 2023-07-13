// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.2;

import "./PVault.sol";
import "./interfaces/IGauge.sol";
import "./interfaces/IPenLens.sol";

/**
 * @notice JLPVault is the vault token for UniV2 LP token reward tokens like Trader Joe LP tokens.
 * It collects rewards from the master chef farm and distributes them to the
 * swap so that it can autocompound.
 */

contract MeshVault is PVault {
    uint256 public PID;
    IGauge public gauge;
    address dystAddress;

    function initialize(
        address _underlying,
        string memory _name,
        string memory _symbol,
        uint256 _adminFee,
        uint256 _callerFee,
        uint256 _maxReinvestStale,
        address _WAVAX,
        address _gaugeAddress,
        uint256 _PID,
        address _dystopiaRouter,
        address _dystAddress
    ) public {
        initialize(
            _underlying,
            _name,
            _symbol,
            _adminFee,
            _callerFee,
            _maxReinvestStale,
            _WAVAX,
            _dystopiaRouter
        );

        gauge = IGauge(_gaugeAddress);
        PID = _PID;
        dystAddress = _dystAddress;
        underlying.approve(_gaugeAddress, 2**256 - 1);
    }

    function receiptPerUnderlying() public view override returns (uint256) {
        if (totalSupply == 0) {
            return 10**(18 + 18 - underlyingDecimal);
        }
        return (1e18 * totalSupply) / gauge.balanceOf(address(this));
    }

    function underlyingPerReceipt() public view override returns (uint256) {
        if (totalSupply == 0) {
            return 10**underlyingDecimal;
        }
        return (1e18 * gauge.balanceOf(address(this))) / totalSupply;
    }

    function totalHoldings() public view override returns (uint256) {
        return gauge.balanceOf(address(this));
    }

    function _triggerDepositAction(uint256 _amt) internal override {
        gauge.deposit(_amt, 0);
    }

    function _triggerWithdrawAction(uint256 amtToReturn) internal override {
        gauge.withdraw(amtToReturn);
    }

    function _pullRewards() internal override {
        address[] memory dystAddressInArray = new address[](1);
        dystAddressInArray[0] = dystAddress;
        gauge.getReward(address(this), dystAddressInArray);
    }
}
