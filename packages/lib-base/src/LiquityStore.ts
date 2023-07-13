import assert from "assert";

import { Decimal } from "./Decimal";
import { StabilityDeposit } from "./StabilityDeposit";
import { Trove, TroveWithPendingRedistribution, UserTrove } from "./Trove";
import { Fees } from "./Fees";

/**
 * State variables read from the blockchain.
 *
 * @public
 */

export interface LiquityStoreBaseState {
  /** Number of Troves that are currently open. */
  numberOfTroves: number;

  /** User's native currency balance (e.g. Ether). */
  accountBalance: Decimal;

  tokenBalances: any;

  lpTokenBalance: any;

  /** User's YUSD token balance. */
  yusdBalance: Decimal;

  /** User's YETI token balance. */
  yetiBalance: Decimal;

  /**
   * Amount of leftover collateral available for withdrawal to the user.
   *
   * @remarks
   * See {@link ReadableLiquity.getCollateralSurplusBalance | getCollateralSurplusBalance()} for
   * more information.
   */
  collateralSurplusBalance: Decimal;

  underlyingPrices: any;
  prices: any;

  poolRewardRate: Decimal;
  /** Total amount of YUSD currently deposited in the Stability Pool. */
  yusdInStabilityPool: Decimal;

  /** Total collateral and debt in the Liquity system. */
  total: Trove;

  /**
   * Total collateral and debt per stake that has been liquidated through redistribution.
   *
   * @remarks
   * Needed when dealing with instances of {@link TroveWithPendingRedistribution}.
   */
  totalRedistributed: Trove;

  /**
   * User's Trove in its state after the last direct modification.
   *
   * @remarks
   * The current state of the user's Trove can be found as
   * {@link LiquityStoreDerivedState.trove | trove}.
   */
  troveBeforeRedistribution: TroveWithPendingRedistribution;

  /** User's stability deposit. */
  stabilityDeposit: StabilityDeposit;

  farm: any;
  boostedFarm: any;
  veYETIStaked: any;
  remainingStabilityPoolYETIReward: any;

  /** Remaining YETI that will be collectively rewarded to liquidity miners. */
  // remainingLiquidityMiningYETIReward: Decimal;
  // liquityMiningStake: Decimal;

  /** @internal */
  _feesInNormalMode: Fees;

  whitelistedCollaterals: any;
  vaultTokens: any;
  underlyingTokens: any;
  icr: any;
  vcValue: any;
  safetyRatios: any;
  recoveryRatios: any;
  decimals: any;
  YETIPrice: any;
  YUSDPrice: any;
  globalBoostFactor: any;
  decayedBoost: any;
  receiptPerUnderlyingRatios: any;
  underlyingPerReceiptRatios: any;
  underlyingDecimals: any;
}

/**
 * State variables derived from {@link LiquityStoreBaseState}.
 *
 * @public
 */
export interface LiquityStoreDerivedState {
  /** Current state of user's Trove */
  trove: UserTrove;

  /** Calculator for current fees. */
  fees: Fees;

  /**
   * Current borrowing rate.
   *
   * @remarks
   * A value between 0 and 1.
   *
   * @example
   * For example a value of 0.01 amounts to a borrowing fee of 1% of the borrowed amount.
   */
  borrowingRate: Decimal;

  /**
   * Current redemption rate.
   *
   * @remarks
   * Note that the actual rate paid by a redemption transaction will depend on the amount of YUSD
   * being redeemed.
   *
   * Use {@link Fees.redemptionRate} to calculate a precise redemption rate.
   */
  redemptionRate: Decimal;

  // /**
  //  * Whether there are any Troves with collateral ratio below the
  //  * {@link MINIMUM_COLLATERAL_RATIO | minimum}.
  //  */
  // haveUndercollateralizedTroves: boolean;
}

/**
 * Type of {@link LiquityStore}'s {@link LiquityStore.state | state}.
 *
 * @remarks
 * It combines all properties of {@link LiquityStoreBaseState} and {@link LiquityStoreDerivedState}
 * with optional extra state added by the particular `LiquityStore` implementation.
 *
 * The type parameter `T` may be used to type the extra state.
 *
 * @public
 */
export type LiquityStoreState<T = unknown> = LiquityStoreBaseState & LiquityStoreDerivedState & T;

/**
 * Parameters passed to {@link LiquityStore} listeners.
 *
 * @remarks
 * Use the {@link LiquityStore.subscribe | subscribe()} function to register a listener.

 * @public
 */
export interface LiquityStoreListenerParams<T = unknown> {
  /** The entire previous state. */
  newState: LiquityStoreState<T>;

  /** The entire new state. */
  oldState: LiquityStoreState<T>;

  /** Only the state variables that have changed. */
  stateChange: Partial<LiquityStoreState<T>>;
}

