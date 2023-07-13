// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "../Interfaces/IFarm.sol";
import "../Interfaces/IERC721.sol";
import "./MultiRewardsPoolBase.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "../Interfaces/IVePREON.sol";

/// @title Gauges are used to incentivize pools, they emit reward tokens over 7 days for staked LP tokens
contract BoostedFarm is
    IFarm,
    ReentrancyGuardUpgradeable,
    MultiRewardsPoolBase
{
    using SafeERC20 for IERC20;

    /// @dev The ve token used for gauges
    address public ve;

    mapping(address => uint) public tokenIds;

    event VeTokenLocked(address indexed account, uint tokenId);
    event VeTokenUnlocked(address indexed account, uint tokenId);

    function initialize(
        address _stake,
        address _ve,
        address[] memory _allowedRewardTokens
    ) public override initializer {
        __ReentrancyGuard_init();
        MultiRewardsPoolBase.initialize(
            _stake,
            msg.sender,
            _allowedRewardTokens
        );
        ve = _ve;
    }

    // * ============================================== * //
    // * =============== EXTERNALS ==================== * //
    // * ============================================== * //

    function deposit(uint amount, uint tokenId) public {
        if (tokenId > 0) {
            _lockVeToken(msg.sender, tokenId);
        }
        _deposit(amount);
        // IVePREON(ve).emitDeposit(tokenId, msg.sender, amount);
    }

    function withdraw(uint amount) public {
        uint tokenId = 0;
        if (amount == balanceOf[msg.sender]) {
            tokenId = tokenIds[msg.sender];
        }
        withdrawToken(amount, tokenId);
        // IVePREON(ve).emitWithdraw(tokenId, msg.sender, amount);
    }

    function notifyRewardAmount(address token, uint amount) external override {
        _notifyRewardAmount(token, amount);
    }

    function getReward(address account, address[] memory tokens) external {
        require(msg.sender == account || msg.sender == ve, "Forbidden");
        // IVePREON(ve).distribute(address(this));
        _getReward(account, tokens, account);
    }

    function depositAll(uint tokenId) external {
        deposit(IERC20(underlying).balanceOf(msg.sender), tokenId);
    }

    function withdrawAll() external {
        withdraw(balanceOf[msg.sender]);
    }

    function withdrawToken(uint amount, uint tokenId) internal {
        if (tokenId > 0) {
            _unlockVeToken(msg.sender, tokenId);
        }
        _withdraw(amount);
    }

    // * ============================================== * //
    // * =============== INTERNALS ==================== * //
    // * ============================================== * //

    /// @dev Balance should be recalculated after the lock
    ///      For locking a new ve token withdraw all funds and deposit again
    function _lockVeToken(address account, uint tokenId) internal {
        require(IVePREON(ve).ownerOf(tokenId) == account, "Not ve token owner");
        if (tokenIds[account] == 0) {
            tokenIds[account] = tokenId;
            if (tokenId > 0) {
                IVePREON(ve).attachToken(tokenId);
            }
        }
        require(tokenIds[account] == tokenId, "Wrong token");
        emit VeTokenLocked(account, tokenId);
    }

    /// @dev Balance should be recalculated after the unlock
    function _unlockVeToken(address account, uint tokenId) internal {
        require(tokenId == tokenIds[account], "Wrong token");
        tokenIds[account] = 0;
        if (tokenId > 0) {
            IVePREON(ve).detachToken(tokenId);
        }
        // IVePREON(ve).detachTokenFromGauge(tokenId, account);
        emit VeTokenUnlocked(account, tokenId);
    }

    /// @dev Similar to Curve https://resources.curve.fi/reward-gauges/boosting-your-crv-rewards#formula
    function _derivedBalance(
        address account
    ) internal view override returns (uint) {
        uint _balance = balanceOf[account];
        uint _derived = (_balance * 40) / 100;
        if (underlying != IVePREON(ve).token()) {
            return _derived;
        }
        uint _tokenId = tokenIds[account];
        uint _adjusted = 0;
        uint _supply = IERC20(ve).totalSupply();
        if (account == IVePREON(ve).ownerOf(_tokenId) && _supply > 0) {
            _adjusted =
                (((totalSupply * IVePREON(ve).balanceOfNFT(_tokenId)) /
                    _supply) * 60) /
                100;
        }
        return Math.min((_derived + _adjusted), _balance);
    }
}
