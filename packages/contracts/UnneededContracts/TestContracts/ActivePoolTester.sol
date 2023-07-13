// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

import "../ActivePool.sol";

contract ActivePoolTester is ActivePool {
    function unprotectedIncreaseSTARDebt(uint _amount) external {
        STARDebt = STARDebt.add(_amount);
    }

    function unprotectedPayable() external payable {
        // @KingYet: Commented
        // ETH = ETH.add(msg.value);
    }
}
