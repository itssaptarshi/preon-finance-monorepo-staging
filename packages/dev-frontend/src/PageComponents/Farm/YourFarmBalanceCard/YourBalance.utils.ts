type InfoRow = {
  title: string;
  value?: number;
  percent?: number;
  tooltip?: string;
};

export const getBalanceInfo = (
  staked: number,
  stakeShare: number,
  weeklyRewards: number,
  earned?: number
): InfoRow[] => [
  {
    title: "Total Amount Staked",
    value: staked
  },
  {
    title: "Staking Share",
    percent: stakeShare
  },
  {
    title: "Estimated Weekly Reward",
    value: weeklyRewards,
    tooltip: "Estimated amount of rewards you will receive in a week based on your deposit"
  },
  {
    title: "YETI Rewards Earned",
    value: earned
  }
];
