// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.2;

import "./Interfaces/IPriceFeed.sol";
import "./Dependencies/JoePair.sol";
import "./Dependencies/SafeMath.sol";
import "./Dependencies/UQ112x112.sol";

/*
 * PriceFeed for mainnet deployment, to be connected to Chainlink's live Collateral:USD aggregator reference
 * contract
 *
 * PriceFeed will just return the Chainlink feed price unless _chainlinkIsBroken() returns true
 * in which case it will just return lastGoodPrice
 */

contract STARPriceFeed is IPriceFeed {
    using UQ112x112 for uint224;
    using SafeMathJoe for uint256;
    IPriceFeed public MATICPriceFeed;
    JoePair public STARMATIC;
    address public STARToken;

    constructor(
        address LPToken,
        address _STARToken,
        address _MATICPriceFeed
    ) {
        STARMATIC = JoePair(LPToken);
        STARToken = _STARToken;
        MATICPriceFeed = IPriceFeed(_MATICPriceFeed);
    }

    function fetchPrice_v() external view override returns (uint256) {
        address t0 = STARMATIC.token0();

        (uint112 r0, uint112 r1, ) = STARMATIC.getReserves();
        uint256 MATICPrice = MATICPriceFeed.fetchPrice_v();
        
        if (t0 == STARToken) {
            return
                uint256(r1).mul(10**18).div(uint256(r0)).mul(MATICPrice).div(
                    10**18
                );
        } else {
            return
                uint256(r0).mul(10**18).div(uint256(r1)).mul(MATICPrice).div(
                    10**18
                );
        }
    }
}
