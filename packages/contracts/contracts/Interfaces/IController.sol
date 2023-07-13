// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

interface IController {
    function vePREONEEmissions() external view returns (address);

    function voter() external view returns (address);
}
