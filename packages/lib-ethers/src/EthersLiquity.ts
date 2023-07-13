// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck: Testing
import { BlockTag } from "@ethersproject/abstract-provider";

import {
  CollateralGainTransferDetails,
  Decimal,
  Decimalish,
  FailedReceipt,
  Fees,
  FrontendStatus,
  LiquidationDetails,
  LiquityStore,
  veYETIStake,
  RedemptionDetails,
  StabilityDeposit,
  StabilityDepositChangeDetails,
  StabilityPoolGainsWithdrawalDetails,
  TransactableLiquity,
  TransactionFailedError,
  Trove,
  TroveAdjustmentDetails,
  TroveAdjustmentParams,
  TroveClosureDetails,
  TroveCreationDetails,
  TroveCreationParams,
  TroveListingParams,
  TroveWithPendingRedistribution,
  UserTrove
} from "@liquity/lib-base";

import {
  EthersLiquityConnection,
  EthersLiquityConnectionOptionalParams,
  EthersLiquityStoreOption,
  _connect,
  _usingStore
} from "./EthersLiquityConnection";

import {
  EthersCallOverrides,
  EthersProvider,
  EthersSigner,
  EthersTransactionOverrides,
  EthersTransactionReceipt
} from "./types";

import {
  BorrowingOperationOptionalParams,
  PopulatableEthersLiquity,
  SentEthersLiquityTransaction
} from "./PopulatableEthersLiquity";
import { ReadableEthersLiquity, ReadableEthersLiquityWithStore } from "./ReadableEthersLiquity";
import { SendableEthersLiquity } from "./SendableEthersLiquity";
import { BlockPolledLiquityStore } from "./BlockPolledLiquityStore";

/**
 * Thrown by {@link EthersLiquity} in case of transaction failure.
 *
 * @public
 */
export class EthersTransactionFailedError extends TransactionFailedError<
  FailedReceipt<EthersTransactionReceipt>
> {
  constructor(message: string, failedReceipt: FailedReceipt<EthersTransactionReceipt>) {
    super("EthersTransactionFailedError", message, failedReceipt);
  }
}

const waitForSuccess = async <T>(tx: SentEthersLiquityTransaction<T>) => {
  const receipt = await tx.waitForReceipt();

  if (receipt.status !== "succeeded") {
    throw new EthersTransactionFailedError("Transaction failed", receipt);
  }

  return receipt.details;
};

/**
 * Convenience class that combines multiple interfaces of the library in one object.
 *
 * @public
 */
export class EthersLiquity {
  //implements ReadableEthersLiquity, TransactableLiquity {

  /** Information about the connection to the Liquity protocol. */
  readonly connection: EthersLiquityConnection;

  /** Can be used to create populated (unsigned) transactions. */
  readonly populate: PopulatableEthersLiquity;

  /** Can be used to send transactions without waiting for them to be mined. */
  readonly send: SendableEthersLiquity;

  private _readable: ReadableEthersLiquity;

  /** @internal */
  constructor(readable: ReadableEthersLiquity) {
    this._readable = readable;
    this.connection = readable.connection;
    this.populate = new PopulatableEthersLiquity(readable);
    this.send = new SendableEthersLiquity(this.populate);
  }

  /** @internal */
  static _from(
    connection: EthersLiquityConnection & { useStore: "blockPolled" }
  ): EthersLiquityWithStore<BlockPolledLiquityStore>;

  /** @internal */
  static _from(connection: EthersLiquityConnection): EthersLiquity;

  /** @internal */
  static _from(connection: EthersLiquityConnection): EthersLiquity {
    if (_usingStore(connection)) {
      return new _EthersLiquityWithStore(ReadableEthersLiquity._from(connection));
    } else {
      return new EthersLiquity(ReadableEthersLiquity._from(connection));
    }
  }

  /** @internal */
  static connect(
    signerOrProvider: EthersSigner | EthersProvider,
    optionalParams: EthersLiquityConnectionOptionalParams & { useStore: "blockPolled" }
  ): Promise<EthersLiquityWithStore<BlockPolledLiquityStore>>;

