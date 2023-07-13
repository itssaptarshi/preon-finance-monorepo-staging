type InfoRow = {
  title: string;
  value?: number;
  percent?: number;
  tooltip?: string;
};

export const getBalanceInfo = (
  staked: number,
  lpShare: number,
  weeklyRewards: number,
  baseWeeklyReward: number,
  boostWeeklyReward: number,
  accumulateVeYetiOnReward: number,
  stakeShare: number,
  earned?: number,
): InfoRow[] => [
  {
    title: "Total Amount Staked",
    value: staked
  },
  {
    title: "Staked LP Share",
    percent: stakeShare,
    tooltip: "Amount of LP tokens you have staked / Total LP tokens staked in system"
  },
  // {
  //   title: "Weight Share",
  //   percent: stakeShare
  // },
  // {
  //   title: "Estimated Base Reward",
  //   value: baseWeeklyReward,
  //   tooltip: "Estimated amount of rewards you will receive in a week based on your deposit"
  // },
  // {
  //   title: "Estimated Boosted Reward",
  //   value: boostWeeklyReward,
  //   tooltip: "Estimated amount of boosted rewards you will receive in a week based on your deposit and veYETI allocation"
  // },
  {
    title: "Weight Share",
    percent: lpShare,
    tooltip: "Percentage of boosted rewards you earn based on veYETI / LP balances"
  },
  {
    title: "Accumulated veYETI on LP",
    value: accumulateVeYetiOnReward
  },
  {
    title: "Estimated Weekly Base Reward",
    value: baseWeeklyReward,
    tooltip: "Estimated amount of base rewards you will receive in a week based on your deposit"
  },
  {
    title: "Estimated Weekly Boosted Reward",
    value: boostWeeklyReward,
    tooltip: "Estimated amount of boosted rewards you will receive in a week based on your deposit and veYETI allocation"
  }
];

export const getBalanceInfoCollapsed = (
  staked: number,
  stakeShare: number,
  weeklyRewards: number,
  baseWeeklyReward: number,
  boostWeeklyReward: number,
  accumulateVeYetiOnReward: number,
  earned?: number
): InfoRow[] => [
  
];
