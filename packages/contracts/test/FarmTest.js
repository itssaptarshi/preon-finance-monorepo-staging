// original file: https://github.com/Synthetixio/Unipool/blob/master/test/Unipool.js

const { BN, time } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const { TestHelper } = require("../utils/testHelpers.js");
const testHelpers = require("../utils/testHelpers.js");

const { assertRevert } = TestHelper;

const th = testHelpers.TestHelper;
const StakedToken = artifacts.require("ERC20Mock");
const PreonToken = artifacts.require("./PREONTokenTester.sol");
const Farm = artifacts.require("Farm");
const NonPayable = artifacts.require("NonPayable");

const _1e18 = new BN("10").pow(new BN("18"));

const almostEqualDiv1e18 = function (expectedOrig, actualOrig) {
  const expected = expectedOrig.div(_1e18);
  const actual = actualOrig.div(_1e18);
  this.assert(
    expected.eq(actual) ||
      expected.addn(1).eq(actual) ||
      expected.addn(2).eq(actual) ||
      actual.addn(1).eq(expected) ||
      actual.addn(2).eq(expected),
    "expected #{act} to be almost equal #{exp}",
    "expected #{act} to be different from #{exp}",
    expectedOrig.toString(),
    actualOrig.toString()
  );
};

require("chai").use(function (chai, utils) {
  chai.Assertion.overwriteMethod("almostEqualDiv1e18", function (original) {
    return function (value) {
      if (utils.flag(this, "bignumber")) {
        var expected = new BN(value);
        var actual = new BN(this._obj);
        almostEqualDiv1e18.apply(this, [expected, actual]);
      } else {
        original.apply(this, arguments);
      }
    };
  });
});

