import { Decimal } from "./Decimal";
import { Fees } from "./Fees";
import { veYETIStake } from "./veYETIStake";
import { StabilityDeposit } from "./StabilityDeposit";
import { Trove, TroveWithPendingRedistribution, UserTrove } from "./Trove";
import { FrontendStatus, ReadableLiquity, TroveListingParams } from "./ReadableLiquity";

/** @internal */
export type _ReadableLiquityWithExtraParamsBase<T extends unknown[]> = {
  [P in keyof ReadableLiquity]: ReadableLiquity[P] extends (...params: infer A) => infer R
    ? (...params: [...originalParams: A, ...extraParams: T]) => R
    : never;
};

/** @internal */
export type _LiquityReadCacheBase<T extends unknown[]> = {
  [P in keyof ReadableLiquity]: ReadableLiquity[P] extends (...args: infer A) => Promise<infer R>
    ? (...params: [...originalParams: A, ...extraParams: T]) => R | undefined
    : never;
};

// Overloads get lost in the mapping, so we need to define them again...

/** @internal */
export interface _ReadableLiquityWithExtraParams<T extends unknown[]>
  extends _ReadableLiquityWithExtraParamsBase<T> {
  getTroves(
    params: TroveListingParams & { beforeRedistribution: true },
    ...extraParams: T
  ): Promise<TroveWithPendingRedistribution[]>;

  getTroves(params: TroveListingParams, ...extraParams: T): Promise<UserTrove[]>;
}

/** @internal */
export interface _LiquityReadCache<T extends unknown[]> extends _LiquityReadCacheBase<T> {
  getTroves(
    params: TroveListingParams & { beforeRedistribution: true },
    ...extraParams: T
  ): TroveWithPendingRedistribution[] | undefined;

  getTroves(params: TroveListingParams, ...extraParams: T): UserTrove[] | undefined;
}

