import { Decimal } from "./Decimal";
import { Trove, TroveWithPendingRedistribution, UserTrove } from "./Trove";
import { StabilityDeposit } from "./StabilityDeposit";
import { Fees } from "./Fees";

/**
 * Represents whether an address has been registered as a Liquity frontend.
 *
 * @remarks
 * Returned by the {@link ReadableLiquity.getFrontendStatus | getFrontendStatus()} function.
 *
 * When `status` is `"registered"`, `kickbackRate` gives the frontend's kickback rate as a
 * {@link Decimal} between 0 and 1.
 *
 * @public
 */
export type FrontendStatus =
  | { status: "unregistered" }
  | { status: "registered"; kickbackRate: Decimal };

/**
 * Parameters of the {@link ReadableLiquity.(getTroves:2) | getTroves()} function.
 *
 * @public
 */
export interface TroveListingParams {
  /** Number of Troves to retrieve. */
  readonly first: number;

  /** How the Troves should be sorted. */
  readonly sortedBy: "ascendingCollateralRatio" | "descendingCollateralRatio";

  /** Index of the first Trove to retrieve from the sorted list. */
  readonly startingAt?: number;

  /**
   * When set to `true`, the retrieved Troves won't include the liquidation shares received since
   * the last time they were directly modified.
   *
   * @remarks
   * Changes the type of returned Troves to {@link TroveWithPendingRedistribution}.
   */
  readonly beforeRedistribution?: boolean;
}

/**
 * Read the state of the Liquity protocol.
 *
 * @remarks
 * Implemented by {@link @liquity/lib-ethers#EthersLiquity}.
 *
 * @public
 */
export interface ReadableLiquity {
  /**
   * Get the total collateral and debt per stake that has been liquidated through redistribution.
   *
   * @remarks
   * Needed when dealing with instances of {@link @liquity/lib-base#TroveWithPendingRedistribution}.
   */
  getTotalRedistributed(): Promise<Trove>;

  /**
   * Get a Trove in its state after the last direct modification.
   *
   * @param address - Address that owns the Trove.
   *
   * @remarks
   * The current state of a Trove can be fetched using
   * {@link @liquity/lib-base#ReadableLiquity.getTrove | getTrove()}.
   */
  getTroveBeforeRedistribution(address?: string): Promise<TroveWithPendingRedistribution>;

  /**
   * Get the current state of a Trove.
   *
   * @param address - Address that owns the Trove.
   */
  getTrove(address?: string): Promise<UserTrove>;

  /**
   * Get number of Troves that are currently open.
   */
  getNumberOfTroves(): Promise<number>;

  /**
   * Get the total amount of collateral and debt in the Liquity system.
   */
  getTotal(): Promise<Trove>;

  /**
   * Get the current state of a Stability Deposit.
   *
   * @param address - Address that owns the Stability Deposit.
   */
  getStabilityDeposit(address?: string): Promise<StabilityDeposit>;

  /**
   * Get the total amount of YUSD currently deposited in the Stability Pool.
   */
  getYUSDInStabilityPool(): Promise<Decimal>;

  /**
   * Get the amount of YUSD held by an address.
   *
   * @param address - Address whose balance should be retrieved.
   */
  getYUSDBalance(address?: string): Promise<Decimal>;

  /** @internal */
  getTroves(
    params: TroveListingParams & { beforeRedistribution: true }
  ): Promise<TroveWithPendingRedistribution[]>;

  /**
   * Get a slice from the list of Troves.
   *
   * @param params - Controls how the list is sorted, and where the slice begins and ends.
   * @returns Pairs of owner addresses and their Troves.
   */
  getTroves(params: TroveListingParams): Promise<UserTrove[]>;

  /**
   * Get a calculator for current fees.
   */
  getFees(): Promise<Fees>;

  getReceiptPerUnderlyingRatios(addresses: string[], vaultTokens: any): Promise<any>;
  getUnderlyingPerReceiptRatios(addresses: string[], vaultTokens: any): Promise<any>;
  getCollPrice(address: string): Promise<any>;
  getPrices(addresses: string[]): Promise<any>;
  getCollPrices(addresses: string[], vaultTokens: any, underlyingDecimals: any): Promise<any>;
  getUnderlyingDecimals(vaultTokens: any): Promise<any>;
  getUnderlyingTokens(vaultTokens: any): Promise<any>;
  getBalances(addresses: string[]): Promise<any>;
  getLPBalances(addresses: string[]): Promise<any>;
  getFarm(addresses: string): Promise<any>;
  getBoostedFarm(addresses: string): Promise<any>;
  getVEYETIStake(addresses: string): Promise<any>;
  getPoolRewardRate(): Promise<any>;
  getRemainingStabilityPoolYETIReward(): Promise<any>;
  getDepositFee(VCInput: any, VCOutput: any): Promise<any>;
  getEstimatedFarmRewards(amount: any, time: any): Promise<any>;
  getEstimatedVeYetiRewards(amount: any, time: any): Promise<any>;
  getEstimatedYETIPoolRewards(amount: any, time: any): Promise<any>;
  getBalanceERC20(addresses: string): Promise<any>;
  getLP(addresses: string): Promise<any>;
  getYETIBalance(addresses: string): Promise<any>;
  hasClaimableCollateral(addresses: string): Promise<any>;
  getRedemptionBonus(addresses: string): Promise<any>;
  getRedemptionFeeRate(): Promise<any>;
  getReceiptPerUnderlying(addresses: string): Promise<any>;
  getUnderlyingPerReceipt(addresses: string): Promise<any>;
  getUnderlyingDecimal(addresses: string): Promise<any>;
  getUnderlyingToken(addresses: string): Promise<any>;
  getSortedTroveHead(): Promise<any>;
  getSortedTroveTail(): Promise<any>;
  getSortedTroveSize(): Promise<any>;
  getSortedTroveNext(id: any): Promise<any>;
  getSortedTrovePrev(id: any): Promise<any>;
  getCurrentAICR(borrower: any): Promise<any>;
  getTroveDebt(borrower: any): Promise<any>;
  getAllowanceOf(owner: any, token: any, spender: any, amount: any): Promise<any>;
  getYusdAllowance(from: any, to: any, amount: any): Promise<any>;
  getYETIPrice(): Promise<any>;
  getYUSDPrice(): Promise<any>;
  getGlobalBoostFactor(): Promise<any>;
  getDecayedBoost(addresses: string): Promise<any>;
  getCollateralSurplusBalancee(): Promise<any>;
  getVaultTokens(whitelistedCollaterals: any): Promise<any>;
  getWhitelistedCollaterals(): Promise<any>;
  getICR(useraddresses: string): Promise<any>;
  getVcValue(useraddresses: string): Promise<any>;
  getSafetyRatios(addresses: string[]): Promise<any>;
  getRecoveryRatios(addresses: string[]): Promise<any>;
  getDecimals(addresses: string[]): Promise<any>;
}