contract(
  "Farm",
  function ([_, wallet1, wallet2, wallet3, wallet4, bountyAddress, owner]) {
    let multisig = "0x5b5e5CC89636CA2685b4e4f50E66099EBCFAb638"; // Arbitrary address for the multisig, which is not tested in this file

    const deploy = async (that) => {
      that.stakedToken = await StakedToken.new("Staked Token", "LPT", owner, 0);

      const sPREON = await NonPayable.new();
      const treasury = await NonPayable.new();
      const team = await NonPayable.new();
      that.preon = await PreonToken.new(
        sPREON.address,
        treasury.address,
        team.address
      );

      that.lpRewardsEntitlement = new BN(
        await web3.utils.toWei(new BN((10 ** 6 * 4) / 3))
      );
      that.DURATION = new BN(6 * 7 * 24 * 60 * 60); // 6 weeks
      that.rewardRate = that.lpRewardsEntitlement.div(that.DURATION);

      that.pool = await Farm.new(that.stakedToken.address, that.preon.address);

      await that.stakedToken.mint(wallet1, web3.utils.toWei("1000"));
      await that.stakedToken.mint(wallet2, web3.utils.toWei("1000"));
      await that.stakedToken.mint(wallet3, web3.utils.toWei("1000"));
      await that.stakedToken.mint(wallet4, web3.utils.toWei("1000"));

      await that.stakedToken.approve(
        that.pool.address,
        new BN(2).pow(new BN(255)),
        { from: wallet1 }
      );
      await that.stakedToken.approve(
        that.pool.address,
        new BN(2).pow(new BN(255)),
        { from: wallet2 }
      );
      await that.stakedToken.approve(
        that.pool.address,
        new BN(2).pow(new BN(255)),
        { from: wallet3 }
      );
      await that.stakedToken.approve(
        that.pool.address,
        new BN(2).pow(new BN(255)),
        { from: wallet4 }
      );
    };

    describe("Farm", async function () {
      beforeEach(async function () {
        await deploy(this);
        await this.preon.unprotectedMint(
          this.pool.address,
          this.lpRewardsEntitlement
        );
        await this.pool.notifyRewardAmount(
          this.lpRewardsEntitlement,
          this.DURATION
        );
      });

      it("Two stakers with the same stakes wait DURATION", async function () {
        expect(
          await this.pool.rewardPerToken()
        ).to.be.bignumber.almostEqualDiv1e18("0");
        expect(await this.pool.earned(wallet1)).to.be.bignumber.equal("0");
        expect(await this.pool.earned(wallet2)).to.be.bignumber.equal("0");

        const stake1 = new BN(web3.utils.toWei("1"));
        await this.pool.stake(stake1, { from: wallet1 });
        const stakeTime1 = await time.latest();
        // time goes by... so slowly

        const stake2 = new BN(web3.utils.toWei("1"));
        await this.pool.stake(stake2, { from: wallet2 });
        const stakeTime2 = await time.latest();

        await time.increaseTo(stakeTime1.add(this.DURATION));

        const timeDiff = stakeTime2.sub(stakeTime1);
        const rewardPerToken = this.rewardRate
          .mul(timeDiff)
          .mul(_1e18)
          .div(stake1)
          .add(
            this.rewardRate
              .mul(this.DURATION.sub(timeDiff))
              .mul(_1e18)
              .div(stake1.add(stake2))
          );
        const halfEntitlement = this.lpRewardsEntitlement.div(new BN(2));
        const earnedDiff = halfEntitlement.mul(timeDiff).div(this.DURATION);
        expect(
          await this.pool.rewardPerToken()
        ).to.be.bignumber.almostEqualDiv1e18(rewardPerToken);
        expect(
          await this.pool.earned(wallet1)
        ).to.be.bignumber.almostEqualDiv1e18(halfEntitlement.add(earnedDiff));
        expect(
          await this.pool.earned(wallet2)
        ).to.be.bignumber.almostEqualDiv1e18(halfEntitlement.sub(earnedDiff));
      });

      it("Two stakers with the different (1:3) stakes wait DURATION", async function () {
        expect(
          await this.pool.rewardPerToken()
        ).to.be.bignumber.almostEqualDiv1e18("0");
        expect(await this.pool.balanceOf(wallet1)).to.be.bignumber.equal("0");
        expect(await this.pool.balanceOf(wallet2)).to.be.bignumber.equal("0");
        expect(await this.pool.earned(wallet1)).to.be.bignumber.equal("0");
        expect(await this.pool.earned(wallet2)).to.be.bignumber.equal("0");

        const stake1 = new BN(web3.utils.toWei("1"));
        await this.pool.stake(stake1, { from: wallet1 });
        const stakeTime1 = await time.latest();

        const stake2 = new BN(web3.utils.toWei("3"));
        await this.pool.stake(stake2, { from: wallet2 });
        const stakeTime2 = await time.latest();

        await time.increaseTo(stakeTime1.add(this.DURATION));

        const timeDiff = stakeTime2.sub(stakeTime1);
        const rewardPerToken1 = this.rewardRate
          .mul(timeDiff)
          .mul(_1e18)
          .div(stake1);
        const rewardPerToken2 = this.rewardRate
          .mul(this.DURATION.sub(timeDiff))
          .mul(_1e18)
          .div(stake1.add(stake2));
        const rewardPerToken = rewardPerToken1.add(rewardPerToken2);
        expect(
          await this.pool.rewardPerToken()
        ).to.be.bignumber.almostEqualDiv1e18(rewardPerToken);
        expect(
          await this.pool.earned(wallet1)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1.add(rewardPerToken2).mul(stake1).div(_1e18)
        );
        expect(
          await this.pool.earned(wallet2)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken2.mul(stake2).div(_1e18)
        );
      });

      it("Two stakers with the different (1:3) stakes wait DURATION and DURATION/2", async function () {
        //
        // 1x: +--------------+
        // 3x:      +---------+
        //

        const stake1 = new BN(web3.utils.toWei("1"));
        await this.pool.stake(stake1, { from: wallet1 });
        const stakeTime1 = await time.latest();

        await time.increaseTo(stakeTime1.add(this.DURATION.div(new BN(3))));
        const stakeTime2 = await time.latest();
        // now two weeks past start

        const timeDiff = stakeTime2.sub(stakeTime1); // timeDIff = two weeks

        const contractRewardRate = await this.pool.rewardRate();
        console.log("Contract Reward Rate", contractRewardRate.toString());
        console.log("This reward rate", this.rewardRate.toString());
        const rewardPerToken1 = this.rewardRate
          .mul(timeDiff)
          .mul(_1e18)
          .div(stake1);
        expect(
          await this.pool.rewardPerToken()
        ).to.be.bignumber.almostEqualDiv1e18(rewardPerToken1);
        expect(
          await this.pool.earned(wallet1)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1.mul(stake1).div(_1e18)
        );

        const stake2 = new BN(web3.utils.toWei("3"));
        console.log("Wallet 2", wallet2);
        await this.pool.stake(stake2, { from: wallet2 });
        expect(await this.pool.earned(wallet2)).to.be.bignumber.equal("0");

        // Forward to week 3 and notifyReward weekly
        await time.increase(this.DURATION.mul(new BN(2)).div(new BN(3)));

        const rewardPerToken2 = this.rewardRate
          .mul(this.DURATION.sub(timeDiff))
          .mul(_1e18)
          .div(stake1.add(stake2));
        const rewardPerToken = rewardPerToken1.add(rewardPerToken2);
        expect(
          await this.pool.rewardPerToken()
        ).to.be.bignumber.almostEqualDiv1e18(rewardPerToken);
        expect(
          await this.pool.earned(wallet1)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1.add(rewardPerToken2).mul(stake1).div(_1e18)
        );
        expect(
          await this.pool.earned(wallet2)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken2.mul(stake2).div(_1e18)
        );
      });

      it("Three stakers with the different (1:3:5) stakes wait different durations", async function () {
        //
        // 1x: +----------------+--------+
        // 3x:  +---------------+
        // 5x:         +-----------------+
        //

        const stake1 = new BN(web3.utils.toWei("1"));
        await this.pool.stake(stake1, { from: wallet1 });
        const stakeTime1 = await time.latest();

        const stake2 = new BN(web3.utils.toWei("3"));
        await this.pool.stake(stake2, { from: wallet2 });
        const stakeTime2 = await time.latest();

        await time.increaseTo(stakeTime1.add(this.DURATION.div(new BN(3))));

        const stake3 = new BN(web3.utils.toWei("5"));
        await this.pool.stake(stake3, { from: wallet3 });
        const stakeTime3 = await time.latest();

        const timeDiff1 = stakeTime2.sub(stakeTime1);
        const timeDiff2 = stakeTime3.sub(stakeTime2);
        const rewardPerToken1 = this.rewardRate
          .mul(timeDiff1)
          .mul(_1e18)
          .div(stake1);
        const rewardPerToken2 = this.rewardRate
          .mul(timeDiff2)
          .mul(_1e18)
          .div(stake1.add(stake2));
        expect(
          await this.pool.rewardPerToken()
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1.add(rewardPerToken2)
        );
        expect(
          await this.pool.earned(wallet1)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1.add(rewardPerToken2).mul(stake1).div(_1e18)
        );
        expect(
          await this.pool.earned(wallet2)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken2.mul(stake2).div(_1e18)
        );

        await time.increaseTo(
          stakeTime1.add(this.DURATION.mul(new BN(2)).div(new BN(3)))
        );

        await this.pool.exit({ from: wallet2 });
        const exitTime2 = await time.latest();

        const timeDiff3 = exitTime2.sub(stakeTime3);
        const rewardPerToken3 = this.rewardRate
          .mul(timeDiff3)
          .mul(_1e18)
          .div(stake1.add(stake2).add(stake3));
        expect(
          await this.pool.rewardPerToken()
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1.add(rewardPerToken2).add(rewardPerToken3)
        );
        expect(
          await this.pool.earned(wallet1)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1
            .add(rewardPerToken2)
            .add(rewardPerToken3)
            .mul(stake1)
            .div(_1e18)
        );
        expect(await this.pool.earned(wallet2)).to.be.bignumber.equal("0");
        expect(
          await this.preon.balanceOf(wallet2)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken2.add(rewardPerToken3).mul(stake2).div(_1e18)
        );
        expect(
          await this.pool.earned(wallet3)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken3.mul(stake3).div(_1e18)
        );

        await time.increaseTo(stakeTime1.add(this.DURATION));

        const timeDiff4 = this.DURATION.sub(exitTime2.sub(stakeTime1));
        const rewardPerToken4 = this.rewardRate
          .mul(timeDiff4)
          .mul(_1e18)
          .div(stake1.add(stake3));
        expect(
          await this.pool.rewardPerToken()
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1
            .add(rewardPerToken2)
            .add(rewardPerToken3)
            .add(rewardPerToken4)
        );
        expect(
          await this.pool.earned(wallet1)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1
            .add(rewardPerToken2)
            .add(rewardPerToken3)
            .add(rewardPerToken4)
            .mul(stake1)
            .div(_1e18)
        );
        expect(await this.pool.earned(wallet2)).to.be.bignumber.equal("0");
        expect(
          await this.pool.earned(wallet3)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken3.add(rewardPerToken4).mul(stake3).div(_1e18)
        );
      });

      it("Four stakers with gaps of zero total supply", async function () {
        //
        // 1x: +-------+               |
        // 3x:  +----------+           |
        // 5x:                +------+ |
        // 1x:                         |  +------...
        //                             +-> end of initial duration

        const stake1 = new BN(web3.utils.toWei("1"));
        await this.pool.stake(stake1, { from: wallet1 });
        const stakeTime1 = await time.latest();
        th.assertIsApproximatelyEqual(
          await this.pool.periodFinish(),
          stakeTime1.add(this.DURATION),
          10
        );

        const stake2 = new BN(web3.utils.toWei("3"));
        await this.pool.stake(stake2, { from: wallet2 });
        const stakeTime2 = await time.latest();

        th.assertIsApproximatelyEqual(
          await this.pool.periodFinish(),
          stakeTime1.add(this.DURATION),
          10
        );

        await time.increase(this.DURATION.div(new BN(6)));

        await this.pool.exit({ from: wallet1 });
        const exitTime1 = await time.latest();

        th.assertIsApproximatelyEqual(
          await this.pool.periodFinish(),
          stakeTime1.add(this.DURATION),
          10
        );

        const timeDiff1 = stakeTime2.sub(stakeTime1);
        const timeDiff2 = exitTime1.sub(stakeTime2);
        const rewardPerToken1 = this.rewardRate
          .mul(timeDiff1)
          .mul(_1e18)
          .div(stake1);
        const rewardPerToken2 = this.rewardRate
          .mul(timeDiff2)
          .mul(_1e18)
          .div(stake1.add(stake2));
        expect(
          await this.pool.rewardPerToken()
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1.add(rewardPerToken2)
        );
        expect(await this.pool.earned(wallet1)).to.be.bignumber.equal("0");
        expect(
          await this.preon.balanceOf(wallet1)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1.add(rewardPerToken2).mul(stake1).div(_1e18)
        );
        expect(
          await this.pool.earned(wallet2)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken2.mul(stake2).div(_1e18)
        );

        await time.increase(this.DURATION.div(new BN(6)));

        await this.pool.exit({ from: wallet2 });
        const exitTime2 = await time.latest();

        th.assertIsApproximatelyEqual(
          await this.pool.periodFinish(),
          stakeTime1.add(this.DURATION),
          10
        );

        const timeDiff3 = exitTime2.sub(exitTime1);
        const rewardPerToken3 = this.rewardRate
          .mul(timeDiff3)
          .mul(_1e18)
          .div(stake2);
        expect(
          await this.pool.rewardPerToken()
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1.add(rewardPerToken2).add(rewardPerToken3)
        );
        expect(await this.pool.earned(wallet1)).to.be.bignumber.equal("0");
        expect(await this.pool.earned(wallet2)).to.be.bignumber.equal("0");
        expect(
          await this.preon.balanceOf(wallet2)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken2.add(rewardPerToken3).mul(stake2).div(_1e18)
        );

        await time.increase(this.DURATION.div(new BN(6)));

        const stake3 = new BN(web3.utils.toWei("5"));
        await this.pool.stake(stake3, { from: wallet3 });
        const stakeTime3 = await time.latest();

        const emptyPeriod1 = stakeTime3.sub(exitTime2);

        th.assertIsApproximatelyEqual(
          await this.pool.periodFinish(),
          stakeTime1.add(this.DURATION),
          10
        );

        expect(
          await this.pool.rewardPerToken()
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1.add(rewardPerToken2).add(rewardPerToken3)
        );
        expect(await this.pool.earned(wallet1)).to.be.bignumber.equal("0");
        expect(await this.pool.earned(wallet2)).to.be.bignumber.equal("0");
        expect(await this.pool.earned(wallet3)).to.be.bignumber.equal("0");

        await time.increase(this.DURATION.div(new BN(6)));

        await this.pool.exit({ from: wallet3 });
        const exitTime3 = await time.latest();

        th.assertIsApproximatelyEqual(
          await this.pool.periodFinish(),
          stakeTime1.add(this.DURATION),
          10
        );

        const timeDiff4 = exitTime3.sub(stakeTime3);
        const rewardPerToken4 = this.rewardRate
          .mul(timeDiff4)
          .mul(_1e18)
          .div(stake3);
        expect(
          await this.pool.rewardPerToken()
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1
            .add(rewardPerToken2)
            .add(rewardPerToken3)
            .add(rewardPerToken4)
        );
        expect(await this.pool.earned(wallet1)).to.be.bignumber.equal("0");
        expect(await this.pool.earned(wallet2)).to.be.bignumber.equal("0");
        expect(await this.pool.earned(wallet3)).to.be.bignumber.equal("0");
        expect(
          await this.preon.balanceOf(wallet3)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken4.mul(stake3).div(_1e18)
        );

        await time.increase(this.DURATION.div(new BN(2)));

        // check that we have reached initial duration
        expect(await time.latest()).to.be.bignumber.gte(
          stakeTime1.add(this.DURATION)
        );

        const stake4 = new BN(web3.utils.toWei("1"));
        await this.pool.stake(stake4, { from: wallet4 });

        th.assertIsApproximatelyEqual(
          await this.pool.periodFinish(),
          stakeTime1.add(this.DURATION),
          10
        );

        await time.increase(this.DURATION.div(new BN(2)));

        const timeDiff5 = this.DURATION.sub(
          exitTime2.sub(stakeTime1).add(timeDiff4)
        );
        const rewardPerToken5 = this.rewardRate
          .mul(timeDiff5)
          .mul(_1e18)
          .div(stake4);
        expect(
          await this.pool.rewardPerToken()
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1
            .add(rewardPerToken2)
            .add(rewardPerToken3)
            .add(rewardPerToken4)
        );
        expect(await this.pool.earned(wallet1)).to.be.bignumber.equal("0");
        expect(await this.pool.earned(wallet2)).to.be.bignumber.equal("0");
        expect(await this.pool.earned(wallet3)).to.be.bignumber.equal("0");
        // wallet4 staked after periodFinished so they are not eligible for any rewards
        expect(await this.pool.earned(wallet4)).to.be.bignumber.equal("0");
      });

      it("Four stakers with gaps of zero total supply, with claims in between", async function () {
        //
        // 1x: +-------+               |
        // 3x:  +----------+           |
        // 5x:                +------+ |
        // 1x:                         |  +------...
        //                             +-> end of initial duration

        const stake1 = new BN(web3.utils.toWei("1"));
        await this.pool.stake(stake1, { from: wallet1 });
        const stakeTime1 = await time.latest();

        th.assertIsApproximatelyEqual(
          await this.pool.periodFinish(),
          stakeTime1.add(this.DURATION),
          10
        );

        const stake2 = new BN(web3.utils.toWei("3"));
        await this.pool.stake(stake2, { from: wallet2 });
        const stakeTime2 = await time.latest();

        th.assertIsApproximatelyEqual(
          await this.pool.periodFinish(),
          stakeTime1.add(this.DURATION),
          10
        );

        await time.increase(this.DURATION.div(new BN(6))); // increase current time by one week

        await this.pool.withdraw(stake1, { from: wallet1 });
        const exitTime1 = await time.latest();

        th.assertIsApproximatelyEqual(
          await this.pool.periodFinish(),
          stakeTime1.add(this.DURATION),
          10
        );

        const timeDiff1 = stakeTime2.sub(stakeTime1);
        const timeDiff2 = exitTime1.sub(stakeTime2);
        const rewardPerToken1 = this.rewardRate
          .mul(timeDiff1)
          .mul(_1e18)
          .div(stake1);
        const rewardPerToken2 = this.rewardRate
          .mul(timeDiff2)
          .mul(_1e18)
          .div(stake1.add(stake2));
        expect(
          await this.pool.rewardPerToken()
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1.add(rewardPerToken2)
        );
        expect(
          await this.pool.earned(wallet1)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1.add(rewardPerToken2).mul(stake1).div(_1e18)
        );
        expect(
          await this.pool.earned(wallet2)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken2.mul(stake2).div(_1e18)
        );

        await time.increase(this.DURATION.div(new BN(6))); // increase current time by one week

        await this.pool.withdraw(stake2, { from: wallet2 });
        const exitTime2 = await time.latest();

        th.assertIsApproximatelyEqual(
          await this.pool.periodFinish(),
          stakeTime1.add(this.DURATION),
          10
        );

        const timeDiff3 = exitTime2.sub(exitTime1);
        const rewardPerToken3 = this.rewardRate
          .mul(timeDiff3)
          .mul(_1e18)
          .div(stake2);
        expect(
          await this.pool.rewardPerToken()
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1.add(rewardPerToken2).add(rewardPerToken3)
        );
        expect(
          await this.pool.earned(wallet1)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1.add(rewardPerToken2).mul(stake1).div(_1e18)
        );
        expect(
          await this.pool.earned(wallet2)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken2.add(rewardPerToken3).mul(stake2).div(_1e18)
        );

        await time.increase(this.DURATION.div(new BN(12))); // increase current time by half a week

        await this.pool.getReward({ from: wallet1 });

        await time.increase(this.DURATION.div(new BN(12))); // increase current time by half a week

        const stake3 = new BN(web3.utils.toWei("5"));
        await this.pool.stake(stake3, { from: wallet3 });
        const stakeTime3 = await time.latest();

        const emptyPeriod1 = stakeTime3.sub(exitTime2);
        th.assertIsApproximatelyEqual(
          await this.pool.periodFinish(),
          stakeTime1.add(this.DURATION)
        );

        expect(
          await this.pool.rewardPerToken()
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1.add(rewardPerToken2).add(rewardPerToken3)
        );
        expect(await this.pool.earned(wallet1)).to.be.bignumber.equal("0");
        expect(
          await this.pool.earned(wallet2)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken2.add(rewardPerToken3).mul(stake2).div(_1e18)
        );
        expect(await this.pool.earned(wallet3)).to.be.bignumber.equal("0");

        await time.increase(this.DURATION.div(new BN(6))); // increase current time by one week

        await this.pool.withdraw(stake3, { from: wallet3 });
        const exitTime3 = await time.latest();

        th.assertIsApproximatelyEqual(
          await this.pool.periodFinish(),
          stakeTime1.add(this.DURATION)
        );

        const timeDiff4 = exitTime3.sub(stakeTime3);
        const rewardPerToken4 = this.rewardRate
          .mul(timeDiff4)
          .mul(_1e18)
          .div(stake3);
        expect(
          await this.pool.rewardPerToken()
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1
            .add(rewardPerToken2)
            .add(rewardPerToken3)
            .add(rewardPerToken4)
        );
        expect(await this.pool.earned(wallet1)).to.be.bignumber.equal("0");
        expect(
          await this.pool.earned(wallet2)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken2.add(rewardPerToken3).mul(stake2).div(_1e18)
        );
        expect(
          await this.pool.earned(wallet3)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken4.mul(stake3).div(_1e18)
        );

        await time.increase(this.DURATION.div(new BN(2)));

        // check that we have reached initial duration
        expect(await time.latest()).to.be.bignumber.gte(
          stakeTime1.add(this.DURATION)
        );

        await this.pool.getReward({ from: wallet3 });

        await time.increase(this.DURATION.div(new BN(12)));

        const stake4 = new BN(web3.utils.toWei("1"));
        await this.pool.stake(stake4, { from: wallet4 });

        th.assertIsApproximatelyEqual(
          await this.pool.periodFinish(),
          stakeTime1.add(this.DURATION)
        );

        await time.increase(this.DURATION.div(new BN(2)));

        expect(
          await this.pool.rewardPerToken()
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken1
            .add(rewardPerToken2)
            .add(rewardPerToken3)
            .add(rewardPerToken4)
        );
        expect(await this.pool.earned(wallet1)).to.be.bignumber.equal("0");
        expect(
          await this.pool.earned(wallet2)
        ).to.be.bignumber.almostEqualDiv1e18(
          rewardPerToken2.add(rewardPerToken3).mul(stake2).div(_1e18)
        );
        expect(await this.pool.earned(wallet3)).to.be.bignumber.equal("0");
        // no rewards for wallet 4 because it staked after the period ended
        expect(await this.pool.earned(wallet4)).to.be.bignumber.equal("0");
      });
    });

    describe("Check reverts", async function () {
      beforeEach(async function () {
        await deploy(this);
      });

      it("Updating reward amount from not owner reverts", async function () {
        await assertRevert(
          this.pool.notifyRewardAmount(0, this.DURATION, { from: wallet1 })
        );
      });

      it("Updating reward amount from owner but with insufficent PREON reverts", async function () {
        const owner = await this.pool.owner();
        expect(
          await this.preon.balanceOf(this.pool.address)
        ).to.be.bignumber.equal("0");
        await assertRevert(
          this.pool.notifyRewardAmount(th.dec(10, 30), this.DURATION, {
            from: owner,
          })
        );
      });

      it("stake with insufficient staked tokens in wallet reverts", async function () {
        const bal = await this.stakedToken.balanceOf(owner);
        await this.stakedToken.approve(this.pool.address, bal);
        await assertRevert(
          this.pool.stake(bal.add(new BN(100000)), { from: owner })
        );
      });

      it("Exit fails", async function () {
        await assertRevert(
          this.pool.exit({ from: wallet1 }),
          "Cannot withdraw 0"
        );
      });
    });
  }
);
