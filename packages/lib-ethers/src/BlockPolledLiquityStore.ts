import { LiquityStoreState, LiquityStoreBaseState, LiquityStore, Fees } from "@liquity/lib-base";

import { decimalify, promiseAllValues } from "./_utils";
import { ReadableEthersLiquity } from "./ReadableEthersLiquity";
import { EthersLiquityConnection, _getProvider } from "./EthersLiquityConnection";
import { EthersProvider } from "./types";

/**
 * Extra state added to {@link @liquity/lib-base#LiquityStoreState} by
 * {@link BlockPolledLiquityStore}.
 *
 * @public
 */
export interface BlockPolledLiquityStoreExtraState {
  /**
   * Number of block that the store state was fetched from.
   *
   * @remarks
   * May be undefined when the store state is fetched for the first time.
   */
  blockTag?: number;

  /**
   * Timestamp of latest block (number of seconds since epoch).
   */
  blockTimestamp: number;

  /** @internal */
  _feesFactory: (blockTimestamp: number, recoveryMode: boolean) => Fees;
}

/**
 * The type of {@link BlockPolledLiquityStore}'s
 * {@link @liquity/lib-base#LiquityStore.state | state}.
 *
 * @public
 */
export type BlockPolledLiquityStoreState = LiquityStoreState<BlockPolledLiquityStoreExtraState>;

/**
 * Ethers-based {@link @liquity/lib-base#LiquityStore} that updates state whenever there's a new
 * block.
 *
 * @public
 */
export class BlockPolledLiquityStore extends LiquityStore<BlockPolledLiquityStoreExtraState> {
  readonly connection: EthersLiquityConnection;

  private readonly _readable: ReadableEthersLiquity;
  private readonly _provider: EthersProvider;

  constructor(readable: ReadableEthersLiquity) {
    super();

    this.connection = readable.connection;
    this._readable = readable;
    this._provider = _getProvider(readable.connection);
  }

