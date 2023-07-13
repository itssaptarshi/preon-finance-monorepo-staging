// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

import "../DefaultPool.sol";

contract DefaultPoolTester is DefaultPool {
    function unprotectedIncreaseSTARDebt(uint _amount) external {
        STARDebt = STARDebt.add(_amount);
    }

    function unprotectedPayable() external payable {
        // @KingYet: Commented
        // ETH = ETH.add(msg.value);
    }

    function getEthAmount() external view returns (uint) {
        return poolColl.amounts[0];
    }

    function getCollateralVCC(address _collateral)
        external
        view
        returns (uint)
    {
        return whitelist.getValueVC(_collateral, getCollateral(_collateral));
    }
}
