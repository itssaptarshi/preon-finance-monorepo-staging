// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

interface IUnipool {
    function setParams(
        address _preonTokenAddress,
        address _uniTokenAddress,
        uint256 _duration
    ) external;

    function lastTimeRewardApplicable() external view returns (uint256);

    function rewardPerToken() external view returns (uint256);

    function earned(address account) external view returns (uint256);

    function withdrawAndClaim() external;

    function claimReward() external;
    //function notifyRewardAmount(uint256 reward) external;
}
