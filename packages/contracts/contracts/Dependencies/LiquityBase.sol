// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

import "./PreonMath.sol";
import "./SafeMath.sol";
import "../Interfaces/IActivePool.sol";
import "../Interfaces/IDefaultPool.sol";
import "../Interfaces/ILiquityBase.sol";
import "./PreonCustomBase.sol";

/**
 * Base contract for TroveManager, TroveManagerLiquidations, TroveManagerRedemptions,
 * and BorrowerOperations.
 * Contains global system constants and common functions.
 */
contract LiquityBase is ILiquityBase, PreonCustomBase {
    using SafeMath for uint256;

    // Minimum collateral ratio for individual troves
    uint internal constant MCR = 11e17; // 110%

    // Critical system collateral ratio. If the system's total collateral ratio (TCR) falls below the CCR, Recovery Mode is triggered.
    uint internal constant CCR = 15e17; // 150%

    // Amount of STAR to be locked in gas pool on opening troves
    // This STAR goes to the liquidator in the event the trove is liquidated.
    uint internal constant STAR_GAS_COMPENSATION = 200e18;

    // Minimum amount of net STAR debt a must have
    uint internal constant MIN_NET_DEBT = 1800e18;

    // Minimum fee on issuing new debt, paid in STAR
    uint internal constant BORROWING_FEE_FLOOR = (DECIMAL_PRECISION / 1000) * 5; // 0.5%

    // Minimum fee paid on redemption, paid in STAR
    uint internal constant REDEMPTION_FEE_FLOOR =
        (DECIMAL_PRECISION / 1000) * 5; // 0.5%

    IActivePool internal activePool;

    IDefaultPool internal defaultPool;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[48] private __gap;

    // --- Gas compensation functions ---

    /**
     * @notice Returns the total debt of a trove (net debt + gas compensation)
     * @dev The net debt is how much STAR the user can actually withdraw from the system.
     * The composite debt is the trove's total debt and is used for ICR calculations
     * @return Trove withdrawable debt (net debt) plus STAR_GAS_COMPENSATION
     */
    function _getCompositeDebt(uint _debt) internal pure returns (uint) {
        return _debt.add(STAR_GAS_COMPENSATION);
    }

    /**
     * @notice Returns the net debt, which is total (composite) debt of a trove minus gas compensation
     * @dev The net debt is how much STAR the user can actually withdraw from the system.
     * @return Trove total debt minus the gas compensation
     */
    function _getNetDebt(uint _debt) internal pure returns (uint) {
        return _debt.sub(STAR_GAS_COMPENSATION);
    }

    /**
     * @notice Return the system's Total Virtual Coin Balance
     * @dev Virtual Coins are a way to keep track of the system collateralization given
     * the collateral ratios of each collateral type
     * @return System's Total Virtual Coin Balance
     */
    function getEntireSystemColl() public view returns (uint) {
        return activePool.getVCSystem();
    }

    /**
     * @notice Calculate and return the System's Total Debt
     * @dev Includes debt held by active troves (activePool.getSTARDebt())
     * as well as debt from liquidated troves that has yet to be redistributed
     * (defaultPool.getSTARDebt())
     * @return Return the System's Total Debt
     */
    function getEntireSystemDebt() public view override returns (uint) {
        uint activeDebt = activePool.getSTARDebt();
        uint closedDebt = defaultPool.getSTARDebt();
        return activeDebt.add(closedDebt);
    }

    /**
     * @notice Calculate ICR given collaterals and debt
     * @dev ICR = VC(colls) / debt
     * @return ICR Return ICR of the given _colls and _debt
     */
    function _getICRColls(newColls memory _colls, uint _debt)
        internal
        view
        returns (uint ICR)
    {
        uint totalVC = _getVCColls(_colls);
        ICR = _computeCR(totalVC, _debt);
    }

    /**
     * @notice Calculate and AICR of the colls
     * @dev AICR = RVC(colls) / debt. Calculation is the same as
     * ICR except the collateral weights are different
     * @return AICR Return AICR of the given _colls and _debt
     */
    function _getAICRColls(newColls memory _colls, uint _debt)
        internal
        view
        returns (uint AICR)
    {
        uint totalRVC = _getRVCColls(_colls);
        AICR = _computeCR(totalRVC, _debt);
    }

    /**
     * @notice Calculate ICR given collaterals and debt
     * @dev ICR = VC(colls) / debt
     * @return ICR Return ICR of the given _colls and _debt
     */
    function _getICR(
        address[] memory _tokens,
        uint[] memory _amounts,
        uint _debt
    ) internal view returns (uint ICR) {
        uint totalVC = _getVC(_tokens, _amounts);
        ICR = _computeCR(totalVC, _debt);
    }

    /**
     * @notice Calculate and AICR of the colls
     * @dev AICR = RVC(colls) / debt. Calculation is the same as
     * ICR except the collateral weights are different
     * @return AICR Return AICR of the given _colls and _debt
     */
    function _getAICR(
        address[] memory _tokens,
        uint[] memory _amounts,
        uint _debt
    ) internal view returns (uint AICR) {
        uint totalRVC = _getRVC(_tokens, _amounts);
        AICR = _computeCR(totalRVC, _debt);
    }

    function _getVC(address[] memory _tokens, uint[] memory _amounts)
        internal
        view
        returns (uint totalVC)
    {
        totalVC = controller.getValuesVC(_tokens, _amounts);
    }

    function _getRVC(address[] memory _tokens, uint[] memory _amounts)
        internal
        view
        returns (uint totalRVC)
    {
        totalRVC = controller.getValuesRVC(_tokens, _amounts);
    }

    function _getVCColls(newColls memory _colls)
        internal
        view
        returns (uint totalVC)
    {
        totalVC = controller.getValuesVC(_colls.tokens, _colls.amounts);
    }

    function _getRVCColls(newColls memory _colls)
        internal
        view
        returns (uint totalRVC)
    {
        totalRVC = controller.getValuesRVC(_colls.tokens, _colls.amounts);
    }

    function _getUSDColls(newColls memory _colls)
        internal
        view
        returns (uint totalUSDValue)
    {
        totalUSDValue = controller.getValuesUSD(_colls.tokens, _colls.amounts);
    }

    function _getTCR() internal view returns (uint TCR) {
        (, uint256 entireSystemRVC) = activePool.getVCAndRVCSystem();
        uint256 entireSystemDebt = getEntireSystemDebt();
        TCR = _computeCR(entireSystemRVC, entireSystemDebt);
    }

    /**
     * @notice Returns recovery mode bool as well as entire system coll
     * @dev Do these together to avoid looping.
     * @return recMode Recovery mode bool
     * @return entireSystemCollVC System's Total Virtual Coin Balance
     * @return entireSystemCollRVC System's total Recovery ratio adjusted VC balance
     * @return entireSystemDebt System's total debt
     */
    function _checkRecoveryModeAndSystem()
        internal
        view
        returns (
            bool recMode,
            uint256 entireSystemCollVC,
            uint256 entireSystemCollRVC,
            uint256 entireSystemDebt
        )
    {
        (entireSystemCollVC, entireSystemCollRVC) = activePool
            .getVCAndRVCSystem();
        entireSystemDebt = getEntireSystemDebt();
        // Check TCR < CCR
        recMode = _computeCR(entireSystemCollRVC, entireSystemDebt) < CCR;
    }

    function _checkRecoveryMode() internal view returns (bool) {
        return _getTCR() < CCR;
    }

    // fee and amount are denominated in dollar
    function _requireUserAcceptsFee(
        uint _fee,
        uint _amount,
        uint _maxFeePercentage
    ) internal pure {
        return;
        uint feePercentage = _fee.mul(DECIMAL_PRECISION).div(_amount);
        require(feePercentage <= _maxFeePercentage, "Fee > max");
    }

    // checks coll has a nonzero balance of at least one token in coll.tokens
    function _collsIsNonZero(newColls memory _colls)
        internal
        pure
        returns (bool)
    {
        uint256 tokensLen = _colls.tokens.length;
        for (uint256 i; i < tokensLen; ++i) {
            if (_colls.amounts[i] != 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Calculates a new collateral ratio if debt is not 0 or the max uint256 value if it is 0
     * @dev Return the maximal value for uint256 if the Trove has a debt of 0. Represents "infinite" CR.
     * @param _coll Collateral
     * @param _debt Debt of Trove
     * @return The new collateral ratio if debt is greater than 0, max value of uint256 if debt is 0
     */
    function _computeCR(uint _coll, uint _debt) internal pure returns (uint) {
        if (_debt != 0) {
            uint newCollRatio = _coll.mul(1e18).div(_debt);
            return newCollRatio;
        } else {
            return 2**256 - 1;
        }
    }
}
