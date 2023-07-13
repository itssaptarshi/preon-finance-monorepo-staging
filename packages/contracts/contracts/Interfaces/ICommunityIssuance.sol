// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

interface ICommunityIssuance {
    // --- Events ---

    event NewPreonIssued(uint256 _amountIssued);
    event TotalPREONIssuedUpdated(uint256 _totalPreonIssued);
    event NewRewardRate(uint256 _newRewardRate, uint256 _time);
    event RewardPaid(address _user, uint256 _reward);

    // --- Functions ---

    function setAddresses(
        address _preonTokenAddress,
        address _stabilityPoolAddress
    ) external;

    function setRate(uint256 _newRewardRate) external;

    function issuePREON() external returns (uint256);

    function sendPREON(address _account, uint256 _PREONamount) external;

    function getRewardRate() external view returns (uint256);
}
