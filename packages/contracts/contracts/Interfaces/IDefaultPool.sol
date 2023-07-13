// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

import "./IPool.sol";

interface IDefaultPool is IPool {
    // --- Events ---
    event DefaultPoolSTARDebtUpdated(uint256 _STARDebt);
    event DefaultPoolETHBalanceUpdated(uint256 _ETH);

    // --- Functions ---

    function sendCollsToActivePool(
        address[] memory _collaterals,
        uint256[] memory _amounts
    ) external;

    function addCollateralType(address _collateral) external;

    function getCollateralVC(address collateralAddress)
        external
        view
        returns (uint256);

    function getAmountsSubset(address[] memory _collaterals)
        external
        view
        returns (uint256[] memory amounts, uint256[] memory controllerIndices);

    function getAllAmounts() external view returns (uint256[] memory);
}
