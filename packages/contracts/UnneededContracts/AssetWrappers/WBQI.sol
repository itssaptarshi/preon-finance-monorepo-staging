// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

import "./ERC20_8.sol";
import "./Interfaces/IWAsset.sol";

interface IRewarder {}

// interface IQiToken{}
interface IComptroller {
    function claimReward(
        uint8 rewardType,
        address payable holder,
        address[] memory qiTokens
    ) external;

    function claimReward(uint8 rewardType, address payable holder) external;
}

// ----------------------------------------------------------------------------
// Wrapped qiToken Contract (represents deposited assets on Benqi earning Qi + AVAX Rewards)
// ----------------------------------------------------------------------------
contract WBQI is ERC20_8, IWAsset {
    IERC20 public Qtoken;
    IERC20 public QI;
    address[] qiTokens = new address[](1);
    IComptroller public _Comptroller;
    // uint public _poolPid;
    bool lock;
    address internal activePool;
    address internal TML;
    address internal TMR;
    address internal defaultPool;
    address internal stabilityPool;
    address internal PreonFinanceTreasury;
    address internal borrowerOperations;
    address internal collSurplusPool;
    uint public SHAREOFFSET = 1e12;
    bool internal addressesSet;

    struct UserInfo {
        uint256 amount; // How many LP tokens the user has provided.
        uint256 snapshotAVAX; // Current reward balance: numerator
        uint256 snapshotQI; // Current reward balance: numerator
        uint256 outstandingShares; // Current outstanding shares of QItoken wrapped
        uint256 pendingAVAXReward; // Current pending reward balance
        uint256 pendingQIReward; // Current pending reward balance
        // To calculate a user's reward share we need to know how much of the rewards has been provided when they wrap their QItoken.
        // We can calculate the initial rewardAmount per share as rewardAmount / outstandingShares.
        // Upon unwrapping we can calculate the rewards they are entitled to as amount * ((newRewardAmout / newOutstandingShares)-(initialRewardAmount/initialOutstandingShares)).
        uint256 amountInPreon;
    }

    // Info of each user that stakes LP tokens.
    mapping(address => UserInfo) userInfo;

    // Global rewards (numerator) that accounts for rewards/share paid out
    // Basically balanceOf(this)-globalAVAXRewardPending=cumulativePendingRewards
    uint public globalAVAXRewardPending;
    uint public globalQIRewardPending;

    /* ========== INITIALIZER ========== */

    constructor(
        string memory ERC20_symbol,
        string memory ERC20_name,
        uint8 ERC20_decimals,
        IERC20 _QiToken,
        IERC20 _QI,
        IComptroller Comptroller // uint256 poolPid
    ) {
        _symbol = ERC20_symbol;
        _name = ERC20_name;
        _decimals = ERC20_decimals;
        _totalSupply = 0;

        Qtoken = _QiToken;
        QI = _QI;

        _Comptroller = Comptroller;
        // _poolPid = poolPid;

        qiTokens[0] = address(Qtoken);
    }

    function setAddresses(
        address _activePool,
        address _TML,
        address _TMR,
        address _defaultPool,
        address _stabilityPool,
        address _PreonFinanceTreasury,
        address _borrowerOperations,
        address _collSurplusPool
    ) external {
        require(!addressesSet, "setAddresses: Addresses already set");
        checkContract(_activePool);
        checkContract(_TML);
        checkContract(_TMR);
        checkContract(_defaultPool);
        checkContract(_stabilityPool);
        checkContract(_PreonFinanceTreasury);
        checkContract(_borrowerOperations);
        checkContract(_collSurplusPool);
        activePool = _activePool;
        TML = _TML;
        TMR = _TMR;
        defaultPool = _defaultPool;
        stabilityPool = _stabilityPool;
        PreonFinanceTreasury = _PreonFinanceTreasury;
        borrowerOperations = _borrowerOperations;
        collSurplusPool = _collSurplusPool;
        addressesSet = true;
    }

    /* ========== New Functions =============== */

    // Can be called by anyone.
    // This function pulls in _amount base tokens from _from, then stakes them in
    // to mint WAssets which it sends to _to. It also updates
    // _rewardOwner's reward tracking such that it now has the right to
    // future yields from the newly minted WAssets
    function wrap(
        uint _amount,
        // address _from,
        address _to,
        address _rewardRecipient
    ) external {
        //Update rewards

        Qtoken.transferFrom(msg.sender, address(this), _amount);
        _mint(_to, _amount);
        accumulateRewards(msg.sender);
        // TODO user update
        userInfo[msg.sender].amount += _amount;
    }

    function accumulateRewards(address _user) internal {
        _Comptroller.claimReward(uint8(0), payable(address(this)), qiTokens);
        _Comptroller.claimReward(uint8(1), payable(address(this)), qiTokens);
        UserInfo memory local = userInfo[_user];
        if (local.amount > 0) {
            uint initialAVAXPerShare;
            uint initialQIPerShare;
            if (local.outstandingShares > 0) {
                initialAVAXPerShare =
                    (local.snapshotAVAX * SHAREOFFSET) /
                    local.outstandingShares;
                initialQIPerShare =
                    (local.snapshotQI * SHAREOFFSET) /
                    local.outstandingShares;
            }

            uint currentAVAXPerShare = ((address(this).balance -
                globalAVAXRewardPending) * SHAREOFFSET) / _totalSupply;
            uint currentQIPerShare = ((QI.balanceOf(address(this)) -
                globalQIRewardPending) * SHAREOFFSET) / _totalSupply;

            uint AVAXReward = ((currentAVAXPerShare - initialAVAXPerShare) *
                local.amount) / SHAREOFFSET;
            uint QIReward = ((currentQIPerShare - initialQIPerShare) *
                local.amount) / SHAREOFFSET;

            local.pendingAVAXReward = local.pendingAVAXReward + AVAXReward;
            local.pendingQIReward = local.pendingQIReward + QIReward;
            globalAVAXRewardPending = globalAVAXRewardPending + AVAXReward;
            globalQIRewardPending = globalQIRewardPending + QIReward;
        }

        local.snapshotAVAX = address(this).balance - globalAVAXRewardPending;

        local.snapshotQI = QI.balanceOf(address(this)) - globalQIRewardPending;
        local.outstandingShares = _totalSupply;
        userInfo[_user] = local;
    }

    // External function intended for users to unwrap manually their LP tokens.
    function unwrap(uint _amount) external override {
        // Claim rewards
        _burn(msg.sender, _amount);
        Qtoken.transfer(msg.sender, _amount);
    }

    // Only callable by ActivePool or StabilityPool
    // Used to provide unwrap assets during:
    // 1. Sending 0.5% liquidation reward to liquidators
    // 2. Sending back redeemed assets
    // In both cases, the wrapped asset is first sent to the liquidator or redeemer respectively,
    // then this function is called with _for equal to the the liquidator or redeemer address
    // Prior to this being called, the user whose assets we are burning should have their rewards updated
    function unwrapFor(
        address _to,
        address _from,
        uint _amount
    ) external override {
        _requireCallerIsPool();
        // accumulateRewards(msg.sender);
        // _MasterChefJoe.withdraw(_poolPid, _amount);

        // msg.sender is either Active Pool or Stability Pool
        // each one has the ability to unwrap and burn WAssets they own and
        // send them to someone else
        // userInfo[_to].amount=userInfo[_to].amount-_amount;
        _burn(msg.sender, _amount);
        Qtoken.transfer(_to, _amount);
    }

    // When funds are transferred into the stabilityPool on liquidation,
    // the rewards these funds are earning are allocated Preon Finance Treasury.
    // But when an stabilityPool depositor wants to withdraw their collateral,
    // the wAsset is unwrapped and the rewards are no longer accruing to the Preon Finance Treasury
    function endTreasuryReward(address _to, uint _amount) external override {
        _requireCallerIsSPorDP();
        // TODO update reward
        accumulateRewards(PreonFinanceTreasury);
        userInfo[PreonFinanceTreasury].amount =
            userInfo[PreonFinanceTreasury].amount -
            _amount;
    }

    // Decreases _from's amount of LP tokens earning yield by _amount
    // And increases _to's amount of LP tokens earning yield by _amount
    // If _to is address(0), then doesn't increase anyone's amount
    function updateReward(
        address _from,
        address _to,
        uint _amount
    ) external override {
        _requireCallerIsLRDorBO();

        accumulateRewards(_from);
        // update rewards
        userInfo[_from].amount = userInfo[_from].amount - _amount;
        if (address(_to) != address(0)) {
            accumulateRewards(_to);
            userInfo[_to].amount = userInfo[_to].amount + _amount;
        }
    }

    function _updateReward(
        address _from,
        address _to,
        uint _amount
    ) internal {
        // send reward
        // update reward to new owner
    }

    // // checks total pending QI rewards for _for
    function getPendingRewards(address _for)
        external
        view
        override
        returns (address[] memory, uint[] memory)
    {
        address[] memory tokens = new address[](2);
        uint[] memory amounts = new uint[](2);
        tokens[0] = address(0);
        amounts[0] = userInfo[_for].pendingAVAXReward;
        tokens[1] = address(QI);
        amounts[1] = userInfo[_for].pendingQIReward;
        return (tokens, amounts);
    }

    // checks total pending QI rewards for _for
    function getUserInfo(address _user)
        external
        view
        override
        returns (
            uint,
            uint,
            uint
        )
    {
        UserInfo memory user = userInfo[_user];
        return (user.amount, user.snapshotAVAX, user.snapshotQI);
    }

    // Claims msg.sender's pending rewards and sends to _to address
    function claimReward(address _to) external override {
        _sendReward(msg.sender, _to);
    }

    function _sendReward(address _rewardOwner, address _to) internal {
        //Update rewards TODO

        accumulateRewards(_rewardOwner);

        uint AVAXToSend = userInfo[_rewardOwner].pendingAVAXReward;
        uint QIToSend = userInfo[_rewardOwner].pendingQIReward;
        userInfo[_rewardOwner].pendingAVAXReward = 0;
        userInfo[_rewardOwner].pendingQIReward = 0;

        _safeRewardsTransfer(_to, AVAXToSend, QIToSend);
    }

    /*
     * Safe joe transfer function, just in case if rounding error causes pool to not have enough JOEs.
     */
    //TODO NEEDS REENTRANCY GUARD
    function _safeRewardsTransfer(
        address _to,
        uint256 AVAXToSend,
        uint256 QIToSend
    ) internal {
        uint256 AVAXBalance = address(this).balance;
        uint256 QIBalance = QI.balanceOf(address(this));

        if (AVAXToSend > AVAXBalance) {
            globalAVAXRewardPending = globalAVAXRewardPending - AVAXBalance;
            (bool sent, bytes memory data) = _to.call{value: AVAXBalance}("");
        } else {
            globalAVAXRewardPending = globalAVAXRewardPending - AVAXToSend;
            (bool sent, bytes memory data) = _to.call{value: AVAXToSend}("");
        }
        if (QIToSend > QIBalance) {
            globalQIRewardPending = globalQIRewardPending - QIBalance;
            QI.transfer(_to, QIBalance);
        } else {
            globalQIRewardPending = globalQIRewardPending - QIToSend;
            QI.transfer(_to, QIToSend);
        }
    }

    // ===== Check Caller Require View Functions =====

    function _requireCallerIsPool() internal view {
        require(
            (msg.sender == activePool ||
                msg.sender == stabilityPool ||
                msg.sender == collSurplusPool),
            "Caller is not active pool or stability pool"
        );
    }

    function _requireCallerIsSPorDP() internal view {
        require(
            (msg.sender == stabilityPool || msg.sender == defaultPool),
            "Caller is not stability pool or default pool"
        );
    }

    function _requireCallerIsActivePool() internal view {
        require(msg.sender == activePool, "Caller is not active pool");
    }

    // liquidation redemption default pool
    function _requireCallerIsLRDorBO() internal view {
        require(
            (msg.sender == TML ||
                msg.sender == TMR ||
                msg.sender == defaultPool ||
                msg.sender == borrowerOperations),
            "Caller is not LRD"
        );
    }

    function _requireCallerIsSP() internal view {
        require(msg.sender == stabilityPool, "Caller is not stability pool");
    }

    function checkContract(address _account) internal view {
        require(_account != address(0), "Account cannot be zero address");

        uint256 size;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            size := extcodesize(_account)
        }
        require(size != 0, "Account code size cannot be zero");
    }

    fallback() external payable {}
}
