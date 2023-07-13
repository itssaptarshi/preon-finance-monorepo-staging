import { Decimal, Decimalish } from "./Decimal";

/**
 * Represents the change between two states of a veYETI Stake.
 *
 * @public
 */
export class veYETIStake {
  yetiStake: any;
  veYETIGain: any;
  veYETITotal: any;
  totalUserYeti: any;
  totalYeti: any;
  yetiEarned: any;
  rewardRate: any;
  accumulationRate: any;
  boostAmount: any;
  boostFactor: any;
  boostRewardRate: any;
  boostBasePartition: any;
  yetiStakeOnFarm: any;
  boostSumOfFactors: any;
  veYetiOnFarm: any;
  boostTotalSupply: any;

  /** @internal */
  constructor(
    yetiStake = Decimal.ZERO,
    veYETIGain = Decimal.ZERO,
    veYETITotal = Decimal.ZERO,
    totalUserYeti = Decimal.ZERO,
    totalYeti = Decimal.ZERO,
    yetiEarned = Decimal.ZERO,
    rewardRate = Decimal.ZERO,
    accumulationRate = Decimal.ZERO,
    boostAmount = Decimal.ZERO,
    boostFactor = Decimal.ZERO,
    boostRewardRate = Decimal.ZERO,
    boostBasePartition = Decimal.ZERO,
    yetiStakeOnFarm = Decimal.ZERO,
    boostSumOfFactors = Decimal.ZERO,
    veYetiOnFarm = Decimal.ZERO,
    boostTotalSupply = Decimal.ZERO
  ) {
    this.yetiStake = yetiStake;
    this.veYETIGain = veYETIGain;
    this.veYETITotal = veYETITotal;
    this.totalUserYeti = totalUserYeti;
    this.totalYeti = totalYeti;
    this.yetiEarned = yetiEarned;
    this.rewardRate = rewardRate;
    this.accumulationRate = accumulationRate;
    this.boostAmount = boostAmount;
    this.boostFactor = boostFactor;
    this.boostRewardRate = boostRewardRate;
    this.boostBasePartition = boostBasePartition;
    this.yetiStakeOnFarm = yetiStakeOnFarm;
    this.boostSumOfFactors = boostSumOfFactors;
    (this.veYetiOnFarm = veYetiOnFarm), (this.boostTotalSupply = boostTotalSupply);
  }
  get isEmpty(): boolean {
    return this.yetiStake.isZero && this.veYETIGain.isZero && this.veYETITotal.isZero;
  }
  /**
   * Compare to another instance of `YETIStake`.
   */
  equals(that: any): boolean {
    return (
      this.yetiStake.eq(that.yetiStake) &&
      this.veYETIGain.eq(that.veYETIGain) &&
      this.veYETITotal.eq(that.veYETITotal)
    );
  }
}
