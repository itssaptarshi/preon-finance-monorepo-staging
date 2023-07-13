// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

import "../Interfaces/ITroveManager.sol";
import "../Interfaces/IStabilityPool.sol";
import "../Interfaces/ICollSurplusPool.sol";
import "../Interfaces/ISTARToken.sol";
import "../Interfaces/ISortedTroves.sol";
import "../Interfaces/IPREONToken.sol";
import "../Interfaces/IActivePool.sol";
import "../Interfaces/ITroveManagerLiquidations.sol";
import "../Interfaces/ITroveManagerRedemptions.sol";
import "./LiquityBase.sol";

/**
 * Contains shared functionality of TroveManagerLiquidations, TroveManagerRedemptions, and TroveManager.
 * Keeps addresses to cache, events, structs, status, etc. Also keeps Trove struct.
 */

contract TroveManagerBase is LiquityBase {
    // --- Connected contract declarations ---

    // A doubly linked list of Troves, sorted by their sorted by their individual collateral ratios

    struct ContractsCache {
        IActivePool activePool;
        IDefaultPool defaultPool;
        ISTARToken starToken;
        ISortedTroves sortedTroves;
        ICollSurplusPool collSurplusPool;
        address gasPoolAddress;
        IPreonController controller;
    }

    enum Status {
        nonExistent,
        active,
        closedByOwner,
        closedByLiquidation,
        closedByRedemption
    }

    enum TroveManagerOperation {
        applyPendingRewards,
        liquidateInNormalMode,
        liquidateInRecoveryMode,
        redeemCollateral
    }

    // Store the necessary data for a trove
    struct Trove {
        newColls colls;
        uint debt;
        mapping(address => uint) stakes;
        Status status;
        uint128 arrayIndex;
    }

    event TroveUpdated(
        address indexed _borrower,
        uint _debt,
        address[] _tokens,
        uint[] _amounts,
        TroveManagerOperation operation
    );
    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
