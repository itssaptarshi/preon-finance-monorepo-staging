// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

interface IFeeCurve {
    function setAddresses(address _controllerAddress) external;

    function setDecayTime(uint _decayTime) external;

    function setDollarCap(uint _dollarCap) external;

    function initialized() external view returns (bool);

    /**
     * Returns fee based on inputted collateral VC balance and total VC balance of system.
     * fee is in terms of percentage * 1e18.
     * If the fee were 1%, this would be 0.01 * 1e18 = 1e16
     */
    function getFee(
        uint256 _collateralVCInput,
        uint256 _collateralVCBalancePost,
        uint256 _totalVCBalancePre,
        uint256 _totalVCBalancePost
    ) external view returns (uint256 fee);

    // Same function, updates the fee as well. Called only by controller.
    function getFeeAndUpdate(
        uint256 _collateralVCInput,
        uint256 _totalCollateralVCBalance,
        uint256 _totalVCBalancePre,
        uint256 _totalVCBalancePost
    ) external returns (uint256 fee);

    // Function for setting the old fee curve's last fee cap / value to the new fee cap / value.
    // Called only by controller.
    function setFeeCapAndTime(uint256 _lastFeePercent, uint256 _lastFeeTime)
        external;

    // Gets the fee cap and time currently. Used for setting new values for next fee curve.
    // returns lastFeePercent, lastFeeTime
    function getFeeCapAndTime()
        external
        view
        returns (uint256 _lastFeePercent, uint256 _lastFeeTime);

    /**
     * Returns fee based on decay since last fee calculation, which we take to be
     * a reasonable fee amount. If it has decayed a certain amount since then, we let
     * the new fee amount slide.
     */
    function calculateDecayedFee() external view returns (uint256 fee);
}