const strictEquals = <T>(a: T, b: T) => a === b;
const eq = <T extends { eq(that: T): boolean }>(a: T, b: T) => a.eq(b);
const equals = <T extends { equals(that: T): boolean }>(a: T, b: T) => a.equals(b);

const wrap = <A extends unknown[], R>(f: (...args: A) => R) => (...args: A) => f(...args);
// TODO FIX TYPEDEFS
const compareMaps = (map1: any, map2: any): boolean => {
  let testVal;
  if (map1.size !== map2.size) {
    return false;
  }
  for (const key in map1) {
    testVal = map2[key];
    // in cases of an undefined value, make sure the key
    // actually exists on the object so there are no false positives
    if (testVal.hex !== map1[key].hex || (testVal === undefined && !map2[key])) {
      return false;
    }
  }
  return true;
};
// TODO FIX TYPEDEFS
function compareArrays(arr1: any, arr2: any) {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}

const difference = <T>(a: T, b: T) =>
  Object.fromEntries(
    Object.entries(a).filter(([key, value]) => value !== (b as Record<string, unknown>)[key])
  ) as Partial<T>;

/**
 * Abstract base class of Liquity data store implementations.
 *
 * @remarks
 * The type parameter `T` may be used to type extra state added to {@link LiquityStoreState} by the
 * subclass.
 *
 * Implemented by {@link @liquity/lib-ethers#BlockPolledLiquityStore}.
 *
 * @public
 */
export abstract class LiquityStore<T = unknown> {
  /** Turn console logging on/off. */
  logging = false;

  /**
   * Called after the state is fetched for the first time.
   *
   * @remarks
   * See {@link LiquityStore.start | start()}.
   */
  onLoaded?: () => void;

  /** @internal */
  protected _loaded = false;

  private _baseState?: LiquityStoreBaseState;
  private _derivedState?: LiquityStoreDerivedState;
  private _extraState?: T;

  private _updateTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private _listeners = new Set<(params: LiquityStoreListenerParams<T>) => void>();

  /**
   * The current store state.
   *
   * @remarks
   * Should not be accessed before the store is loaded. Assign a function to
   * {@link LiquityStore.onLoaded | onLoaded} to get a callback when this happens.
   *
   * See {@link LiquityStoreState} for the list of properties returned.
   */
  get state(): LiquityStoreState<T> {
    return Object.assign({}, this._baseState, this._derivedState, this._extraState);
  }

  /** @internal */
  protected abstract _doStart(): () => void;

  /**
   * Start monitoring the blockchain for Liquity state changes.
   *
   * @remarks
   * The {@link LiquityStore.onLoaded | onLoaded} callback will be called after the state is fetched
   * for the first time.
   *
   * Use the {@link LiquityStore.subscribe | subscribe()} function to register listeners.
   *
   * @returns Function to stop the monitoring.
   */
  start(): () => void {
    const doStop = this._doStart();

    return () => {
      doStop();

      this._cancelUpdateIfScheduled();
    };
  }

  private _cancelUpdateIfScheduled() {
    if (this._updateTimeoutId !== undefined) {
      clearTimeout(this._updateTimeoutId);
    }
  }

  private _scheduleUpdate() {
    this._cancelUpdateIfScheduled();

    this._updateTimeoutId = setTimeout(() => {
      this._updateTimeoutId = undefined;
      this._update();
    }, 30000);
  }

  private _logUpdate<U>(name: string, next: U, show?: (next: U) => string): U {
    if (this.logging) {
      // console.log(`${name} updated to ${show ? show(next) : next}`);
    }

    return next;
  }

  private _updateIfChanged<U>(
    equals: (a: U, b: U) => boolean,
    name: string,
    prev: U,
    next?: U,
    show?: (next: U) => string
  ): U {
    return next !== undefined && !equals(prev, next) ? this._logUpdate(name, next, show) : prev;
  }

  private _silentlyUpdateIfChanged<U>(equals: (a: U, b: U) => boolean, prev: U, next?: U): U {
    return next !== undefined && !equals(prev, next) ? next : prev;
  }

  private _updateFees(name: string, prev: Fees, next?: Fees): Fees {
    if (next && !next.equals(prev)) {
      // Filter out fee update spam that happens on every new block by only logging when string
      // representation changes.
      if (`${next}` !== `${prev}`) {
        this._logUpdate(name, next);
      }
      return next;
    } else {
      return prev;
    }
  }