  /**
   * Connect to the Liquity protocol and create an `EthersLiquity` object.
   *
   * @param signerOrProvider - Ethers `Signer` or `Provider` to use for connecting to the Ethereum
   *                           network.
   * @param optionalParams - Optional parameters that can be used to customize the connection.
   */
  static connect(
    signerOrProvider: EthersSigner | EthersProvider,
    optionalParams?: EthersLiquityConnectionOptionalParams
  ): Promise<EthersLiquity>;

  static async connect(
    signerOrProvider: EthersSigner | EthersProvider,
    optionalParams?: EthersLiquityConnectionOptionalParams
  ): Promise<EthersLiquity> {
    return EthersLiquity._from(await _connect(signerOrProvider, optionalParams));
  }

  /**
   * Check whether this `EthersLiquity` is an {@link EthersLiquityWithStore}.
   */
  hasStore(): this is EthersLiquityWithStore;

  /**
   * Check whether this `EthersLiquity` is an
   * {@link EthersLiquityWithStore}\<{@link BlockPolledLiquityStore}\>.
   */
  hasStore(store: "blockPolled"): this is EthersLiquityWithStore<BlockPolledLiquityStore>;

  hasStore(): boolean {
    return false;
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotalRedistributed} */
  getTotalRedistributed(overrides?: EthersCallOverrides): Promise<Trove> {
    return this._readable.getTotalRedistributed(overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTroveBeforeRedistribution} */
  getTroveBeforeRedistribution(
    address?: string,
    overrides?: EthersCallOverrides
  ): Promise<TroveWithPendingRedistribution> {
    return this._readable.getTroveBeforeRedistribution(address, overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTrove} */
  getTrove(address?: string, overrides?: EthersCallOverrides): Promise<UserTrove> {
    return this._readable.getTrove(address, overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getNumberOfTroves} */
  getNumberOfTroves(overrides?: EthersCallOverrides): Promise<number> {
    return this._readable.getNumberOfTroves(overrides);
  }

  getReceiptPerUnderlyingRatios(addresses: any, vaultTokens: any, overrides: any): any {
    return this._readable.getReceiptPerUnderlyingRatios(addresses, vaultTokens, overrides);
  }
  getUnderlyingPerReceiptRatios(addresses: any, vaultTokens: any, overrides: any): any {
    return this._readable.getUnderlyingPerReceiptRatios(addresses, vaultTokens, overrides);
  }
  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getPrice} */
  getCollPrice(address: any, overrides: any): any {
    return this._readable.getCollPrice(address, overrides);
  }
  getPrices(addresses: any, overrides: any): any {
    return this._readable.getPrices(addresses, overrides);
  }
  getUnderlyingDecimals(vaultTokens: any, overrides: any): any {
    return this._readable.getUnderlyingDecimals(vaultTokens, overrides);
  }
  getUnderlyingTokens(vaultTokens: any, overrides: any): any {
    return this._readable.getUnderlyingTokens(vaultTokens, overrides);
  }
  getCollPrices(addresses: any, vaultTokens: any, underlyingDecimals: any, overrides: any): any {
    return this._readable.getCollPrices(addresses, vaultTokens, underlyingDecimals, overrides);
  }
  getBalances(addresses: any, overrides: any): any {
    return this._readable.getBalances(addresses, overrides);
  }
  getLPBalances(addresses: any, overrides: any): any {
    return this._readable.getLPBalances(addresses, overrides);
  }

  /** @internal */
  _getActivePool(overrides?: EthersCallOverrides): Promise<Trove> {
    return this._readable._getActivePool(overrides);
  }

  /** @internal */
  _getDefaultPool(overrides?: EthersCallOverrides): Promise<Trove> {
    return this._readable._getDefaultPool(overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotal} */
  getTotal(overrides?: EthersCallOverrides): Promise<Trove> {
    return this._readable.getTotal(overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getStabilityDeposit} */
  getStabilityDeposit(address?: string, overrides?: EthersCallOverrides): Promise<StabilityDeposit> {
    return this._readable.getStabilityDeposit(address, overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getFarm} */
  getFarm(address: any, overrides: any): any {
    return this._readable.getFarm(address, overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getFarm} */
  getBoostedFarm(address: any, overrides: any): any {
    return this._readable.getBoostedFarm(address, overrides);
  }
  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getVEYETIStake} */
  getVEYETIStake(address: any, overrides: any): any {
    return this._readable.getVEYETIStake(address, overrides);
  }
  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getPoolRewardRate} */
  getPoolRewardRate(overrides: any): any {
    return this._readable.getPoolRewardRate(overrides);
  }
  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getRemainingStabilityPoolYETIReward} */
  getRemainingStabilityPoolYETIReward(overrides: any): any {
    return this._readable.getRemainingStabilityPoolYETIReward(overrides);
  }

  // /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getRemainingStabilityPoolLQTYReward} */
  // getRemainingStabilityPoolLQTYReward(overrides?: EthersCallOverrides): Promise<Decimal> {
  //   return this._readable.getRemainingStabilityPoolLQTYReward(overrides);
  // }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getYUSDInStabilityPool} */
  getYUSDInStabilityPool(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getYUSDInStabilityPool(overrides);
  }

  getDepositFee(VCInput: any, VCOutput: any, overrides: any): any {
    return this._readable.getDepositFee(VCInput, VCOutput, overrides);
  }

  getEstimatedFarmRewards(amount: any, time: any, overrides: any): any {
    return this._readable.getEstimatedFarmRewards(amount, time, overrides);
  }

  getEstimatedVeYetiRewards(amount: any, time: any, overrides: any): any {
    return this._readable.getEstimatedVeYetiRewards(amount, time, overrides);
  }
  getEstimatedYETIPoolRewards(amount: any, time: any, overrides: any): any {
    return this._readable.getEstimatedYETIPoolRewards(amount, time, overrides);
  }

  getBalanceERC20(address: any): any {
    return this._readable.getBalanceERC20(address);
  }
  getLP(address: any): any {
    return this._readable.getLP(address);
  }

  hasClaimableCollateral(address: any): any {
    return this._readable.hasClaimableCollateral(address);
  }
  getRedemptionBonus(address: any): any {
    return this._readable.getRedemptionBonus(address);
  }
  getRedemptionFeeRate() {
    return this._readable.getRedemptionFeeRate();
  }
  getReceiptPerUnderlying(address: any): any {
    return this._readable.getReceiptPerUnderlying(address);
  }
  getUnderlyingPerReceipt(address: any): any {
    return this._readable.getUnderlyingPerReceipt(address);
  }
  getUnderlyingDecimal(address: any): any {
    return this._readable.getUnderlyingDecimal(address);
  }
  getUnderlyingToken(address: any): any {
    return this._readable.getUnderlyingToken(address);
  }
  getSortedTroveHead() {
    return this._readable.getSortedTroveHead();
  }
  getSortedTroveTail() {
    return this._readable.getSortedTroveTail();
  }
  getSortedTroveSize() {
    return this._readable.getSortedTroveSize();
  }
  getSortedTroveNext(id: any): any {
    return this._readable.getSortedTroveNext(id);
  }
  getSortedTrovePrev(id: any): any {
    return this._readable.getSortedTrovePrev(id);
  }
  getCurrentAICR(borrower: any): any {
    return this._readable.getCurrentAICR(borrower);
  }
  getTroveDebt(borrower: any): any {
    return this._readable.getTroveDebt(borrower);
  }
  getAllowanceOf(owner: any, token: any, spender: any, amount: any): any {
    return this._readable.getAllowanceOf(owner, token, spender, amount);
  }
  getYusdAllowance(from: any, to: any, amount: any): any {
    return this._readable.getYusdAllowance(from, to, amount);
  }
  getYETIPrice() {
    return this._readable.getYETIPrice();
  }
  getYUSDPrice() {
    return this._readable.getYUSDPrice();
  }
  getGlobalBoostFactor() {
    return this._readable.getGlobalBoostFactor();
  }
  getDecayedBoost(address: any): any {
    return this._readable.getDecayedBoost(address);
  }
  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getYUSDBalance} */
  getYUSDBalance(address: any, overrides: any): any {
    return this._readable.getYUSDBalance(address, overrides);
  }
  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getYETIBalance} */
  getYETIBalance(address: any, overrides: any): any {
    return this._readable.getYETIBalance(address, overrides);
  }

  // /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLQTYBalance} */
  // getLQTYBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
  //   return this._readable.getLQTYBalance(address, overrides);
  // }

  // /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getUniTokenBalance} */
  // getUniTokenBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
  //   return this._readable.getUniTokenBalance(address, overrides);
  // }

  // /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getUniTokenAllowance} */
  // getUniTokenAllowance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
  //   return this._readable.getUniTokenAllowance(address, overrides);
  // }

  // /** @internal */
  // _getRemainingLiquidityMiningLQTYRewardCalculator(
  //   overrides?: EthersCallOverrides
  // ): Promise<(blockTimestamp: number) => Decimal> {
  //   return this._readable._getRemainingLiquidityMiningLQTYRewardCalculator(overrides);
  // }

  // /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getRemainingLiquidityMiningLQTYReward} */
  // getRemainingLiquidityMiningLQTYReward(overrides?: EthersCallOverrides): Promise<Decimal> {
  //   return this._readable.getRemainingLiquidityMiningLQTYReward(overrides);
  // }

  // /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLiquidityMiningStake} */
  // getLiquidityMiningStake(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
  //   return this._readable.getLiquidityMiningStake(address, overrides);
  // }

  // /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotalStakedUniTokens} */
  // getTotalStakedUniTokens(overrides?: EthersCallOverrides): Promise<Decimal> {
  //   return this._readable.getTotalStakedUniTokens(overrides);
  // }

  // /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLiquidityMiningLQTYReward} */
  // getLiquidityMiningLQTYReward(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
  //   return this._readable.getLiquidityMiningLQTYReward(address, overrides);
  // }

  // /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getCollateralSurplusBalance} */
  // getCollateralSurplusBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
  //   return this._readable.getCollateralSurplusBalance(address, overrides);
  // }
  getCollateralSurplusBalancee(overrides: any): any {
    return this._readable.getCollateralSurplusBalancee(overrides);
  }

  /** @internal */
  getTroves(
    params: TroveListingParams & { beforeRedistribution: true },
    overrides?: EthersCallOverrides
  ): Promise<TroveWithPendingRedistribution[]>;

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.(getTroves:2)} */
  getTroves(params: TroveListingParams, overrides?: EthersCallOverrides): Promise<UserTrove[]>;

