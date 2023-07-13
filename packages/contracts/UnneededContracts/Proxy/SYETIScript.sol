// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

import "../Dependencies/CheckContract.sol";
import "../Interfaces/ISPREON.sol";

contract SPREONScript is CheckContract {
    ISPREON immutable SPREON;

    constructor(address _sPREONAddress) public {
        checkContract(_sPREONAddress);
        SPREON = ISPREON(_sPREONAddress);
    }

    function stake(uint _PREONamount) external {
        SPREON.mint(_PREONamount);
    }
}
