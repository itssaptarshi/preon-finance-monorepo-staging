// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

// Common interface for the Trove Manager.
interface IBorrowerOperations {
    // --- Functions ---

    function setAddresses(
        address _troveManagerAddress,
        address _activePoolAddress,
        address _defaultPoolAddress,
        address _gasPoolAddress,
        address _collSurplusPoolAddress,
        address _sortedTrovesAddress,
        address _starTokenAddress,
        address _controllerAddress
    ) external;

    function openTrove(
        uint _maxFeePercentage,
        uint _STARAmount,
        address _upperHint,
        address _lowerHint,
        address[] calldata _colls,
        uint[] calldata _amounts
    ) external;

    function openTroveLeverUp(
        uint256 _maxFeePercentage,
        uint256 _STARAmount,
        address _upperHint,
        address _lowerHint,
        address[] memory _colls,
        uint256[] memory _amounts,
        uint256[] memory _leverages,
        uint256[] memory _maxSlippages
    ) external;

    function closeTroveUnlever(
        address[] memory _collsOut,
        uint256[] memory _amountsOut,
        uint256[] memory _maxSlippages
    ) external;

    function closeTrove() external;

    function adjustTrove(
        address[] calldata _collsIn,
        uint[] calldata _amountsIn,
        address[] calldata _collsOut,
        uint[] calldata _amountsOut,
        uint _STARChange,
        bool _isDebtIncrease,
        address _upperHint,
        address _lowerHint,
        uint _maxFeePercentage
    ) external;

    // function addColl(address[] memory _collsIn, uint[] memory _amountsIn, address _upperHint, address _lowerHint, uint _maxFeePercentage) external;

    function addCollLeverUp(
        address[] memory _collsIn,
        uint256[] memory _amountsIn,
        uint256[] memory _leverages,
        uint256[] memory _maxSlippages,
        uint256 _STARAmount,
        address _upperHint,
        address _lowerHint,
        uint256 _maxFeePercentage
    ) external;

    function withdrawCollUnleverUp(
        address[] memory _collsOut,
        uint256[] memory _amountsOut,
        uint256[] memory _maxSlippages,
        uint256 _STARAmount,
        address _upperHint,
        address _lowerHint
    ) external;
}