  getTroves(params: TroveListingParams, overrides?: EthersCallOverrides): Promise<UserTrove[]> {
    return this._readable.getTroves(params, overrides);
  }

  /** @internal */
  _getBlockTimestamp(blockTag?: BlockTag): Promise<number> {
    return this._readable._getBlockTimestamp(blockTag);
  }

  /** @internal */
  _getFeesFactory(
    overrides?: EthersCallOverrides
  ): Promise<(blockTimestamp: number, recoveryMode: boolean) => Fees> {
    return this._readable._getFeesFactory(overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getFees} */
  getFees(overrides?: EthersCallOverrides): Promise<Fees> {
    return this._readable.getFees(overrides);
  }

  getVaultTokens(whitelistedCollaterals: any, overrides: any): any {
    return this._readable.getVaultTokens(whitelistedCollaterals, overrides);
  }
  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getWhitelistedCollaterals} */
  getWhitelistedCollaterals(overrides: any): any {
    return this._readable.getWhitelistedCollaterals(overrides);
  }
  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getICR} */
  getICR(userAddress: any, overrides: any): any {
    return this._readable.getICR(userAddress, overrides);
  }
  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getVcValue} */
  getVcValue(userAddress: any, overrides: any): any {
    return this._readable.getVcValue(userAddress, overrides);
  }
  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getSafetyRatios} */
  getSafetyRatios(addresses: any, overrides: any): any {
    return this._readable.getSafetyRatios(addresses, overrides);
  }
  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getSafetyRatios} */
  getRecoveryRatios(addresses: any, overrides: any): any {
    return this._readable.getRecoveryRatios(addresses, overrides);
  }
  getDecimals(addresses: any, overrides: any): any {
    return this._readable.getDecimals(addresses, overrides);
  }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.openTrove}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  openTrove(
    params: TroveCreationParams<Decimalish>,
    ICRWithFees: Decimalish,
    maxBorrowingRateOrOptionalParams?: Decimalish | BorrowingOperationOptionalParams,
    overrides?: EthersTransactionOverrides
  ): Promise<unknown> {
    return this.send
      .openTrove(params, ICRWithFees, maxBorrowingRateOrOptionalParams, overrides)
      .then(waitForSuccess);
  }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.openTroveLeverUp}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  openTroveLeverUp(
    params: any,
    ICRWithFees: any,
    troveOpen: any,
    maxBorrowingRateOrOptionalParams: any,
    overrides: any
  ): any {
    return this.send
      .openTroveLeverUp(params, ICRWithFees, troveOpen, maxBorrowingRateOrOptionalParams, overrides)
      .then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.closeTrove}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  closeTrove(overrides?: EthersTransactionOverrides): Promise<TroveClosureDetails> {
    // @ts-expect-error: Testing
    return this.send.closeTrove(overrides).then(waitForSuccess);
  }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.closeTroveUnleverUp}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  closeTroveUnleverUp(params: any, overrides: any): any {
    return this.send.closeTroveUnleverUp(params, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.adjustTrove}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  adjustTrove(
    params: any,
    ICRWithFees: any,
    maxBorrowingRateOrOptionalParams: any,
    overrides: any
  ): any {
    return this.send
      .adjustTrove(params, ICRWithFees, maxBorrowingRateOrOptionalParams, overrides)
      .then(waitForSuccess);
  }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.addCollLeverUp}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  addCollLeverUp(params, ICRWithFees, maxBorrowingRateOrOptionalParams, overrides: any): any {
    return this.send
      .addCollLeverUp(params, ICRWithFees, maxBorrowingRateOrOptionalParams, overrides)
      .then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.addCollLeverUp}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  withdrawCollUnleverUp(params, ICRWithFees, maxBorrowingRateOrOptionalParams, overrides: any): any {
    return this.send
      .withdrawCollUnleverUp(params, ICRWithFees, maxBorrowingRateOrOptionalParams, overrides)
      .then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.depositCollateral}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  depositCollateral(collaterals: any, ICRWithFees: any, overrides: any): any {
    return this.send.depositCollateral(collaterals, ICRWithFees, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.withdrawCollateral}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  withdrawCollateral(collaterals: any, ICRWithFees: any, overrides: any): any {
    return this.send.withdrawCollateral(collaterals, ICRWithFees, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.borrowYUSD}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  borrowYUSD(amount: any, ICRWithFees: any, maxBorrowingRate: any, overrides: any): any {
    return this.send
      .borrowYUSD(amount, ICRWithFees, maxBorrowingRate, overrides)
      .then(waitForSuccess);
  }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.repayYUSD}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  repayYUSD(amount, ICRWithFees, overrides: any): any {
    return this.send.repayYUSD(amount, ICRWithFees, overrides).then(waitForSuccess);
  }
  /** @internal */
  setPrice(price, overrides: any): any {
    return this.send.setPrice(price, overrides).then(waitForSuccess);
  }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.liquidate}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  liquidate(address: any, liquidator: any, overrides: any): any {
    return this.send.liquidate(address, liquidator, overrides).then(waitForSuccess);
  }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.liquidateUpTo}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  // liquidateUpTo(
  //   maximumNumberOfTrovesToLiquidate: number,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<LiquidationDetails> {
  //   return this.send.liquidateUpTo(maximumNumberOfTrovesToLiquidate, overrides).then(waitForSuccess);
  // }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.depositYUSDInStabilityPool}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  depositYUSDInStabilityPool(amount: any, overrides: any): any {
    return this.send.depositYUSDInStabilityPool(amount, overrides).then(waitForSuccess);
  }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.withdrawYUSDFromStabilityPool}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  withdrawYUSDFromStabilityPool(amount: any, overrides: any): any {
    return this.send.withdrawYUSDFromStabilityPool(amount, overrides).then(waitForSuccess);
  }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.withdrawGainsFromStabilityPool}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  withdrawGainsFromStabilityPool(overrides: any): any {
    return this.send.withdrawGainsFromStabilityPool(overrides).then(waitForSuccess);
  }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.claimRewardsSwap}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  claimRewardsSwap(amount: any, overrides: any): any {
    return this.send.claimRewardsSwap(amount, overrides).then(waitForSuccess);
  }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.stakeLPTokens}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  stakeLPTokens(amount: any, overrides: any): any {
    return this.send.stakeLPTokens(amount, overrides).then(waitForSuccess);
  }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.withdrawLPTokens}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  withdrawLPTokens(amount: any, overrides: any): any {
    return this.send.withdrawLPTokens(amount, overrides).then(waitForSuccess);
  }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.stakeLPTokens}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  stakeLPTokensOldFarm(amount: any, overrides: any): any {
    return this.send.stakeLPTokensOldFarm(amount, overrides).then(waitForSuccess);
  }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.withdrawLPTokens}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  withdrawLPTokensOldFarm(amount: any, overrides: any): any {
    return this.send.withdrawLPTokensOldFarm(amount, overrides).then(waitForSuccess);
  }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.getFarmRewards}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  getFarmRewards(overrides: any): any {
    return this.send.getFarmRewards(overrides).then(waitForSuccess);
  }
  getOldFarmRewards(overrides: any): any {
    return this.send.getOldFarmRewards(overrides).then(waitForSuccess);
  }
  getVeYetiStakeReward(overrides: any): any {
    return this.send.getVeYetiStakeReward(overrides).then(waitForSuccess);
  }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.getFarmRewards}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  updateVEYETI(params: any, overrides: any): any {
    return this.send.updateVEYETI(params, overrides).then(waitForSuccess);
  }
  notifyAllRewarders(overrides: any): any {
    return this.send.notifyAllRewarders(overrides).then(waitForSuccess);
  }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.transferCollateralGainToTrove}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  transferCollateralGainToTrove(overrides: any): any {
    return this.send.transferCollateralGainToTrove(overrides).then(waitForSuccess);
  }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.sendYUSD}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  sendYUSD(toAddress: any, amount: any, overrides: any): any {
    return this.send.sendYUSD(toAddress, amount, overrides).then(waitForSuccess);
  }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.sendYETI}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  sendYETI(toAddress: any, amount: any, overrides: any): any {
    return this.send.sendYETI(toAddress, amount, overrides).then(waitForSuccess);
  }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.redeemYUSD}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  redeemYUSD(amount: any, maxRedemptionRate: any, overrides: any): any {
    return this.send.redeemYUSD(amount, maxRedemptionRate, overrides).then(waitForSuccess);
  }
  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.claimCollateralSurplus}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  claimCollateralSurplus(overrides: any): any {
    return this.send.claimCollateralSurplus(overrides).then(waitForSuccess);
  }
}

/**
 * Variant of {@link EthersLiquity} that exposes a {@link @liquity/lib-base#LiquityStore}.
 *
 * @public
 */
export interface EthersLiquityWithStore<T extends LiquityStore = LiquityStore>
  extends EthersLiquity {
  /** An object that implements LiquityStore. */
  readonly store: T;
}

class _EthersLiquityWithStore<T extends LiquityStore = LiquityStore>
  extends EthersLiquity
  implements EthersLiquityWithStore<T> {
  readonly store: T;

  constructor(readable: ReadableEthersLiquityWithStore<T>) {
    super(readable);

    this.store = readable.store;
  }

  hasStore(store?: EthersLiquityStoreOption): boolean {
    return store === undefined || store === this.connection.useStore;
  }
}
