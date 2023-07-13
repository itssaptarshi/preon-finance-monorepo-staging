const { ethers, upgrades } = require("hardhat");

async function main() {
  const STARToken = await ethers.getContractFactory("STARToken");
  console.log("Deploying STAR Token...");
  const contract = await upgrades.deployProxy(
    STARToken,
    [
      "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    ],
    {
      initializer: "initialize",
      kind: "transparent",
    }
  );
  await contract.deployed();
  console.log("STAR Token deployed to :", contract.address);
  console.log(
    "Implementation Address :",
    await upgrades.erc1967.getImplementationAddress(contract.address)
  );
  console.log("Current Contract version :", await contract.version());

  // Upgrading contract to V2
  // const STARTokenV2 = await ethers.getContractFactory("STARTokenV2");
  // console.log("Upgrading STAR Token Contract...");
  // await upgrades.upgradeProxy(contract.address, STARTokenV2);
  // console.log("Upgraded Successfully");
  // console.log("Contract version after Upgrade :", await contract.version());
  // console.log(
  //   "Data from previous state retained (e.g. _totalSupply value) :",
  //   await contract.totalSupply()
  // );
}

main();
