// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

contract Destructible {
    receive() external payable {}

    function destruct(address payable _receiver) external {
        selfdestruct(_receiver);
    }
}
