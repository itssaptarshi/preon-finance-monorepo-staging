// vePREONNew Locking changes Test, Rage Quit,
// Test flow and fixtures ready
// TO DO: Verify test steps and call functions
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { TestHelper } = require("../utils/testHelpers.js");
const testHelpers = require("../utils/testHelpers.js");

const vePREONAddress = "0x20c81d658aae3a8580d990e441a9ef2c9809be74"; // add address after deployment or can fetch from localForkDeploymentOutput.json

describe("vePREON Contract", function () {
  async function contractFixture() {
    const vePREONContract = await ethers.getContractAt(
      "vePREONNew",
      vePREONAddress
    );
    return { vePREONContract };
  }

  describe("Locking specific Tests", function () {
    it("Should lock 80/20 PREON/WMATIC Balancer Pool Tokens (BPTs).", async function () {
      const { vePREONContract } = await loadFixture(contractFixture);

      //   expect(8).to.equal(await vePREONContract.retrieve());
    });
    it("Should decay 50% vePREON balance after half locking period", async function () {
      const { vePREONContract } = await loadFixture(contractFixture);

      //   expect(8).to.equal(await vePREONContract.retrieve());
    });
    it("Should check balance at the end of locking period", async function () {
      const { vePREONContract } = await loadFixture(contractFixture);

      //   expect(8).to.equal(await vePREONContract.retrieve());
    });
  });
  describe("Rage Quit", function () {
    it("Should exit vePREON", async function () {
      const { vePREONContract } = await loadFixture(contractFixture);

      //   expect(8).to.equal(await vePREONContract.retrieve());
    });
    it("Should check balance and penalty of 50%", async function () {
      const { vePREONContract } = await loadFixture(contractFixture);

      //   expect(8).to.equal(await vePREONContract.retrieve());
    });
  });
});
