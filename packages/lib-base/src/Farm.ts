export class Farm {
  lpTokenBalance;
  earnedYETI;
  totalLPStaked;
  rewardRate;
  /** @internal */
  constructor(lpTokenBalance: any, earnedYETI: any, totalLPStaked: any, rewardRate: any) {
    this.lpTokenBalance = lpTokenBalance;
    this.earnedYETI = earnedYETI;
    this.totalLPStaked = totalLPStaked;
    this.rewardRate = rewardRate;
  }
  equals(that: {
    lpTokenBalance: any;
    earnedYETI: any;
    totalLPStaked: any;
    rewardRate: any;
  }): boolean {
    return (
      this.lpTokenBalance.eq(that.lpTokenBalance) &&
      this.earnedYETI.eq(that.earnedYETI) &&
      this.totalLPStaked.eq(that.totalLPStaked) &&
      this.rewardRate.eq(that.rewardRate)
    );
  }
}
