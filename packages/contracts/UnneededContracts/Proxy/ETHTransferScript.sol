// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

contract ETHTransferScript {
    function transferETH(address _recipient, uint256 _amount)
        external
        returns (bool)
    {
        (bool success, ) = _recipient.call{value: _amount}("");
        return success;
    }
}
