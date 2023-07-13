// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

import "../Interfaces/IERC20.sol";
import "../Interfaces/IERC2612.sol";

interface ISTARToken is IERC20, IERC2612 {
    // --- Events ---

    event STARTokenBalanceUpdated(address _user, uint _amount);

    // --- Functions ---

    function mint(address _account, uint256 _amount) external;

    function burn(address _account, uint256 _amount) external;

    function sendToPool(
        address _sender,
        address poolAddress,
        uint256 _amount
    ) external;

    function returnFromPool(
        address poolAddress,
        address user,
        uint256 _amount
    ) external;

    function updateMinting(bool _canMint) external;

    function addValidMinter(address _newMinter) external;

    function removeValidMinter(address _minter) external;

    function setMaxSTARMintable(uint256 _maxSTARMintable) external;
}
