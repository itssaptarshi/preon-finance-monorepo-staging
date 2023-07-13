// @ts-nocheck
// @ts-nocheck
import { format, formatWithDecimals } from "../../Utils/number";
import { Decimal, Farm, veYETIStake } from "@liquity/lib-base";

export type FarmPoolRewardsInfo = {
  userBaseRewardShare: number;
  baseAPR: number;
  userAnnualBaseReward: number;
  userBoostedRewardShare: number;
  boostedAPR: number;
  userAnnualBoostedReward: number;
};

// assume adjusted Amount is in the right range when passing in
export const calculateFarmPoolRewards = (
  veYETIStaked: veYETIStake,
  yetiPrice: number,
  boostedFarm: Farm,
  adjustAmount?: number
): FarmPoolRewardsInfo => {
  let userBaseRewardShare: number;

  if (adjustAmount !== undefined) {
    userBaseRewardShare =
      (format(boostedFarm.lpTokenBalance) + adjustAmount) /
      (format(boostedFarm.totalLPStaked) + adjustAmount);
  } else {
    userBaseRewardShare = format(boostedFarm.lpTokenBalance.div(boostedFarm.totalLPStaked));
  }
  const annualBaseReward =
    (format(veYETIStaked.boostRewardRate) *
      365 *
      86400 *
      formatWithDecimals(veYETIStaked.boostBasePartition, 0)) /
    1000;
  // const annualBaseReward = 0 * 365 * 86400 * formatWithDecimals(veYETIStaked.boostBasePartition, 0) / 1000
  const userAnnualBaseReward = userBaseRewardShare * annualBaseReward;
  const baseAPR = (100 * yetiPrice * annualBaseReward) / format(boostedFarm.totalLPStaked);

  let userBoostedRewardShare: number;

  if (adjustAmount !== undefined) {
    let AppliedVeYeti: number;

    if (format(veYETIStaked.yetiStakeOnFarm) == 0 || format(veYETIStaked.boostFactor) == 0) {
      AppliedVeYeti = 0;
    } else {
      AppliedVeYeti =
        Math.pow(format(veYETIStaked.boostFactor), 2) / format(boostedFarm.lpTokenBalance);
    }
    console.log("AppliedVeYeti", AppliedVeYeti);
    const oldFactor = format(veYETIStaked.boostFactor);
    const newFactor = Math.sqrt((format(boostedFarm.lpTokenBalance) + adjustAmount) * AppliedVeYeti);
    const sumOfFactors = format(veYETIStaked.boostSumOfFactors) + newFactor - oldFactor;

    userBoostedRewardShare = newFactor / sumOfFactors;
  } else {
    userBoostedRewardShare = format(veYETIStaked.boostFactor.div(veYETIStaked.boostSumOfFactors));
  }

  const annualBoostedReward =
    (format(veYETIStaked.boostRewardRate) *
      365 *
      86400 *
      (1000 - formatWithDecimals(veYETIStaked.boostBasePartition, 0))) /
    1000;

  const userAnnualBoostedReward = annualBoostedReward * userBoostedRewardShare;

  let boostedAPR =
    ((100 * yetiPrice * annualBoostedReward) /
      (format(boostedFarm.lpTokenBalance) + (adjustAmount !== undefined ? adjustAmount : 0))) *
    userBoostedRewardShare;

  boostedAPR = isNaN(boostedAPR) ? 0 : boostedAPR;

  return {
    userBaseRewardShare,
    baseAPR,
    userAnnualBaseReward,
    userBoostedRewardShare,
    boostedAPR,
    userAnnualBoostedReward
  };
};

export const calculateBoostRewards = (
  veYETIStaked: veYETIStake,
  yetiPrice: number,
  boostedFarm: Farm,
  LPStaked: number,
  veYETIBal: number
): FarmPoolRewardsInfo => {
  let userBoostedRewardShare: number;

  const oldFactor = format(veYETIStaked.boostFactor);
  const newFactor = Math.sqrt((LPStaked * veYETIBal) / 10 ** 4);

  const sumOfFactors = format(veYETIStaked.boostSumOfFactors) + newFactor - oldFactor;

  userBoostedRewardShare = newFactor / sumOfFactors;

  const annualBoostedReward =
    (format(veYETIStaked.boostRewardRate) *
      365 *
      86400 *
      (1000 - formatWithDecimals(veYETIStaked.boostBasePartition, 0))) /
    1000;

  let userAnnualBoostedReward = annualBoostedReward * userBoostedRewardShare;

  userAnnualBoostedReward = isNaN(userAnnualBoostedReward) ? 0 : userAnnualBoostedReward;

  let boostedAPR = ((100 * yetiPrice * annualBoostedReward) / LPStaked) * userBoostedRewardShare;

  boostedAPR = isNaN(boostedAPR) ? 0 : boostedAPR;

  return {
    userBaseRewardShare: 0,
    baseAPR: 0,
    userAnnualBaseReward: 0,
    userBoostedRewardShare,
    boostedAPR,
    userAnnualBoostedReward
  };
};
