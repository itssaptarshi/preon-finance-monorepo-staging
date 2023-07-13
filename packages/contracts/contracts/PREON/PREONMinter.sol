// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "../lib/Math.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "../Interfaces/IUnderlying.sol";
import "../Interfaces/IVePreonEmissions.sol";
import "../Interfaces/IVe.sol";
import "../Interfaces/IFarm.sol";
import "../Interfaces/IController.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @title Codifies the minting rules as per ve(3,3),
///        abstracted from the token to support any token that allows minting
contract PREONMinter is Initializable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @dev Allows minting once per week (reset every Thursday 00:00 UTC)
    uint internal constant _WEEK = 86400 * 7;

    /// @dev Decrease base weekly emission by 2%
    uint internal constant _WEEKLY_EMISSION_DECREASE = 98;
    uint internal constant _WEEKLY_EMISSION_DECREASE_DENOMINATOR = 100;

    /// @dev No emissions after 491 weeks;
    uint internal periodEmissionsEnd;

    /// @dev The core parameter for determinate the whole emission dynamic.
    ///       Will be decreased every week.
    uint public WEEKLY_EMISSION;

    IUnderlying public token;
    
    address public controller;
    address public vePREONEmissions;
    uint public activePeriod;
    address public owner;

    event Mint(address indexed sender, uint weekly);

    function initialize(
        address controller_,
        address token_,
        address vePREONEmissions_
    ) public initializer {
        owner = msg.sender;
        token = IUnderlying(token_);
        vePREONEmissions = vePREONEmissions_;
        controller = controller_;
        activePeriod = ((block.timestamp + _WEEK) / _WEEK) * _WEEK;
        WEEKLY_EMISSION = 1e24;
    }

    function preReward() external {
        require(msg.sender == owner, "not authorized");
        // ! TODO: #pending need to check, if it is required or not.
        token.mint(address(this), 1000000e18);

        token.approve(controller, 1000000e18);
        IFarm(controller).notifyRewardAmount(address(token), 1000000e18);
        // IVePreonEmissions(vePREONEmissions).checkpointToken();
        // // checkpoint supply
        // IVePreonEmissions(vePREONEmissions).checkpointTotalSupply();
    }

    function setWeeklyEmissions(uint _weeklyEmissions) external {
        require(msg.sender == owner);
        WEEKLY_EMISSION = _weeklyEmissions;
    }

    /// @dev Update period can only be called once per cycle (1 week)
    function updatePeriod() external returns (uint) {
        uint _period = activePeriod;
        // only trigger if new week
        if (block.timestamp >= _period + _WEEK) {
            _period = (block.timestamp / _WEEK) * _WEEK;
            uint sinceLast = _period - activePeriod;
            uint emissionsMultiplier = sinceLast / _WEEK;
            activePeriod = _period;
            uint _weekly;
            if (emissionsMultiplier > 1) {
                for (uint i = 1; i <= emissionsMultiplier; i++) {
                    _weekly += WEEKLY_EMISSION;
                    WEEKLY_EMISSION =
                        (WEEKLY_EMISSION * _WEEKLY_EMISSION_DECREASE) /
                        _WEEKLY_EMISSION_DECREASE_DENOMINATOR;
                }
            } else {
                _weekly = WEEKLY_EMISSION;
                WEEKLY_EMISSION =
                    (_weekly * _WEEKLY_EMISSION_DECREASE) /
                    _WEEKLY_EMISSION_DECREASE_DENOMINATOR;
            }
            uint _required = _weekly;
            uint _balanceOf = token.balanceOf(address(this));
            if (_balanceOf < _required) {
                token.mint(address(this), _required - _balanceOf);
            }

            token.approve(controller, _weekly);
            IFarm(controller).notifyRewardAmount(address(token), _weekly);

            // // checkpoint token balance that was just minted in veDist
            // IVePreonEmissions(vePREONEmissions).checkpointToken();
            // // checkpoint supply
            // IVePreonEmissions(vePREONEmissions).checkpointTotalSupply();

            emit Mint(msg.sender, _weekly);
        }
        return _period;
    }
}
