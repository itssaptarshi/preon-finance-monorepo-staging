// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.2;

import "../Interfaces/IPriceFeed.sol";
import "../Dependencies/JoePair.sol";
import "../Dependencies/UQ112x112.sol";
import "../Dependencies/SafeMath.sol";

contract PREONPriceFeed is IPriceFeed {
    using UQ112x112 for uint224;
    using SafeMathJoe for uint256;
    IPriceFeed public MATICPriceFeed;
    JoePair public PREONMATIC;
    address public PREONToken;

    constructor(address LPToken, address _PREONToken, address _MATICPriceFeed) {
        PREONMATIC = JoePair(LPToken);
        PREONToken = _PREONToken;
        MATICPriceFeed = IPriceFeed(_MATICPriceFeed);
    }

    function fetchPrice_v() external view override returns (uint256) {
        address t0 = PREONMATIC.token0();

        (uint112 r0, uint112 r1, ) = PREONMATIC.getReserves();
        uint256 MATICPrice = MATICPriceFeed.fetchPrice_v();

        if (t0 == PREONToken) {
            return
                uint256(r1).mul(10 ** 18).div(uint256(r0)).mul(MATICPrice).div(
                    10 ** 18
                );
        } else {
            return
                uint256(r0).mul(10 ** 18).div(uint256(r1)).mul(MATICPrice).div(
                    10 ** 18
                );
        }
    }
}