  private _reduce(
    baseState: LiquityStoreBaseState,
    baseStateUpdate: Partial<LiquityStoreBaseState>
  ): LiquityStoreBaseState {
    return {
      numberOfTroves: this._updateIfChanged(
        strictEquals,
        "numberOfTroves",
        baseState.numberOfTroves,
        baseStateUpdate.numberOfTroves
      ),
      accountBalance: this._updateIfChanged(
        eq,
        "accountBalance",
        baseState.accountBalance,
        baseStateUpdate.accountBalance
      ),
      tokenBalances: this._updateIfChanged(
        compareMaps,
        "tokenBalance",
        baseState.tokenBalances,
        baseStateUpdate.tokenBalances
      ),
      lpTokenBalance: this._updateIfChanged(
        eq,
        "tokenBalance",
        baseState.lpTokenBalance,
        baseStateUpdate.lpTokenBalance
      ),
      yusdBalance: this._updateIfChanged(
        eq,
        "yusdBalance",
        baseState.yusdBalance,
        baseStateUpdate.yusdBalance
      ),
      yetiBalance: this._updateIfChanged(
        eq,
        "yetiBalance",
        baseState.yetiBalance,
        baseStateUpdate.yetiBalance
      ),
      collateralSurplusBalance: this._updateIfChanged(
        compareMaps,
        "collateralSurplusBalance",
        baseState.collateralSurplusBalance,
        baseStateUpdate.collateralSurplusBalance
      ),
      underlyingPrices: this._updateIfChanged(
        compareMaps,
        "underlyingPrices",
        baseState.underlyingPrices,
        baseStateUpdate.underlyingPrices
      ),
      prices: this._updateIfChanged(compareMaps, "prices", baseState.prices, baseStateUpdate.prices),
      poolRewardRate: this._updateIfChanged(
        eq,
        "yusdInStabilityPool",
        baseState.poolRewardRate,
        baseStateUpdate.poolRewardRate
      ),
      yusdInStabilityPool: this._updateIfChanged(
        eq,
        "yusdInStabilityPool",
        baseState.yusdInStabilityPool,
        baseStateUpdate.yusdInStabilityPool
      ),
      total: this._updateIfChanged(equals, "total", baseState.total, baseStateUpdate.total),
      totalRedistributed: this._updateIfChanged(
        equals,
        "totalRedistributed",
        baseState.totalRedistributed,
        baseStateUpdate.totalRedistributed
      ),
      troveBeforeRedistribution: this._updateIfChanged(
        equals,
        "troveBeforeRedistribution",
        baseState.troveBeforeRedistribution,
        baseStateUpdate.troveBeforeRedistribution
      ),
      stabilityDeposit: this._updateIfChanged(
        equals,
        "stabilityDeposit",
        baseState.stabilityDeposit,
        baseStateUpdate.stabilityDeposit
      ),
      farm: this._updateIfChanged(equals, "farm", baseState.farm, baseStateUpdate.farm),
      boostedFarm: this._updateIfChanged(
        equals,
        "boostedFarm",
        baseState.boostedFarm,
        baseStateUpdate.boostedFarm
      ),
      veYETIStaked: this._updateIfChanged(
        equals,
        "farm",
        baseState.veYETIStaked,
        baseStateUpdate.veYETIStaked
      ),
      remainingStabilityPoolYETIReward: this._silentlyUpdateIfChanged(
        eq,
        baseState.remainingStabilityPoolYETIReward,
        baseStateUpdate.remainingStabilityPoolYETIReward
      ),
      _feesInNormalMode: this._silentlyUpdateIfChanged(
        equals,
        baseState._feesInNormalMode,
        baseStateUpdate._feesInNormalMode
      ),
      whitelistedCollaterals: this._updateIfChanged(
        compareArrays,
        "whitelistedCollaterals",
        baseState.whitelistedCollaterals,
        baseStateUpdate.whitelistedCollaterals
      ),
      vaultTokens: this._updateIfChanged(
        compareArrays,
        "vaultTokens",
        baseState.vaultTokens,
        baseStateUpdate.vaultTokens
      ),
      underlyingTokens: this._updateIfChanged(
        compareArrays,
        "underlyingTokens",
        baseState.underlyingTokens,
        baseStateUpdate.underlyingTokens
      ),
      icr: this._updateIfChanged(eq, "icr", baseState.icr, baseStateUpdate.icr),
      vcValue: this._updateIfChanged(eq, "vcValue", baseState.vcValue, baseStateUpdate.vcValue),
      safetyRatios: this._updateIfChanged(
        compareMaps,
        "safetyRatios",
        baseState.safetyRatios,
        baseStateUpdate.safetyRatios
      ),
      recoveryRatios: this._updateIfChanged(
        compareMaps,
        "recoveryRatios",
        baseState.recoveryRatios,
        baseStateUpdate.recoveryRatios
      ),
      decimals: this._updateIfChanged(
        compareMaps,
        "decimals",
        baseState.decimals,
        baseStateUpdate.decimals
      ),
      YETIPrice: this._updateIfChanged(
        eq,
        "YETIPrice",
        baseState.YETIPrice,
        baseStateUpdate.YETIPrice
      ),
      YUSDPrice: this._updateIfChanged(
        eq,
        "YUSDPrice",
        baseState.YUSDPrice,
        baseStateUpdate.YUSDPrice
      ),
      globalBoostFactor: this._updateIfChanged(
        eq,
        "globalBoostFactor",
        baseState.globalBoostFactor,
        baseStateUpdate.globalBoostFactor
      ),
      decayedBoost: this._updateIfChanged(
        eq,
        "decayedBoost",
        baseState.decayedBoost,
        baseStateUpdate.decayedBoost
      ),
      receiptPerUnderlyingRatios: this._updateIfChanged(
        compareMaps,
        "receiptPerUnderlyingRatios",
        baseState.receiptPerUnderlyingRatios,
        baseStateUpdate.receiptPerUnderlyingRatios
      ),
      underlyingPerReceiptRatios: this._updateIfChanged(
        compareMaps,
        "underlyingPerReceiptRatios",
        baseState.underlyingPerReceiptRatios,
        baseStateUpdate.underlyingPerReceiptRatios
      ),
      underlyingDecimals: this._updateIfChanged(
        compareMaps,
        "underlyingDecimals",
        baseState.underlyingDecimals,
        baseStateUpdate.underlyingDecimals
      )
    };
  }

