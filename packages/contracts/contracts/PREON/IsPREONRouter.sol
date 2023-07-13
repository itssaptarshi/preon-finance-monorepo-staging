// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.2;

// Interface for performing a swap within the sPREON contract
// Takes in STAR and swaps for PREON

interface IsPREONRouter {
    // Must require that the swap went through successfully with at least min preon out amounts out.
    function swap(
        uint256 _STARAmount,
        uint256 _minPREONOut,
        address _to
    ) external returns (uint256[] memory amounts);
}
