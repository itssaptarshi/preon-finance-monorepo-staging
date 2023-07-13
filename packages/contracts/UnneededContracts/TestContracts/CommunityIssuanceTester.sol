// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

import "../PREON/CommunityIssuance.sol";

contract CommunityIssuanceTester is CommunityIssuance {
    function obtainPREON(uint _amount) external {
        preonToken.transfer(msg.sender, _amount);
    }

    function getCumulativeIssuanceFraction() external view returns (uint) {
        return _getCumulativeIssuanceFraction();
    }

    function unprotectedIssuePREON() external returns (uint) {
        // No checks on caller address

        uint latestTotalPREONIssued = PREONSupplyCap
            .mul(_getCumulativeIssuanceFraction())
            .div(DECIMAL_PRECISION);
        uint issuance = latestTotalPREONIssued.sub(totalPREONIssued);

        totalPREONIssued = latestTotalPREONIssued;
        return issuance;
    }
}
