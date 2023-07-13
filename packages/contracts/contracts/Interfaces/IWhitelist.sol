// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

interface IWhitelist {
    function getValidCollateral() external view returns (address[] memory);

    function setAddresses(
        address _activePoolAddress,
        address _defaultPoolAddress,
        address _stabilityPoolAddress,
        address _collSurplusPoolAddress,
        address _borrowerOperationsAddress
    ) external;

    function getOracle(address _collateral) external view returns (address);

    function getSafetyRatio(address _collateral)
        external
        view
        returns (uint256);

    function getRecoveryRatio(address _collateral)
        external
        view
        returns (uint256);

    function getIsActive(address _collateral) external view returns (bool);

    function getPriceCurve(address _collateral) external view returns (address);

    function getDecimals(address _collateral) external view returns (uint256);

    function getFee(
        address _collateral,
        uint _collateralVCInput,
        uint256 _collateralVCBalancePost,
        uint256 _totalVCBalancePre,
        uint256 _totalVCBalancePost
    ) external view returns (uint256 fee);

    function getFeeAndUpdate(
        address _collateral,
        uint _collateralVCInput,
        uint256 _collateralVCBalancePost,
        uint256 _totalVCBalancePre,
        uint256 _totalVCBalancePost
    ) external returns (uint256 fee);

    function getIndex(address _collateral) external view returns (uint256);

    function isWrapped(address _collateral) external view returns (bool);

    function setDefaultRouter(address _collateral, address _router) external;

    function getValuesVC(address[] memory _collaterals, uint[] memory _amounts)
        external
        view
        returns (uint);

    function getValuesRVC(address[] memory _collaterals, uint[] memory _amounts)
        external
        view
        returns (uint);

    function getValuesVCforTCR(
        address[] memory _collaterals,
        uint[] memory _amounts
    ) external view returns (uint VC, uint256 VCforTCR);

    function getValuesUSD(address[] memory _collaterals, uint[] memory _amounts)
        external
        view
        returns (uint256);

    function getValueVC(address _collateral, uint _amount)
        external
        view
        returns (uint);

    function getValueRVC(address _collateral, uint _amount)
        external
        view
        returns (uint);

    function getValueVCforTCR(address _collateral, uint _amount)
        external
        view
        returns (uint VC, uint256 VCforTCR);

    function getValueUSD(address _collateral, uint _amount)
        external
        view
        returns (uint256);

    function getDefaultRouterAddress(address _collateral)
        external
        view
        returns (address);

    function getValidCaller(address _contract) external view returns (address);

    function isValidCaller(address _caller) external view returns (bool);
}
