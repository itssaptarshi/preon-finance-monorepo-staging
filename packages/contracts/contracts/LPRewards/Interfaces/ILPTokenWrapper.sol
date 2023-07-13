// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

interface ILPTokenWrapper {
    function stake(uint256 amount) external;

    function withdraw(uint256 amount) external;

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);
}
