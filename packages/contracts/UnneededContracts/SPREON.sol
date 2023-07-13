 SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "../Dependencies/BaseMath.sol";
import "../Dependencies/SafeMath.sol";
import "../Dependencies/Ownable.sol";
import "../Dependencies/CheckContract.sol";
import "hardhat/console.sol";
import "../Interfaces/IPREONToken.sol";
import "../Interfaces/ISPREON.sol";
import "../Dependencies/LiquityMath.sol";
import "../Interfaces/ISTARToken.sol";

contract SPREON is ISPREON, Ownable, CheckContract, BaseMath {
    using SafeMath for uint;

    // --- Data ---
    bytes32 constant public NAME = "PREONStaking";

    mapping( address => uint) public stakes;
    uint public totalPREONStaked;

    uint public F_STAR; // Running sum of PREON fees per-PREON-staked

    // User snapshots of F_STAR, taken at the point at which their latest deposit was made
    mapping (address => Snapshot) public snapshots;

    struct Snapshot {
        uint F_STAR_Snapshot;
    }

    IPREONToken public preonToken;
    ISTARToken public starToken;

    address public troveManagerAddress;
    address public troveManagerRedemptionsAddress;
    address public borrowerOperationsAddress;
    address public activePoolAddress;

    // --- Events ---

    event PREONTokenAddressSet(address _preonTokenAddress);
    event STARTokenAddressSet(address _starTokenAddress);
    event TroveManagerAddressSet(address _troveManager);
    event TroveManagerRedemptionsAddressSet(address _troveManagerRedemptionsAddress);
    event BorrowerOperationsAddressSet(address _borrowerOperationsAddress);
    event ActivePoolAddressSet(address _activePoolAddress);

    event StakeChanged(address indexed staker, uint newStake);
    event StakingGainsWithdrawn(address indexed staker, uint STARGain);
    event F_STARUpdated(uint _F_STAR);
    event TotalPREONStakedUpdated(uint _totalPREONStaked);
    event EtherSent(address _account, uint _amount);
    event StakerSnapshotsUpdated(address _staker, uint _F_STAR);

    // --- Functions ---

    function setAddresses
    (
        address _preonTokenAddress,
        address _starTokenAddress,
        address _troveManagerAddress,
        address _troveManagerRedemptionsAddress,
        address _borrowerOperationsAddress,
        address _activePoolAddress
    )
        external
        onlyOwner
        override
    {
        checkContract(_preonTokenAddress);
        checkContract(_starTokenAddress);
        checkContract(_troveManagerAddress);
        checkContract(_troveManagerRedemptionsAddress);
        checkContract(_borrowerOperationsAddress);
        checkContract(_activePoolAddress);

        preonToken = IPREONToken(_preonTokenAddress);
        starToken = ISTARToken(_starTokenAddress);
        troveManagerAddress = _troveManagerAddress;
        troveManagerRedemptionsAddress = _troveManagerRedemptionsAddress;
        borrowerOperationsAddress = _borrowerOperationsAddress;
        activePoolAddress = _activePoolAddress;

        emit PREONTokenAddressSet(_preonTokenAddress);
        emit PREONTokenAddressSet(_starTokenAddress);
        emit TroveManagerAddressSet(_troveManagerAddress);
        emit TroveManagerRedemptionsAddressSet(_troveManagerRedemptionsAddress);
        emit BorrowerOperationsAddressSet(_borrowerOperationsAddress);
        emit ActivePoolAddressSet(_activePoolAddress);

        renounceOwnership();
    }

    // If caller has a pre-existing stake, send any accumulated STAR gains to them.
    function stake(uint _PREONamount) external override {
        _requireNonZeroAmount(_PREONamount);

        uint currentStake = stakes[msg.sender];

//        uint ETHGain;
        uint STARGain;
        // Grab any accumulated ETH and STAR gains from the current stake
        if (currentStake != 0) {
//            ETHGain = _getPendingETHGain(msg.sender);
            STARGain = _getPendingSTARGain(msg.sender);
        }

       _updateUserSnapshots(msg.sender);

        uint newStake = currentStake.add(_PREONamount);

        // Increase user’s stake and total PREON staked
        stakes[msg.sender] = newStake;
        totalPREONStaked = totalPREONStaked.add(_PREONamount);
        emit TotalPREONStakedUpdated(totalPREONStaked);

        // Transfer PREON from caller to this contract
        preonToken.sendToSPREON(msg.sender, _PREONamount);

        emit StakeChanged(msg.sender, newStake);
        emit StakingGainsWithdrawn(msg.sender, STARGain);

         // Send accumulated STAR gains to the caller
        if (currentStake != 0) {
            starToken.transfer(msg.sender, STARGain);
//            _sendETHGainToUser(ETHGain);
        }
    }

    // Unstake the PREON and send the it back to the caller, along with their accumulated STAR gains.
    // If requested amount > stake, send their entire stake.
    function unstake(uint _PREONamount) external override {
        uint currentStake = stakes[msg.sender];
        _requireUserHasStake(currentStake);

        // Grab any accumulated STAR gains from the current stake
//        uint ETHGain = _getPendingETHGain(msg.sender);
        uint STARGain = _getPendingSTARGain(msg.sender);

        _updateUserSnapshots(msg.sender);

        if (_PREONamount != 0) {
            uint PREONToWithdraw = LiquityMath._min(_PREONamount, currentStake);

            uint newStake = currentStake.sub(PREONToWithdraw);

            // Decrease user's stake and total PREON staked
            stakes[msg.sender] = newStake;
            totalPREONStaked = totalPREONStaked.sub(PREONToWithdraw);
            emit TotalPREONStakedUpdated(totalPREONStaked);

            // Transfer unstaked PREON to user
            preonToken.transfer(msg.sender, PREONToWithdraw);

            emit StakeChanged(msg.sender, newStake);
        }

        emit StakingGainsWithdrawn(msg.sender, STARGain);

        // Send accumulated STAR gains to the caller
        starToken.transfer(msg.sender, STARGain);
//        _sendETHGainToUser(ETHGain);
    }

    // --- Reward-per-unit-staked increase functions. Called by Liquity core contracts ---

//    function increaseF_ETH(uint _ETHFee) external override {
//        _requireCallerIsTroveManager();
//        uint ETHFeePerPREONStaked;
//
//        if (totalPREONStaked != 0) {ETHFeePerPREONStaked = _ETHFee.mul(DECIMAL_PRECISION).div(totalPREONStaked);}
//
//        F_ETH = F_ETH.add(ETHFeePerPREONStaked);
//        emit F_ETHUpdated(F_ETH);
//    }

    function increaseF_STAR(uint _STARFee) external override {
        _requireCallerIsBOOrTM();
        uint STARFeePerPREONStaked;

        if (totalPREONStaked != 0) {STARFeePerPREONStaked = _STARFee.mul(DECIMAL_PRECISION).div(totalPREONStaked);}

        F_STAR = F_STAR.add(STARFeePerPREONStaked);
        emit F_STARUpdated(F_STAR);
    }

    // --- Pending reward functions ---

//    function getPendingETHGain(address _user) external view override returns (uint) {
//        return _getPendingETHGain(_user);
//    }
//
//    function _getPendingETHGain(address _user) internal view returns (uint) {
//        uint F_ETH_Snapshot = snapshots[_user].F_ETH_Snapshot;
//        uint ETHGain = stakes[_user].mul(F_ETH.sub(F_ETH_Snapshot)).div(DECIMAL_PRECISION);
//        return ETHGain;
//    }

    function getPendingSTARGain(address _user) external view override returns (uint) {
        return _getPendingSTARGain(_user);
    }

    function _getPendingSTARGain(address _user) internal view returns (uint) {
        uint F_STAR_Snapshot = snapshots[_user].F_STAR_Snapshot;
        uint STARGain = stakes[_user].mul(F_STAR.sub(F_STAR_Snapshot)).div(DECIMAL_PRECISION);
        return STARGain;
    }

    // --- Internal helper functions ---

    function _updateUserSnapshots(address _user) internal {
//        snapshots[_user].F_ETH_Snapshot = F_ETH;
        snapshots[_user].F_STAR_Snapshot = F_STAR;
        emit StakerSnapshotsUpdated(_user, F_STAR);
    }

//    function _sendETHGainToUser(uint ETHGain) internal {
//        emit EtherSent(msg.sender, ETHGain);
//        (bool success, ) = msg.sender.call{value: ETHGain}("");
//        require(success, "SPREON: Failed to send accumulated ETHGain");
//    }

    // --- 'require' functions ---

    function _requireCallerIsTroveManager() internal view {
        require(msg.sender == troveManagerAddress, "SPREON: caller is not TroveM");
    }

    function _requireCallerIsBOOrTM() internal view {
        require(((msg.sender == troveManagerAddress)
        || (msg.sender == borrowerOperationsAddress))
        || (msg.sender == troveManagerRedemptionsAddress),
            "SPREON: caller is not BorrowerOps");
    }

     function _requireCallerIsActivePool() internal view {
        require(msg.sender == activePoolAddress, "SPREON: caller is not ActivePool");
    }

    function _requireUserHasStake(uint currentStake) internal pure {
        require(currentStake != 0, 'SPREON: User must have a non-zero stake');
    }

    function _requireNonZeroAmount(uint _amount) internal pure {
        require(_amount != 0, 'SPREON: Amount must be non-zero');
    }

    receive() external payable {
        _requireCallerIsActivePool();
    }
}
