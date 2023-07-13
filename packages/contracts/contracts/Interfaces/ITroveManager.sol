// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

import "./ILiquityBase.sol";
import "./IStabilityPool.sol";
import "./ISTARToken.sol";
import "./IPREONToken.sol";
import "./IActivePool.sol";
import "./IDefaultPool.sol";

// Common interface for the Trove Manager.
interface ITroveManager is ILiquityBase {
    // --- Events ---

    event Redemption(
        uint _attemptedSTARAmount,
        uint _actualSTARAmount,
        uint STARfee,
        address[] tokens,
        uint[] amounts
    );
    event TroveLiquidated(
        address indexed _borrower,
        uint _debt,
        uint _coll,
        uint8 operation
    );
    event BaseRateUpdated(uint _baseRate);
    event LastFeeOpTimeUpdated(uint _lastFeeOpTime);
    event TotalStakesUpdated(address token, uint _newTotalStakes);
    // event SystemSnapshotsUpdated(
    //     uint _totalStakesSnapshot,
    //     uint _totalCollateralSnapshot
    // );
    // event LTermsUpdated(uint _L_ETH, uint _L_STARDebt);
    // event TroveSnapshotsUpdated(uint256 _unix);
    event TroveIndexUpdated(address _borrower, uint _newIndex);

    // --- Functions ---

    function setAddresses(
        address _borrowerOperationsAddress,
        address _activePoolAddress,
        address _defaultPoolAddress,
        address _sortedTrovesAddress,
        address _controllerAddress,
        address _troveManagerRedemptionsAddress,
        address _troveManagerLiquidationsAddress
    ) external;

    function getTroveOwnersCount() external view returns (uint);

    function getTroveFromTroveOwnersArray(
        uint _index
    ) external view returns (address);

    function getCurrentICR(address _borrower) external view returns (uint);

    function getCurrentAICR(address _borrower) external view returns (uint);

    function liquidate(address _borrower) external;

    function batchLiquidateTroves(
        address[] calldata _troveArray,
        address _liquidator
    ) external;

    function redeemCollateral(
        uint _STARAmount,
        uint _STARMaxFee,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint _partialRedemptionHintNICR,
        uint _maxIterations
    ) external;

    function redeemCollateralSingle(
        uint256 _STARamount,
        uint256 _STARMaxFee,
        address _target,
        address _upperHint,
        address _lowerHint,
        uint256 _hintAICR,
        address _collToRedeem
    ) external;

    function updateTroveRewardSnapshots(address _borrower) external;

    function addTroveOwnerToArray(
        address _borrower
    ) external returns (uint index);

    function applyPendingRewards(address _borrower) external;

    function getPendingCollRewards(
        address _borrower
    ) external view returns (address[] memory, uint[] memory);

    function getPendingSTARDebtReward(
        address _borrower
    ) external view returns (uint);

    function hasPendingRewards(address _borrower) external view returns (bool);

    function removeStakeAndCloseTrove(address _borrower) external;

    function updateTroveDebt(address _borrower, uint debt) external;

    function getRedemptionRate() external view returns (uint);

    function getRedemptionRateWithDecay() external view returns (uint);

    function getRedemptionFeeWithDecay(
        uint _ETHDrawn
    ) external view returns (uint);

    function getBorrowingRate() external view returns (uint);

    function getBorrowingRateWithDecay() external view returns (uint);

    function getBorrowingFee(uint STARDebt) external view returns (uint);

    function getBorrowingFeeWithDecay(
        uint _STARDebt
    ) external view returns (uint);

    function decayBaseRateFromBorrowingAndCalculateFee(
        uint256 _STARDebt
    ) external returns (uint);

    function getTroveStatus(address _borrower) external view returns (uint);

    function isTroveActive(address _borrower) external view returns (bool);

    function getTroveStake(
        address _borrower,
        address _token
    ) external view returns (uint);

    function getTotalStake(address _token) external view returns (uint);

    function getTroveDebt(address _borrower) external view returns (uint);

    function getL_Coll(address _token) external view returns (uint);

    function getL_STAR(address _token) external view returns (uint);

    function getRewardSnapshotColl(
        address _borrower,
        address _token
    ) external view returns (uint);

    function getRewardSnapshotSTAR(
        address _borrower,
        address _token
    ) external view returns (uint);

    function getTroveVC(address _borrower) external view returns (uint);

    function getTroveColls(
        address _borrower
    ) external view returns (address[] memory, uint[] memory);

    function getCurrentTroveState(
        address _borrower
    ) external view returns (address[] memory, uint[] memory, uint);

    function setTroveStatus(address _borrower, uint num) external;

    function updateTroveCollAndStakeAndTotalStakes(
        address _borrower,
        address[] memory _tokens,
        uint[] memory _amounts
    ) external;

    function increaseTroveDebt(
        address _borrower,
        uint _debtIncrease
    ) external returns (uint);

    function decreaseTroveDebt(
        address _borrower,
        uint _collDecrease
    ) external returns (uint);

    function getTCR() external view returns (uint);

    function checkRecoveryMode() external view returns (bool);

    function closeTroveRedemption(address _borrower) external;

    function closeTroveLiquidation(address _borrower) external;

    function removeStake(address _borrower) external;

    function updateBaseRate(uint newBaseRate) external;

    function calcDecayedBaseRate() external view returns (uint);

    function redistributeDebtAndColl(
        IActivePool _activePool,
        IDefaultPool _defaultPool,
        uint _debt,
        address[] memory _tokens,
        uint[] memory _amounts
    ) external;

    function updateSystemSnapshots_excludeCollRemainder(
        IActivePool _activePool,
        address[] memory _tokens,
        uint[] memory _amounts
    ) external;

    function getEntireDebtAndColls(
        address _borrower
    )
        external
        view
        returns (
            uint,
            address[] memory,
            uint[] memory,
            uint,
            address[] memory,
            uint[] memory
        );

    function updateTroves(
        address[] calldata _borrowers,
        address[] calldata _lowerHints,
        address[] calldata _upperHints
    ) external;

    function updateUnderCollateralizedTroves(address[] memory _ids) external;

    function getMCR() external view returns (uint256);

    function getCCR() external view returns (uint256);

    function getSTAR_GAS_COMPENSATION() external view returns (uint256);

    function getMIN_NET_DEBT() external view returns (uint256);

    function getBORROWING_FEE_FLOOR() external view returns (uint256);

    function getREDEMPTION_FEE_FLOOR() external view returns (uint256);
}
