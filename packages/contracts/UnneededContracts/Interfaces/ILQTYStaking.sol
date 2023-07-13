// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

interface ISPREON {
    // --- Events --

    event PREONTokenAddressSet(address _preonTokenAddress);
    event STARTokenAddressSet(address _starTokenAddress);
    event TroveManagerAddressSet(address _troveManager);
    event TroveManagerRedemptionsAddressSet(address _troveManagerRedemptions);
    event BorrowerOperationsAddressSet(address _borrowerOperationsAddress);
    event ActivePoolAddressSet(address _activePoolAddress);

    event StakeChanged(address indexed staker, uint newStake);
    event StakingGainsWithdrawn(address indexed staker, uint STARGain);
    event F_STARUpdated(uint _F_STAR);
    event TotalPREONStakedUpdated(uint _totalPREONStaked);
    event StakerSnapshotsUpdated(address _staker, uint _F_STAR);

    // --- Functions ---

    function setAddresses(
        address _preonTokenAddress,
        address _starTokenAddress,
        address _troveManagerAddress,
        address _troveManagerRedemptionsAddress,
        address _borrowerOperationsAddress,
        address _activePoolAddress
    ) external;

    function stake(uint _PREONamount) external;

    function unstake(uint _PREONamount) external;

    function increaseF_STAR(uint _PREONFee) external;

    function getPendingSTARGain(address _user) external view returns (uint);
}
