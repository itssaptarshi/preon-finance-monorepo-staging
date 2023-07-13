const { ethers, upgrades } = require("hardhat");

async function main() {
  const STARTokenV2 = await ethers.getContractFactory("STARTokenV2");
  console.log("Upgrading STAR Token Contract...");
  await upgrades.upgradeProxy(
    "0x3DaD300A888CE2c31925079c1EBEb54feEE847B9",
    STARTokenV2
  );
  console.log("Upgraded Successfully");
  console.log("Contract version after Upgrade :", await contract.version());
  console.log(
    "Data from previous state (e.g. _totalSupply ) :",
    await contract.totalSupply()
  );
}

main();
