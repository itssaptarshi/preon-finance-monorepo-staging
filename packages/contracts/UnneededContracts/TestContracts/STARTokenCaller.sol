// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

import "../Interfaces/ISTARToken.sol";

contract STARTokenCaller {
    ISTARToken STAR;

    function setSTAR(ISTARToken _STAR) external {
        STAR = _STAR;
    }

    function starMint(address _account, uint _amount) external {
        STAR.mint(_account, _amount);
    }

    function starBurn(address _account, uint _amount) external {
        STAR.burn(_account, _amount);
    }

    function starSendToPool(
        address _sender,
        address _poolAddress,
        uint256 _amount
    ) external {
        STAR.sendToPool(_sender, _poolAddress, _amount);
    }

    function starReturnFromPool(
        address _poolAddress,
        address _receiver,
        uint256 _amount
    ) external {
        STAR.returnFromPool(_poolAddress, _receiver, _amount);
    }
}
