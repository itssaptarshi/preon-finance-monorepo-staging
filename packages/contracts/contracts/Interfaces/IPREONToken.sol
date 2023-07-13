// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "./IERC20.sol";
import "./IERC2612.sol";

interface IPREONToken is IERC20, IERC2612 {
    function getDeploymentStartTime() external view returns (uint256);
}