  private async _get(
    blockTag?: number
  ): Promise<[baseState: LiquityStoreBaseState, extraState: BlockPolledLiquityStoreExtraState]> {
    const { userAddress } = this.connection;
    const whitelistedCollaterals = await this._readable.getWhitelistedCollaterals({ blockTag });
    const vaultTokens = await this._readable.getVaultTokens(whitelistedCollaterals, { blockTag });
    const underlyingTokens = await this._readable.getUnderlyingTokens(vaultTokens);
    const tokenBalancesUnderlyingAndWhitelisted = whitelistedCollaterals.concat(underlyingTokens);
    const underlyingDecimals = await this._readable.getUnderlyingDecimals(vaultTokens);
    // const tokenBalancesUnderlyingAndWhitelisted:string[] = whitelistedCollaterals
    const { blockTimestamp } = await promiseAllValues({
      blockTimestamp: this._readable._getBlockTimestamp(blockTag)
    });
    const {
      _feesFactory,
      numberOfTroves,
      poolRewardRate,
      yusdInStabilityPool,
      remainingStabilityPoolYETIReward,
      totalRedistributed,
      total,
      accountBalance,
      yusdBalance,
      yetiBalance,
      stabilityDeposit,
      farm,
      boostedFarm
    } = await promiseAllValues({
      _feesFactory: this._readable._getFeesFactory({ blockTag }),
      numberOfTroves: this._readable.getNumberOfTroves({ blockTag }),
      poolRewardRate: this._readable.getPoolRewardRate({ blockTag }),
      yusdInStabilityPool: this._readable.getYUSDInStabilityPool({ blockTag }),
      remainingStabilityPoolYETIReward: this._readable.getRemainingStabilityPoolYETIReward({
        blockTag
      }),
      totalRedistributed: this._readable.getTotalRedistributed({ blockTag }),
      total: this._readable.getTotal({ blockTag }),
      accountBalance: this._provider
        .getBalance(userAddress !== null && userAddress !== void 0 ? userAddress : "0", blockTag)
        .then(decimalify),
      yusdBalance: this._readable.getYUSDBalance(userAddress, { blockTag }),
      yetiBalance: this._readable.getYETIBalance(userAddress, { blockTag }),
      stabilityDeposit: this._readable.getStabilityDeposit(userAddress, { blockTag }),
      farm: this._readable.getFarm(userAddress, { blockTag }),
      boostedFarm: this._readable.getBoostedFarm(userAddress, { blockTag })
    });
    const {
      veYETIStaked,
      collateralSurplusBalance,
      troveBeforeRedistribution,
      underlyingPrices,
      tokenBalances,
      lpTokenBalance,
      icr,
      vcValue,
      recoveryRatios,
      safetyRatios,
      decimals,
      YETIPrice,
      YUSDPrice,
      globalBoostFactor,
      decayedBoost,
      prices,
      receiptPerUnderlyingRatios,
      underlyingPerReceiptRatios
    } = await promiseAllValues({
      veYETIStaked: this._readable.getVEYETIStake(userAddress, { blockTag }),
      collateralSurplusBalance: this._readable.getCollateralSurplusBalancee({ blockTag }),
      troveBeforeRedistribution: this._readable.getTroveBeforeRedistribution(userAddress, {
        blockTag
      }),
      underlyingPrices: this._readable.getCollPrices(
        whitelistedCollaterals,
        vaultTokens,
        underlyingDecimals,
        { blockTag }
      ),
      prices: this._readable.getPrices(whitelistedCollaterals),
      tokenBalances: this._readable.getBalances(tokenBalancesUnderlyingAndWhitelisted),
      lpTokenBalance: this._readable.getLPBalances(userAddress, { blockTag }),
      // @ts-expect-error: blockTag
      icr: this._readable.getICR(userAddress, { blockTag }),
      vcValue: this._readable.getVcValue(userAddress, { blockTag }),
      safetyRatios: this._readable.getSafetyRatios(whitelistedCollaterals),
      recoveryRatios: this._readable.getRecoveryRatios(whitelistedCollaterals),
      decimals: this._readable.getDecimals(whitelistedCollaterals),
      YETIPrice: this._readable.getYETIPrice(),
      YUSDPrice: this._readable.getYUSDPrice(),
      globalBoostFactor: this._readable.getGlobalBoostFactor(),
      decayedBoost: this._readable.getDecayedBoost(userAddress),
      receiptPerUnderlyingRatios: this._readable.getReceiptPerUnderlyingRatios(
        whitelistedCollaterals,
        vaultTokens
      ),
      underlyingPerReceiptRatios: this._readable.getUnderlyingPerReceiptRatios(
        whitelistedCollaterals,
        vaultTokens
      )
    });
    return [
      {
        underlyingPrices,
        numberOfTroves,
        totalRedistributed,
        total,
        poolRewardRate,
        yusdInStabilityPool,
        remainingStabilityPoolYETIReward,
        accountBalance,
        tokenBalances,
        lpTokenBalance,
        yusdBalance,
        yetiBalance,
        collateralSurplusBalance,
        troveBeforeRedistribution,
        stabilityDeposit,
        farm,
        boostedFarm,
        veYETIStaked,
        _feesInNormalMode: _feesFactory(blockTimestamp, false),
        whitelistedCollaterals,
        icr,
        vcValue,
        safetyRatios,
        recoveryRatios,
        decimals,
        YETIPrice,
        YUSDPrice,
        globalBoostFactor,
        decayedBoost,
        prices,
        vaultTokens,
        receiptPerUnderlyingRatios,
        underlyingPerReceiptRatios,
        underlyingDecimals,
        underlyingTokens
      },
      {
        blockTag,
        blockTimestamp,
        _feesFactory
      }
    ];
  }

  /** @internal @override */
  protected _doStart(): () => void {
    this._get().then(state => {
      if (!this._loaded) {
        this._load(...state);
      }
    });

    const blockListener = async (blockTag: number) => {
      const state = await this._get(blockTag);

      if (this._loaded) {
        this._update(...state);
      } else {
        this._load(...state);
      }
    };

    this._provider.on("block", blockListener);

    return () => {
      this._provider.off("block", blockListener);
    };
  }

  /** @internal @override */
  protected _reduceExtra(
    oldState: BlockPolledLiquityStoreExtraState,
    stateUpdate: Partial<BlockPolledLiquityStoreExtraState>
  ): BlockPolledLiquityStoreExtraState {
    return {
      blockTag: stateUpdate.blockTag ?? oldState.blockTag,
      blockTimestamp: stateUpdate.blockTimestamp ?? oldState.blockTimestamp,
      _feesFactory: stateUpdate._feesFactory ?? oldState._feesFactory
    };
  }
}
