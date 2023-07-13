// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

interface ILockupContractFactory {
    // --- Events ---

    event PREONTokenAddressSet(address _preonTokenAddress);
    event LockupContractDeployedThroughFactory(
        address _lockupContractAddress,
        address _beneficiary,
        uint _unlockTime,
        address _deployer
    );

    // --- Functions ---

    function setPREONTokenAddress(address _preonTokenAddress) external;

    function deployLockupContract(address _beneficiary, uint _unlockTime)
        external;

    function isRegisteredLockup(address _addr) external view returns (bool);
}
