// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

// Common interface for the SortedTroves Doubly Linked List.
interface ISortedTroves {
    // --- Functions ---

    function setParams(
        uint256 _size,
        address _TroveManagerAddress,
        address _borrowerOperationsAddress,
        address _troveManagerRedemptionsAddress,
        address _preonControllerAddress
    ) external;

    function insert(
        address _id,
        uint256 _ICR,
        address _prevId,
        address _nextId,
        uint256 _feeAsPercentOfTotal
    ) external;

    function remove(address _id) external;

    function reInsert(
        address _id,
        uint256 _newICR,
        address _prevId,
        address _nextId
    ) external;

    function reInsertWithNewBoost(
        address _id,
        uint256 _newAICR,
        address _prevId,
        address _nextId,
        uint256 _feeAsPercentOfAddedVC,
        uint256 _addedVCIn,
        uint256 _VCBeforeAdjustment
    ) external;

    function contains(address _id) external view returns (bool);

    function isFull() external view returns (bool);

    function isEmpty() external view returns (bool);

    function getSize() external view returns (uint256);

    function getMaxSize() external view returns (uint256);

    function getFirst() external view returns (address);

    function getLast() external view returns (address);

    function getNode(address _id)
        external
        view
        returns (
            bool,
            address,
            address,
            uint256,
            uint256,
            uint256
        );

    function getNext(address _id) external view returns (address);

    function getPrev(address _id) external view returns (address);

    function getOldBoostedAICR(address _id) external view returns (uint256);

    function getTimeSinceBoostUpdated(address _id)
        external
        view
        returns (uint256);

    function getBoost(address _id) external view returns (uint256);

    function getDecayedBoost(address _id) external view returns (uint256);

    function getUnderCollateralizedTrovesSize() external view returns (uint256);

    function validInsertPosition(
        uint256 _ICR,
        address _prevId,
        address _nextId
    ) external view returns (bool);

    function findInsertPosition(
        uint256 _ICR,
        address _prevId,
        address _nextId
    ) external view returns (address, address);

    function changeBoostMinuteDecayFactor(uint256 _newBoostMinuteDecayFactor)
        external;

    function changeGlobalBoostMultiplier(uint256 _newGlobalBoostMultiplier)
        external;

    function updateUnderCollateralizedTrove(
        address _id,
        bool _isUnderCollateralized
    ) external;

    function reInsertMany(
        address[] memory _ids,
        uint256[] memory _newAICRs,
        address[] memory _prevIds,
        address[] memory _nextIds
    ) external;
}
