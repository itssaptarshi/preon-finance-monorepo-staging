// vePREONNew Locking changes Test, Rage Quit,
// Test flow and fixtures ready
// TO DO: Verify test steps and call functions
// const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { stMATICAbi } = require("./ABIs/abi");

const PreonstMaticVaultAddress = "0x44325F0A0c02C6854c0736432137Da652843c0B3"; // add address after deployment or can fetch from localForkDeploymentOutput.json
const stMATIC = "0x3A58a54C066FdC0f2D55FC9C89F0415C92eBf3C4"; // Lido : stMATICToken

describe("stMATIC Vault Contract", function () {
  async function contractFixture() {
    const PreonstMaticVault = await ethers.getContractAt(
      "PreonstMaticVault",
      PreonstMaticVaultAddress
    );
    const stMaticContract = await ethers.getContractAt(stMATICAbi, stMATIC);
    const deployerWallet = (await ethers.getSigners())[0];
    const account2Wallet = (await ethers.getSigners())[1];
    return {
      PreonstMaticVault,
      stMaticContract,
      deployerWallet,
      account2Wallet,
    };
  }

  it("Should have Lido:stMATIC underlying token", async function () {
    const { PreonstMaticVault } = await loadFixture(contractFixture);
    expect(await PreonstMaticVault.underlying()).to.equal(stMATIC);
  });

  it("Should get stMATIC token", async function () {
    const { deployerWallet, stMaticContract } = await loadFixture(
      contractFixture
    );
    // console.log(deployerWallet.address);
    console.log(
      parseInt(
        await stMaticContract.balanceOf(
          "0xba12222222228d8ba445958a75a0704d566bf2c8"
        )
      )
    );
    console.log(await stMaticContract.decimals());
    // expect(await PreonstMaticVault.underlying()).to.equal(stMATIC);
  });

  it("Should have stMATIC underlying token", async function () {
    const { PreonstMaticVault } = await loadFixture(contractFixture);
    expect(await PreonstMaticVault.underlying()).to.equal(stMATIC);
  });

  // describe("Rage Quit", function () {
  //   it("Should exit vePREON", async function () {
  //     const { vePREONContract } = await loadFixture(contractFixture);

  //     //   expect(8).to.equal(await vePREONContract.retrieve());
  //   });
  //   it("Should check balance and penalty of 50%", async function () {
  //     const { vePREONContract } = await loadFixture(contractFixture);

  //     //   expect(8).to.equal(await vePREONContract.retrieve());
  //   });
  // });
});
