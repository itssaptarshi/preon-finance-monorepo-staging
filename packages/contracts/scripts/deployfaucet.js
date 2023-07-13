//Faucet whale contract

const hre = require("hardhat");

async function main() {
  const Faucet = await hre.ethers.getContractFactory("Faucet");
  const faucet = await Faucet.deploy();

  await faucet.deployed();

  console.log(`Faucet is now deployed to ${faucet.address}`);

  const WhaleAccount = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"; // this need to change

  const impersonatedSigner = await hre.ethers.getImpersonatedSigner(
    WhaleAccount
  );
  await impersonatedSigner.sendTransaction({
    to: faucet.address,
    value: hre.ethers.utils.parseEther("5000"), // 1000 ether/matic
  });

  const balance = await ethers.provider.getBalance(faucet.address);

  console.log(`Balance of new user ${hre.ethers.utils.formatEther(balance)}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// contract deployed on ________________________________________________
