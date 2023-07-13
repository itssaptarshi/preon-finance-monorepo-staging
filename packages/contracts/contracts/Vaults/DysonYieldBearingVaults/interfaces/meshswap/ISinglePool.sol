// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.2;

interface ISinglePool {
    function balanceOf(address _address) external view returns (uint256);

    function exchangeRateStored() external view returns (uint256);

    function withdrawToken(uint256 withdrawAmount) external;

    function claimReward() external;

    function depositToken(uint256 depositAmount) external;

    function token() external view returns (address);
}