  private _derive({
    troveBeforeRedistribution,
    totalRedistributed,
    _feesInNormalMode,
    total,
    prices,
    recoveryRatios
  }: LiquityStoreBaseState): LiquityStoreDerivedState {
    const fees = _feesInNormalMode._setRecoveryMode(
      total.collateralRatioIsBelowCritical(prices, recoveryRatios)
    );

    return {
      trove: troveBeforeRedistribution.applyRedistribution(totalRedistributed),
      fees,
      borrowingRate: fees.borrowingRate(),
      redemptionRate: fees.redemptionRate()
    };
  }

  private _reduceDerived(
    derivedState: LiquityStoreDerivedState,
    derivedStateUpdate: LiquityStoreDerivedState
  ): LiquityStoreDerivedState {
    return {
      fees: this._updateFees("fees", derivedState.fees, derivedStateUpdate.fees),

      trove: this._updateIfChanged(equals, "trove", derivedState.trove, derivedStateUpdate.trove),

      borrowingRate: this._silentlyUpdateIfChanged(
        eq,
        derivedState.borrowingRate,
        derivedStateUpdate.borrowingRate
      ),

      redemptionRate: this._silentlyUpdateIfChanged(
        eq,
        derivedState.redemptionRate,
        derivedStateUpdate.redemptionRate
      )
    };
  }

  /** @internal */
  protected abstract _reduceExtra(extraState: T, extraStateUpdate: Partial<T>): T;

  private _notify(params: LiquityStoreListenerParams<T>) {
    // Iterate on a copy of `_listeners`, to avoid notifying any new listeners subscribed by
    // existing listeners, as that could result in infinite loops.
    //
    // Before calling a listener from our copy of `_listeners`, check if it has been removed from
    // the original set. This way we avoid calling listeners that have already been unsubscribed
    // by an earlier listener callback.
    [...this._listeners].forEach(listener => {
      if (this._listeners.has(listener)) {
        listener(params);
      }
    });
  }

  /**
   * Register a state change listener.
   *
   * @param listener - Function that will be called whenever state changes.
   * @returns Function to unregister this listener.
   */
  subscribe(listener: (params: LiquityStoreListenerParams<T>) => void): () => void {
    const uniqueListener = wrap(listener);

    this._listeners.add(uniqueListener);

    return () => {
      this._listeners.delete(uniqueListener);
    };
  }

  /** @internal */
  protected _load(baseState: LiquityStoreBaseState, extraState?: T): void {
    assert(!this._loaded);

    this._baseState = baseState;
    this._derivedState = this._derive(baseState);
    this._extraState = extraState;
    this._loaded = true;

    this._scheduleUpdate();

    if (this.onLoaded) {
      this.onLoaded();
    }
  }

  /** @internal */
  protected _update(
    baseStateUpdate?: Partial<LiquityStoreBaseState>,
    extraStateUpdate?: Partial<T>
  ): void {
    assert(this._baseState && this._derivedState);

    const oldState = this.state;

    if (baseStateUpdate) {
      this._baseState = this._reduce(this._baseState, baseStateUpdate);
    }

    // Always running this lets us derive state based on passage of time, like baseRate decay
    this._derivedState = this._reduceDerived(this._derivedState, this._derive(this._baseState));

    if (extraStateUpdate) {
      assert(this._extraState);
      this._extraState = this._reduceExtra(this._extraState, extraStateUpdate);
    }

    this._scheduleUpdate();

    this._notify({
      newState: this.state,
      oldState,
      stateChange: difference(this.state, oldState)
    });
  }
}
