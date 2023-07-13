// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

interface IVePreonEmissions {
    function checkpointToken() external;

    function checkpointTotalSupply() external;

    function claim(uint _tokenId) external returns (uint);

    function checkpointEmissions() external;
}