/** @internal */
export class _CachedReadableLiquity<T extends unknown[]>
  implements _ReadableLiquityWithExtraParams<T> {
  private _readable: _ReadableLiquityWithExtraParams<T>;
  private _cache: _LiquityReadCache<T>;

  constructor(readable: _ReadableLiquityWithExtraParams<T>, cache: _LiquityReadCache<T>) {
    this._readable = readable;
    this._cache = cache;
  }

  async getTotalRedistributed(...extraParams: T): Promise<Trove> {
    return (
      this._cache.getTotalRedistributed(...extraParams) ??
      this._readable.getTotalRedistributed(...extraParams)
    );
  }

  async getTroveBeforeRedistribution(
    address?: string,
    ...extraParams: T
  ): Promise<TroveWithPendingRedistribution> {
    return (
      this._cache.getTroveBeforeRedistribution(address, ...extraParams) ??
      this._readable.getTroveBeforeRedistribution(address, ...extraParams)
    );
  }

  async getTrove(address?: string, ...extraParams: T): Promise<UserTrove> {
    const [troveBeforeRedistribution, totalRedistributed] = await Promise.all([
      this.getTroveBeforeRedistribution(address, ...extraParams),
      this.getTotalRedistributed(...extraParams)
    ]);

    return troveBeforeRedistribution.applyRedistribution(totalRedistributed);
  }

  async getNumberOfTroves(...extraParams: T): Promise<number> {
    return (
      this._cache.getNumberOfTroves(...extraParams) ??
      this._readable.getNumberOfTroves(...extraParams)
    );
  }

  async getReceiptPerUnderlyingRatios(
    addresses: any,
    vaultTokens: any,
    ...extraParams: any
  ): Promise<any> {
    return (
      this._cache.getReceiptPerUnderlyingRatios(addresses, vaultTokens, ...extraParams) ??
      this._readable.getReceiptPerUnderlyingRatios(addresses, vaultTokens, ...extraParams)
    );
  }

  async getUnderlyingPerReceiptRatios(
    addresses: any,
    vaultTokens: any,
    ...extraParams: any
  ): Promise<any> {
    return (
      this._cache.getUnderlyingPerReceiptRatios(addresses, vaultTokens, ...extraParams) ??
      this._readable.getUnderlyingPerReceiptRatios(addresses, vaultTokens, ...extraParams)
    );
  }

  async getCollPrice(address: string, ...extraParams: any): Promise<any> {
    return (
      this._cache.getCollPrice(address, ...extraParams) ??
      this._readable.getCollPrice(address, ...extraParams)
    );
  }

  async getPrices(addresses: Array<string>, ...extraParams: any): Promise<any> {
    return (
      this._cache.getPrices(addresses, ...extraParams) ??
      this._readable.getPrices(addresses, ...extraParams)
    );
  }

  async getCollPrices(
    addresses: Array<string>,
    vaultTokens: any,
    underlyingDecimals: any,
    ...extraParams: any
  ): Promise<any> {
    return (
      this._cache.getCollPrices(addresses, vaultTokens, underlyingDecimals, ...extraParams) ??
      this._readable.getCollPrices(addresses, vaultTokens, underlyingDecimals, ...extraParams)
    );
  }

  async getUnderlyingDecimals(vaultTokens: any, ...extraParams: any): Promise<any> {
    return (
      this._cache.getUnderlyingDecimals(vaultTokens, ...extraParams) ??
      this._readable.getUnderlyingDecimals(vaultTokens, ...extraParams)
    );
  }

  async getUnderlyingTokens(vaultTokens: any, ...extraParams: any): Promise<any> {
    return (
      this._cache.getUnderlyingTokens(vaultTokens, ...extraParams) ??
      this._readable.getUnderlyingTokens(vaultTokens, ...extraParams)
    );
  }

  async getBalances(addresses: any, ...extraParams: any): Promise<any> {
    // let _a;
    // return (_a = this._cache.getBalances(addresses, ...extraParams)) !== null && _a !== void 0
    //   ? _a
    //   : this._readable.getBalances(addresses, ...extraParams);
    return (
      this._cache.getBalances(addresses, ...extraParams) ??
      this._readable.getBalances(addresses, ...extraParams)
    );
  }
  async getLPBalances(addresses: any, ...extraParams: any): Promise<any> {
    return (
      this._cache.getLPBalances(addresses, ...extraParams) ??
      this._readable.getLPBalances(addresses, ...extraParams)
    );
  }

  async getFarm(address: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getFarm(address, ...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getFarm(address, ...extraParams);
  }

  async getBoostedFarm(address: any, ...extraParams: any) {
    let _a;
    return (_a = this._cache.getBoostedFarm(address, ...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getBoostedFarm(address, ...extraParams);
  }

  async getVEYETIStake(address: any, ...extraParams: any): Promise<any> {
    let _a;
    console.log(address);
    return (_a = this._cache.getVEYETIStake(address, ...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getVEYETIStake(address, ...extraParams);
  }
  async getPoolRewardRate(...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getPoolRewardRate(...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getPoolRewardRate(...extraParams);
  }
  async getRemainingStabilityPoolYETIReward(...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getRemainingStabilityPoolYETIReward(...extraParams)) !== null &&
      _a !== void 0
      ? _a
      : this._readable.getRemainingStabilityPoolYETIReward(...extraParams);
  }

  async getDepositFee(VCInput: any, VCOutput: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getDepositFee(VCInput, VCOutput, ...extraParams)) !== null &&
      _a !== void 0
      ? _a
      : this._readable.getDepositFee(VCInput, VCOutput, ...extraParams);
  }

  async getEstimatedFarmRewards(amount: any, time: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getEstimatedFarmRewards(amount, time, ...extraParams)) !== null &&
      _a !== void 0
      ? _a
      : this._readable.getEstimatedFarmRewards(amount, time, ...extraParams);
  }

  async getEstimatedVeYetiRewards(amount: any, time: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getEstimatedVeYetiRewards(amount, time, ...extraParams)) !== null &&
      _a !== void 0
      ? _a
      : this._readable.getEstimatedVeYetiRewards(amount, time, ...extraParams);
  }
  async getEstimatedYETIPoolRewards(amount: any, time: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getEstimatedYETIPoolRewards(amount, time, ...extraParams)) !== null &&
      _a !== void 0
      ? _a
      : this._readable.getEstimatedYETIPoolRewards(amount, time, ...extraParams);
  }
  // async getRiskiestTrove(...extraParams: T): Promise<TroveWithPendingRedistribution> {
  //   return (
  //     this._cache.getRiskiestTrove(...extraParams) ??
  //     this._readable.getRiskiestTrove(...extraParams)
  //   )
  // }
  async getBalanceERC20(address: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getBalanceERC20(address, ...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getBalanceERC20(address, ...extraParams);
  }

  async getLP(address: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getLP(address, ...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getLP(address, ...extraParams);
  }

  async getYETIBalance(address: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getYETIBalance(address, ...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getYETIBalance(address, ...extraParams);
  }
  async hasClaimableCollateral(address: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.hasClaimableCollateral(address, ...extraParams)) !== null &&
      _a !== void 0
      ? _a
      : this._readable.hasClaimableCollateral(address, ...extraParams);
  }
  async getRedemptionBonus(address: any, ...extraParams: any) {
    let _a;
    return (_a = this._cache.getRedemptionBonus(address, ...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getRedemptionBonus(address, ...extraParams);
  }
  async getRedemptionFeeRate(...extraParams: any) {
    let _a;
    return (_a = this._cache.getRedemptionFeeRate(...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getRedemptionFeeRate(...extraParams);
  }
  async getReceiptPerUnderlying(address: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getReceiptPerUnderlying(address, ...extraParams)) !== null &&
      _a !== void 0
      ? _a
      : this._readable.getReceiptPerUnderlying(address, ...extraParams);
  }
  async getUnderlyingPerReceipt(address: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getUnderlyingPerReceipt(address, ...extraParams)) !== null &&
      _a !== void 0
      ? _a
      : this._readable.getUnderlyingPerReceipt(address, ...extraParams);
  }
  async getUnderlyingDecimal(address: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getUnderlyingDecimal(address, ...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getUnderlyingDecimal(address, ...extraParams);
  }
  async getUnderlyingToken(address: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getUnderlyingToken(address, ...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getUnderlyingToken(address, ...extraParams);
  }
  async getSortedTroveHead(...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getSortedTroveHead(...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getSortedTroveHead(...extraParams);
  }
  async getSortedTroveTail(...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getSortedTroveTail(...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getSortedTroveTail(...extraParams);
  }
  async getSortedTroveSize(...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getSortedTroveSize(...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getSortedTroveSize(...extraParams);
  }
  async getSortedTroveNext(id: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getSortedTroveNext(id, ...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getSortedTroveNext(id, ...extraParams);
  }
  async getSortedTrovePrev(id: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getSortedTrovePrev(id, ...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getSortedTrovePrev(id, ...extraParams);
  }
  async getCurrentAICR(borrower: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getCurrentAICR(borrower, ...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getCurrentAICR(borrower, ...extraParams);
  }
  async getTroveDebt(borrower: any, ...extraParams: any) {
    let _a;
    return (_a = this._cache.getTroveDebt(borrower, ...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getTroveDebt(borrower, ...extraParams);
  }
  async getAllowanceOf(
    owner: any,
    token: any,
    spender: any,
    amount: any,
    ...extraParams: any
  ): Promise<any> {
    let _a;
    return (_a = this._cache.getAllowanceOf(owner, token, spender, amount, ...extraParams)) !==
      null && _a !== void 0
      ? _a
      : this._readable.getAllowanceOf(owner, token, spender, amount, ...extraParams);
  }
  async getYusdAllowance(from: any, to: any, amount: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getYusdAllowance(from, to, amount, ...extraParams)) !== null &&
      _a !== void 0
      ? _a
      : this._readable.getYusdAllowance(from, to, amount, ...extraParams);
  }
  async getYETIPrice(...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getYETIPrice(...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getYETIPrice(...extraParams);
  }
  async getYUSDPrice(...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getYUSDPrice(...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getYUSDPrice(...extraParams);
  }
  async getGlobalBoostFactor(...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getGlobalBoostFactor(...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getGlobalBoostFactor(...extraParams);
  }
  async getDecayedBoost(address: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getDecayedBoost(address, ...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getDecayedBoost(address, ...extraParams);
  }

  async getCollateralSurplusBalancee(...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getCollateralSurplusBalancee(...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getCollateralSurplusBalancee(...extraParams);
  }

  async getVaultTokens(whitelistedCollaterals: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getVaultTokens(whitelistedCollaterals, ...extraParams)) !== null &&
      _a !== void 0
      ? _a
      : this._readable.getVaultTokens(whitelistedCollaterals, ...extraParams);
  }
  async getWhitelistedCollaterals(...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getWhitelistedCollaterals(...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getWhitelistedCollaterals(...extraParams);
  }
  async getICR(userAddress: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getICR(userAddress, ...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getICR(userAddress, ...extraParams);
  }
  async getVcValue(userAddress: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getVcValue(userAddress, ...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getVcValue(userAddress, ...extraParams);
  }
  async getSafetyRatios(addresses: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getSafetyRatios(addresses, ...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getSafetyRatios(addresses, ...extraParams);
  }
  async getRecoveryRatios(addresses: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getRecoveryRatios(addresses, ...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getRecoveryRatios(addresses, ...extraParams);
  }
  async getDecimals(addresses: any, ...extraParams: any): Promise<any> {
    let _a;
    return (_a = this._cache.getDecimals(addresses, ...extraParams)) !== null && _a !== void 0
      ? _a
      : this._readable.getDecimals(addresses, ...extraParams);
  }

  async getTotal(...extraParams: T): Promise<Trove> {
    return this._cache.getTotal(...extraParams) ?? this._readable.getTotal(...extraParams);
  }

  async getStabilityDeposit(address?: string, ...extraParams: T): Promise<StabilityDeposit> {
    return (
      this._cache.getStabilityDeposit(address, ...extraParams) ??
      this._readable.getStabilityDeposit(address, ...extraParams)
    );
  }

  async getYUSDInStabilityPool(...extraParams: T): Promise<Decimal> {
    return (
      this._cache.getYUSDInStabilityPool(...extraParams) ??
      this._readable.getYUSDInStabilityPool(...extraParams)
    );
  }

  async getYUSDBalance(address?: string, ...extraParams: T): Promise<Decimal> {
    return (
      this._cache.getYUSDBalance(address, ...extraParams) ??
      this._readable.getYUSDBalance(address, ...extraParams)
    );
  }

  getTroves(
    params: TroveListingParams & { beforeRedistribution: true },
    ...extraParams: T
  ): Promise<TroveWithPendingRedistribution[]>;

  getTroves(params: TroveListingParams, ...extraParams: T): Promise<UserTrove[]>;

  async getTroves(params: TroveListingParams, ...extraParams: T): Promise<UserTrove[]> {
    const { beforeRedistribution, ...restOfParams } = params;

    const [totalRedistributed, troves] = await Promise.all([
      beforeRedistribution ? undefined : this.getTotalRedistributed(...extraParams),
      this._cache.getTroves({ beforeRedistribution: true, ...restOfParams }, ...extraParams) ??
        this._readable.getTroves({ beforeRedistribution: true, ...restOfParams }, ...extraParams)
    ]);

    if (totalRedistributed) {
      return troves.map(trove => trove.applyRedistribution(totalRedistributed));
    } else {
      return troves;
    }
  }

  async getFees(...extraParams: T): Promise<Fees> {
    return this._cache.getFees(...extraParams) ?? this._readable.getFees(...extraParams);
  }
}
