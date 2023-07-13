// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck: Testing
import assert from "assert";

import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { AddressZero } from "@ethersproject/constants";
import { Log } from "@ethersproject/abstract-provider";
import { ErrorCode } from "@ethersproject/logger";
import { Transaction } from "@ethersproject/transactions";
import { _getERC20Token, _getTestERC20TokenNoLimit, _getTestERC20Token } from "./contracts";
import {
  Decimal,
  Decimalish,
  LiquityReceipt,
  YUSD_MINIMUM_DEBT,
  MinedReceipt,
  PopulatableLiquity,
  PopulatedLiquityTransaction,
  PopulatedRedemption,
  RedemptionDetails,
  SentLiquityTransaction,
  Trove,
  TroveWithPendingRedistribution,
  _failedReceipt,
  _normalizeTroveAdjustment,
  _normalizeTroveCreation,
  _normalizeTroveLeverUpCreation,
  _pendingReceipt,
  _successfulReceipt,
  _normalizeTroveWithdrawCollUnleverUp,
  YUSD_MINIMUM_NET_DEBT,
  _normalizeTroveAddCollLeverUp
} from "@liquity/lib-base";

import {
  EthersPopulatedTransaction,
  EthersTransactionOverrides,
  EthersTransactionReceipt,
  EthersTransactionResponse
} from "./types";

import {
  EthersLiquityConnection,
  _getContracts,
  _requireAddress,
  _requireSigner
} from "./EthersLiquityConnection";

import { decimalify, promiseAllValues } from "./_utils";
import { _priceFeedIsTestnet, _uniTokenIsMock } from "./contracts";
import { logsToString } from "./parseLogs";
import { ReadableEthersLiquity } from "./ReadableEthersLiquity";
import { Overrides } from "ethers";

const bigNumberMax = (a: BigNumber, b?: BigNumber) => (b?.gt(a) ? b : a);
const bigNumberMin = (a: BigNumber, b?: BigNumber) => (b?.lt(a) ? b : a);

// With 70 iterations redemption costs about ~10M gas, and each iteration accounts for ~138k more
/** @internal */
export const _redeemMaxIterations = 70;

const defaultBorrowingRateSlippageTolerance = Decimal.from(0.005); // 0.5%
const defaultRedemptionRateSlippageTolerance = Decimal.from(0.001); // 0.1%
const defaultBorrowingFeeDecayToleranceMinutes = 10;

const noDetails = () => undefined;

const compose = <T, U, V>(f: (_: U) => V, g: (_: T) => U) => (_: T) => f(g(_));

const id = <T>(t: T) => t;

// Takes ~6-7K (use 10K to be safe) to update lastFeeOperationTime, but the cost of calculating the
// decayed baseRate increases logarithmically with time elapsed since the last update.
const addGasForBaseRateUpdate = (maxMinutesSinceLastUpdate = 10) => (gas: BigNumber) =>
  gas.add(10000 + 1414 * Math.ceil(Math.log2(maxMinutesSinceLastUpdate + 1)));

// First traversal in ascending direction takes ~50K, then ~13.5K per extra step.
// 80K should be enough for 3 steps, plus some extra to be safe.
const addGasForPotentialListTraversal = (gas: BigNumber) => gas.add(80000);

const addGasForYETIIssuance = (gas: BigNumber) => gas.add(50000);
const addGasForSPClaim = (gas: BigNumber) => gas.add(100000);

const addGasForUnipoolRewardUpdate = (gas: BigNumber) => gas.add(20000);
const gasLimit = (gas: BigNumber) => BigNumber.from(Math.min(gas.toNumber() + 50000, 7900000));

// To get the best entropy available, we'd do something like:
//
// const bigRandomNumber = () =>
//   BigNumber.from(
//     `0x${Array.from(crypto.getRandomValues(new Uint32Array(8)))
//       .map(u32 => u32.toString(16).padStart(8, "0"))
//       .join("")}`
//   );
//
// However, Window.crypto is browser-specific. Since we only use this for randomly picking Troves
// during the search for hints, Math.random() will do fine, too.
//
// This returns a random integer between 0 and Number.MAX_SAFE_INTEGER
const randomInteger = () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

// Maximum number of trials to perform in a single getApproxHint() call. If the number of trials
// required to get a statistically "good" hint is larger than this, the search for the hint will
// be broken up into multiple getApproxHint() calls.
//
// This should be low enough to work with popular public Ethereum providers like Infura without
// triggering any fair use limits.
const maxNumberOfTrialsAtOnce = 2500;

function* generateTrials(totalNumberOfTrials: number) {
  assert(Number.isInteger(totalNumberOfTrials) && totalNumberOfTrials > 0);

  while (totalNumberOfTrials) {
    const numberOfTrials = Math.min(totalNumberOfTrials, maxNumberOfTrialsAtOnce);
    yield numberOfTrials;

    totalNumberOfTrials -= numberOfTrials;
  }
}

function decToBN(decimals: any): any {
  const bignums = [];
  for (let i = 0; i < decimals.length; i++) {
    bignums.push(BigNumber.from(decimals[i].hex));
  }
  return bignums;
}
function convertToMap(keys: any, values: any): any {
  const r: any = {};
  for (let i = 0; i < keys.length; i++) {
    if (typeof values[i] !== typeof Decimal.ZERO) {
      r[keys[i]] = Decimal.from(values[i]);
    } else {
      r[keys[i]] = values[i];
    }
  }
  return r;
}

/** @internal */
export enum _RawErrorReason {
  TRANSACTION_FAILED = "transaction failed",
  TRANSACTION_CANCELLED = "cancelled",
  TRANSACTION_REPLACED = "replaced",
  TRANSACTION_REPRICED = "repriced"
}

const transactionReplacementReasons: unknown[] = [
  _RawErrorReason.TRANSACTION_CANCELLED,
  _RawErrorReason.TRANSACTION_REPLACED,
  _RawErrorReason.TRANSACTION_REPRICED
];

interface RawTransactionFailedError extends Error {
  code: ErrorCode.CALL_EXCEPTION;
  reason: _RawErrorReason.TRANSACTION_FAILED;
  transactionHash: string;
  transaction: Transaction;
  receipt: EthersTransactionReceipt;
}

/** @internal */
export interface _RawTransactionReplacedError extends Error {
  code: ErrorCode.TRANSACTION_REPLACED;
  reason:
    | _RawErrorReason.TRANSACTION_CANCELLED
    | _RawErrorReason.TRANSACTION_REPLACED
    | _RawErrorReason.TRANSACTION_REPRICED;
  cancelled: boolean;
  hash: string;
  replacement: EthersTransactionResponse;
  receipt: EthersTransactionReceipt;
}

const hasProp = <T, P extends string>(o: T, p: P): o is T & { [_ in P]: unknown } => p in o;

const isTransactionFailedError = (error: Error): error is RawTransactionFailedError =>
  hasProp(error, "code") &&
  error.code === ErrorCode.CALL_EXCEPTION &&
  hasProp(error, "reason") &&
  error.reason === _RawErrorReason.TRANSACTION_FAILED;

const isTransactionReplacedError = (error: Error): error is _RawTransactionReplacedError =>
  hasProp(error, "code") &&
  error.code === ErrorCode.TRANSACTION_REPLACED &&
  hasProp(error, "reason") &&
  transactionReplacementReasons.includes(error.reason);

/**
 * Thrown when a transaction is cancelled or replaced by a different transaction.
 *
 * @public
 */
export class EthersTransactionCancelledError extends Error {
  readonly rawReplacementReceipt: EthersTransactionReceipt;
  readonly rawError: Error;

  /** @internal */
  constructor(rawError: _RawTransactionReplacedError) {
    assert(rawError.reason !== _RawErrorReason.TRANSACTION_REPRICED);

    super(`Transaction ${rawError.reason}`);
    this.name = "TransactionCancelledError";
    this.rawReplacementReceipt = rawError.receipt;
    this.rawError = rawError;
  }
}

/**
 * A transaction that has already been sent.
 *
 * @remarks
 * Returned by {@link SendableEthersLiquity} functions.
 *
 * @public
 */
export class SentEthersLiquityTransaction<T = unknown>
  implements
    SentLiquityTransaction<EthersTransactionResponse, LiquityReceipt<EthersTransactionReceipt, T>> {
  /** Ethers' representation of a sent transaction. */
  readonly rawSentTransaction: EthersTransactionResponse;

  private readonly _connection: EthersLiquityConnection;
  private readonly _parse: (rawReceipt: EthersTransactionReceipt) => T;

  /** @internal */
  constructor(
    rawSentTransaction: EthersTransactionResponse,
    connection: EthersLiquityConnection,
    parse: (rawReceipt: EthersTransactionReceipt) => T
  ) {
    this.rawSentTransaction = rawSentTransaction;
    this._connection = connection;
    this._parse = parse;
  }

  private _receiptFrom(rawReceipt: EthersTransactionReceipt | null) {
    return rawReceipt
      ? rawReceipt.status
        ? _successfulReceipt(rawReceipt, this._parse(rawReceipt), () =>
            logsToString(rawReceipt, _getContracts(this._connection))
          )
        : _failedReceipt(rawReceipt)
      : _pendingReceipt;
  }

  private async _waitForRawReceipt(confirmations?: number) {
    try {
      return await this.rawSentTransaction.wait(confirmations);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (isTransactionFailedError(error)) {
          return error.receipt;
        }

        if (isTransactionReplacedError(error)) {
          if (error.cancelled) {
            throw new EthersTransactionCancelledError(error);
          } else {
            return error.receipt;
          }
        }
      }

      throw error;
    }
  }

  /** {@inheritDoc @liquity/lib-base#SentLiquityTransaction.getReceipt} */
  async getReceipt(): Promise<LiquityReceipt<EthersTransactionReceipt, T>> {
    return this._receiptFrom(await this._waitForRawReceipt(0));
  }

  /**
   * {@inheritDoc @liquity/lib-base#SentLiquityTransaction.waitForReceipt}
   *
   * @throws
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  async waitForReceipt(): Promise<MinedReceipt<EthersTransactionReceipt, T>> {
    const receipt = this._receiptFrom(await this._waitForRawReceipt());

    assert(receipt.status !== "pending");
    return receipt;
  }
}

/**
 * Optional parameters of a transaction that borrows YUSD.
 *
 * @public
 */
export interface BorrowingOperationOptionalParams {
  /**
   * Maximum acceptable {@link @liquity/lib-base#Fees.borrowingRate | borrowing rate}
   * (default: current borrowing rate plus 0.5%).
   */
  maxBorrowingRate?: Decimalish;

  /**
   * Control the amount of extra gas included attached to the transaction.
   *
   * @remarks
   * Transactions that borrow YUSD must pay a variable borrowing fee, which is added to the Trove's
   * debt. This fee increases whenever a redemption occurs, and otherwise decays exponentially.
   * Due to this decay, a Trove's collateral ratio can end up being higher than initially calculated
   * if the transaction is pending for a long time. When this happens, the backend has to iterate
   * over the sorted list of Troves to find a new position for the Trove, which costs extra gas.
   *
   * The SDK can estimate how much the gas costs of the transaction may increase due to this decay,
   * and can include additional gas to ensure that it will still succeed, even if it ends up pending
   * for a relatively long time. This parameter specifies the length of time that should be covered
   * by the extra gas.
   *
   * Default: 10 minutes.
   */
  borrowingFeeDecayToleranceMinutes?: number;
}

const normalizeBorrowingOperationOptionalParams = (
  maxBorrowingRateOrOptionalParams: Decimalish | BorrowingOperationOptionalParams | undefined,
  currentBorrowingRate: Decimal | undefined
): {
  maxBorrowingRate: Decimal;
  borrowingFeeDecayToleranceMinutes: number;
} => {
  if (maxBorrowingRateOrOptionalParams === undefined) {
    return {
      maxBorrowingRate:
        currentBorrowingRate?.add(defaultBorrowingRateSlippageTolerance) ?? Decimal.ZERO,
      borrowingFeeDecayToleranceMinutes: defaultBorrowingFeeDecayToleranceMinutes
    };
  } else if (
    typeof maxBorrowingRateOrOptionalParams === "number" ||
    typeof maxBorrowingRateOrOptionalParams === "string" ||
    maxBorrowingRateOrOptionalParams instanceof Decimal
  ) {
    return {
      maxBorrowingRate: Decimal.from(maxBorrowingRateOrOptionalParams),
      borrowingFeeDecayToleranceMinutes: defaultBorrowingFeeDecayToleranceMinutes
    };
  } else {
    const { maxBorrowingRate, borrowingFeeDecayToleranceMinutes } = maxBorrowingRateOrOptionalParams;

    return {
      maxBorrowingRate:
        maxBorrowingRate !== undefined
          ? Decimal.from(maxBorrowingRate)
          : currentBorrowingRate?.add(defaultBorrowingRateSlippageTolerance) ?? Decimal.ZERO,

      borrowingFeeDecayToleranceMinutes:
        borrowingFeeDecayToleranceMinutes ?? defaultBorrowingFeeDecayToleranceMinutes
    };
  }
};

/**
 * A transaction that has been prepared for sending.
 *
 * @remarks
 * Returned by {@link PopulatableEthersLiquity} functions.
 *
 * @public
 */
export class PopulatedEthersLiquityTransaction<T = unknown>
  implements
    PopulatedLiquityTransaction<EthersPopulatedTransaction, SentEthersLiquityTransaction<T>> {
  /** Unsigned transaction object populated by Ethers. */
  readonly rawPopulatedTransaction: EthersPopulatedTransaction;

  /**
   * Extra gas added to the transaction's `gasLimit` on top of the estimated minimum requirement.
   *
   * @remarks
   * Gas estimation is based on blockchain state at the latest block. However, most transactions
   * stay in pending state for several blocks before being included in a block. This may increase
   * the actual gas requirements of certain Liquity transactions by the time they are eventually
   * mined, therefore the Liquity SDK increases these transactions' `gasLimit` by default (unless
   * `gasLimit` is {@link EthersTransactionOverrides | overridden}).
   *
   * Note: even though the SDK includes gas headroom for many transaction types, currently this
   * property is only implemented for {@link PopulatableEthersLiquity.openTrove | openTrove()},
   * {@link PopulatableEthersLiquity.adjustTrove | adjustTrove()} and its aliases.
   */
  readonly gasHeadroom?: number;

  private readonly _connection: EthersLiquityConnection;
  private readonly _parse: (rawReceipt: EthersTransactionReceipt) => T;

  /** @internal */
  constructor(
    rawPopulatedTransaction: EthersPopulatedTransaction,
    connection: EthersLiquityConnection,
    parse: (rawReceipt: EthersTransactionReceipt) => T,
    gasHeadroom?: number
  ) {
    this.rawPopulatedTransaction = rawPopulatedTransaction;
    this._connection = connection;
    this._parse = parse;

    if (gasHeadroom !== undefined) {
      this.gasHeadroom = gasHeadroom;
    }
  }

  /** {@inheritDoc @liquity/lib-base#PopulatedLiquityTransaction.send} */
  async send(): Promise<SentEthersLiquityTransaction<T>> {
    return new SentEthersLiquityTransaction(
      await _requireSigner(this._connection).sendTransaction(this.rawPopulatedTransaction),
      this._connection,
      this._parse
    );
  }
}

/**
 * {@inheritDoc @liquity/lib-base#PopulatedRedemption}
 *
 * @public
 */
export class PopulatedEthersRedemption
  extends PopulatedEthersLiquityTransaction<RedemptionDetails>
  implements
    PopulatedRedemption<
      EthersPopulatedTransaction,
      EthersTransactionResponse,
      EthersTransactionReceipt
    > {
  /** {@inheritDoc @liquity/lib-base#PopulatedRedemption.attemptedYUSDAmount} */
  readonly attemptedYUSDAmount: Decimal;

  /** {@inheritDoc @liquity/lib-base#PopulatedRedemption.redeemableYUSDAmount} */
  readonly redeemableYUSDAmount: Decimal;

  /** {@inheritDoc @liquity/lib-base#PopulatedRedemption.isTruncated} */
  readonly isTruncated: boolean;

  private readonly _increaseAmountByMinimumNetDebt?: (
    maxRedemptionRate?: Decimalish
  ) => Promise<PopulatedEthersRedemption>;

  /** @internal */
  constructor(
    rawPopulatedTransaction: EthersPopulatedTransaction,
    connection: EthersLiquityConnection,
    attemptedYUSDAmount: Decimal,
    redeemableYUSDAmount: Decimal,
    increaseAmountByMinimumNetDebt?: () => Promise<PopulatedEthersRedemption>
  ) {
    const { troveManager } = _getContracts(connection);

    super(
      rawPopulatedTransaction,
      connection,

      ({ logs }) =>
        troveManager
          .extractEvents(logs, "Redemption")
          .map(
            ({ args: { tokens, amounts, YUSDfee, _actualYUSDAmount, _attemptedYUSDAmount } }) => ({
              attemptedYUSDAmount: decimalify(_attemptedYUSDAmount),
              actualYUSDAmount: decimalify(_actualYUSDAmount),
              collateralTaken: decimalify(amounts[0]),
              fee: decimalify(YUSDfee)
            })
          )[0]
    );

    this.attemptedYUSDAmount = attemptedYUSDAmount;
    this.redeemableYUSDAmount = redeemableYUSDAmount;
    this.isTruncated = redeemableYUSDAmount.lt(attemptedYUSDAmount);
    this._increaseAmountByMinimumNetDebt = increaseAmountByMinimumNetDebt;
  }

  /** {@inheritDoc @liquity/lib-base#PopulatedRedemption.increaseAmountByMinimumNetDebt} */
  increaseAmountByMinimumNetDebt(
    maxRedemptionRate?: Decimalish
  ): Promise<PopulatedEthersRedemption> {
    if (!this._increaseAmountByMinimumNetDebt) {
      throw new Error(
        "PopulatedEthersRedemption: increaseAmountByMinimumNetDebt() can " +
          "only be called when amount is truncated"
      );
    }

    return this._increaseAmountByMinimumNetDebt(maxRedemptionRate);
  }
}

/** @internal */
export interface _TroveChangeWithFees<T> {
  params: T;
  newTrove: Trove;
  fee: Decimal;
}

export class PopulatableEthersLiquity
  implements
    PopulatableLiquity<
      EthersTransactionReceipt,
      EthersTransactionResponse,
      EthersPopulatedTransaction
    > {
  private readonly _readable: ReadableEthersLiquity;

  constructor(readable: any) {
    this._readable = readable;
  }
  _wrapSimpleTransaction(rawPopulatedTransaction: any): any {
    return new PopulatedEthersLiquityTransaction(
      rawPopulatedTransaction,
      this._readable.connection,
      noDetails
    );
  }
  _wrapTroveChangeWithFees(params: any, rawPopulatedTransaction: any, gasHeadroom: any): any {
    const { borrowerOperations } = _getContracts(this._readable.connection);
    return new PopulatedEthersLiquityTransaction(
      rawPopulatedTransaction,
      this._readable.connection,
      //   const [newTrove] = borrowerOperations
      //   .extractEvents(logs, "TroveUpdated")
      //   .map(({ args: { _debt, _tokens, _amounts  } }) => new Trove(convertToMap(_tokens, _amounts), convertToMap(["debt"], [_debt])));
      // const [fee] = borrowerOperations
      //   .extractEvents(logs, "YUSDBorrowingFeePaid")
      //   .map(({ args: { _YUSDFee } }) => decimalify(_YUSDFee));
      // return {
      //   params,
      //   newTrove,
      //   fee
      ({ logs }) => {
        return {
          params: params, // @ts-expect-error:testing
          newTrove: new Trove({}, {}, { debt: Decimal.ZERO }),
          fee: Decimal.ZERO
        };
        // };
      },
      gasHeadroom
    );
  }
  async _wrapTroveClosure(rawPopulatedTransaction: any): Promise<any> {
    const { activePool, yusdToken } = _getContracts(this._readable.connection);
    return new PopulatedEthersLiquityTransaction(
      rawPopulatedTransaction,
      this._readable.connection,
      ({ logs, from: userAddress }) => {
        const [repayYUSD] = yusdToken
          .extractEvents(logs, "Transfer")
          .filter(({ args: { from, to } }) => from === userAddress && to === AddressZero)
          .map(({ args: { value } }) => convertToMap(["debt"], [value]));
        const [withdrawCollaterals] = activePool
          .extractEvents(logs, "CollateralsSent")
          .filter(({ args: { _to } }) => _to === userAddress)
          .map(({ args: { _collaterals, _amounts } }) => convertToMap(_collaterals, _amounts));
        return {
          params: repayYUSD["debt"].nonZero
            ? { withdrawCollaterals, repayYUSD }
            : { withdrawCollaterals }
        };
      }
    );
  }
  async _wrapTroveClosureUnleverUp(rawPopulatedTransaction: any): Promise<any> {
    const { activePool, yusdToken } = _getContracts(this._readable.connection);
    return new PopulatedEthersLiquityTransaction(
      rawPopulatedTransaction,
      this._readable.connection,
      ({ logs, from: userAddress }) => {
        const [repayYUSD] = yusdToken
          .extractEvents(logs, "Transfer")
          .filter(({ args: { from, to } }) => from === userAddress && to === AddressZero)
          .map(({ args: { value } }) => convertToMap(["debt"], [value]));
        const [withdrawCollaterals] = activePool
          .extractEvents(logs, "CollateralsSent")
          .filter(({ args: { _to } }) => _to === userAddress)
          .map(({ args: { _collaterals, _amounts } }) => convertToMap(_collaterals, _amounts));
        const withdrawCollateralsMaxSlippages = {};
        return {
          params: { withdrawCollaterals, withdrawCollateralsMaxSlippages, repayYUSD }
        };
      }
    );
  }
  _wrapLiquidation(rawPopulatedTransaction: any, decimals: any): any {
    const { troveManager } = _getContracts(this._readable.connection);
    return new PopulatedEthersLiquityTransaction(
      rawPopulatedTransaction,
      this._readable.connection,
      ({ logs }) => {
        const liquidatedAddresses = troveManager
          .extractEvents(logs, "TroveLiquidated")
          .map(({ args: { _borrower } }) => _borrower);
        const [totals] = troveManager
          .extractEvents(logs, "Liquidation")
          .map(({ // @ts-expect-error: Testing
            args: { totalYUSDGasCompensation, totalCollGasCompAmounts, totalCollGasCompTokens, totalCollTokens, totalCollAmounts, liquidatedAmount } }) => ({
            collateralGasCompensation: convertToMap(totalCollGasCompTokens, totalCollGasCompAmounts),
            yusdGasCompensation: decimalify(totalYUSDGasCompensation),
            totalLiquidated: new Trove(
              convertToMap(totalCollTokens, totalCollAmounts),
              decimals,
              convertToMap(["debt"], [liquidatedAmount])
            )
          }));
        return {
          liquidatedAddresses,
          ...totals
        };
      }
    );
  }
  _extractStabilityPoolGainsWithdrawalDetails(logs: any): any {
    // const { stabilityPool } = _getContracts(this._readable.connection);
    // const [newYUSDDeposit] = stabilityPool
    //   .extractEvents(logs, "UserDepositChanged")
    //   .map(({ args: { _newDeposit } }) => decimalify(_newDeposit));
    // const [[collateralGain, yusdLoss]] = stabilityPool
    //   .extractEvents(logs, "ETHGainWithdrawn")
    //   .map(({ args: { _ETH, _YUSDLoss } }) => [decimalify(_ETH), decimalify(_YUSDLoss)]);
    // const [yetiReward] = stabilityPool
    //   .extractEvents(logs, "YETIPaidToDepositor")
    //   .map(({ args: { _YETI } }) => decimalify(_YETI));
    return {
      yusdLoss: Decimal.ZERO,
      newYUSDDeposit: Decimal.from(100),
      collateralGain: Decimal.from(0),
      yetiReward: Decimal.from(0)
    };
  }
  _wrapStabilityPoolGainsWithdrawal(rawPopulatedTransaction: any): any {
    return new PopulatedEthersLiquityTransaction(
      rawPopulatedTransaction,
      this._readable.connection,
      ({ logs }) => this._extractStabilityPoolGainsWithdrawalDetails(logs)
    );
  }
  _wrapStabilityDepositTopup(change: any, rawPopulatedTransaction: any): any {
    return new PopulatedEthersLiquityTransaction(
      rawPopulatedTransaction,
      this._readable.connection,
      ({ logs }) => ({
        ...this._extractStabilityPoolGainsWithdrawalDetails(logs),
        change
      })
    );
  }
  async _wrapStabilityDepositWithdrawal(rawPopulatedTransaction: any): Promise<any> {
    const { stabilityPool, yusdToken } = _getContracts(this._readable.connection);
    return new PopulatedEthersLiquityTransaction(
      rawPopulatedTransaction,
      this._readable.connection,
      ({ logs, from: userAddress }) => {
        const gainsWithdrawalDetails = this._extractStabilityPoolGainsWithdrawalDetails(logs);
        const [withdrawYUSD] = yusdToken
          .extractEvents(logs, "Transfer")
          .filter(({ args: { from, to } }) => from === stabilityPool.address && to === userAddress)
          .map(({ args: { value } }) => decimalify(value));
        return {
          ...gainsWithdrawalDetails,
          change: { withdrawYUSD, withdrawAllYUSD: gainsWithdrawalDetails.newYUSDDeposit.isZero }
        };
      }
    );
  }
  _wrapCollateralGainTransfer(rawPopulatedTransaction: any): any {
    const { borrowerOperations } = _getContracts(this._readable.connection);
    return new PopulatedEthersLiquityTransaction(
      rawPopulatedTransaction,
      this._readable.connection,
      ({ logs }) => {
        // const [newTrove] = borrowerOperations
        //   .extractEvents(logs, "TroveUpdated")
        //   .map(({ args: { _tokens, _amounts, _debt } }) => new Trove(convertToMap(_tokens, _amounts), convertToMap(['debt'], [_debt])));
        return {
          ...this._extractStabilityPoolGainsWithdrawalDetails(logs),
          // @ts-expect-error: Testing
          newTrove: new Trove({}, {}, { debt: Decimal.ZERO })
        };
      }
    );
  }
  async _findHintsForNominalCollateralRatio(nominalCollateralRatio: any): Promise<[string, string]> {
    const { sortedTroves, hintHelpers } = _getContracts(this._readable.connection);
    const numberOfTroves = await this._readable.getNumberOfTroves();
    if (!numberOfTroves) {
      return [AddressZero, AddressZero];
    }
    if (nominalCollateralRatio.infinite) {
      return [AddressZero, await sortedTroves.getFirst()];
    }
    const totalNumberOfTrials = Math.ceil(4000);
    const [firstTrials, ...restOfTrials] = generateTrials(totalNumberOfTrials);
    const collectApproxHint = ({ latestRandomSeed, results }, numberOfTrials): any =>
      hintHelpers
        .getApproxHint(nominalCollateralRatio.hex, numberOfTrials, latestRandomSeed)
        .then(({ latestRandomSeed, ...result }) => ({
          latestRandomSeed,
          results: [...results, result]
        }));
    const { results } = await restOfTrials.reduce(
      (p, numberOfTrials) => p.then(state => collectApproxHint(state, numberOfTrials)),
      collectApproxHint({ latestRandomSeed: randomInteger(), results: [] }, firstTrials)
    );
    const { hintAddress } = results.reduce((a, b) => (a.diff.lt(b.diff) ? a : b));
    const [prev, next] = await sortedTroves.findInsertPosition(
      nominalCollateralRatio.hex,
      hintAddress,
      hintAddress
    );
    return prev === AddressZero ? [next, next] : next === AddressZero ? [prev, prev] : [prev, next];
  }
  async _findHints(trove: any, ICR: any): Promise<[string, string]> {
    if (trove instanceof TroveWithPendingRedistribution) {
      throw new Error("Rewards must be applied to this Trove");
    }
    // const collPrices: TroveMappings = {};
    // for (let i = 0; i < whitelistedCollaterals.length; i++) {
    //   const [colPrice] = await Promise.all([this._readable.getCollPrice(whitelistedCollaterals[i])]);
    //   collPrices[whitelistedCollaterals[i]] = colPrice;
    // }
    return this._findHintsForNominalCollateralRatio(Decimal.from(ICR));
  }
  async _findRedemptionHints(amount: any): Promise<any> {
    const { hintHelpers } = _getContracts(this._readable.connection);
    const price = Decimal.ZERO; // await this._readable.getCollPrice();
    const {
      firstRedemptionHint,
      partialRedemptionHintAICR,
      truncatedYUSDamount
    } = await hintHelpers.getRedemptionHints(amount.hex, _redeemMaxIterations);
    const [
      partialRedemptionUpperHint,
      partialRedemptionLowerHint
    ] = partialRedemptionHintAICR.isZero()
      ? [AddressZero, AddressZero]
      : await this._findHintsForNominalCollateralRatio(decimalify(partialRedemptionHintAICR));
    return [
      decimalify(truncatedYUSDamount),
      firstRedemptionHint,
      partialRedemptionUpperHint,
      partialRedemptionLowerHint,
      partialRedemptionHintAICR
    ];
  }
  async approveERC20(tokenAddress: any, toAddress: any, amount: any, overrides: any): Promise<any> {
    const signer = _requireSigner(this._readable.connection);
    const ERC20 = _getERC20Token(tokenAddress, signer);
    const result = await ERC20.token.estimateAndPopulate.approve(
      { ...overrides },
      id,
      toAddress,
      Decimal.from(amount).hex
    );
    return this._wrapSimpleTransaction(result);
  }
  async multipleApproveERC20(tokenAddresses: any, toAddresses: any, amounts: any): Promise<any> {
    assert(
      tokenAddresses.length === toAddresses.length,
      "tokenAddresses and toAddresses need to have equal length"
    );
    assert(
      tokenAddresses.length === amounts.length,
      "tokenAddresses and amounts need to have equal length"
    );
    const signer = _requireSigner(this._readable.connection);
    for (let i = 0; i < tokenAddresses.length; i++) {
      const ERC20 = _getERC20Token(tokenAddresses[i], signer);
      await ERC20.token.approve(toAddresses[i], Decimal.from(amounts[i]).hex);
    }
  }
  async mintERC20(tokenAddress: any, overrides: any): Promise<any> {
    const signer = _requireSigner(this._readable.connection);
    const ERC20 = _getTestERC20Token(tokenAddress, signer);
    return await this._wrapSimpleTransaction(
      await ERC20.token.estimateAndPopulate.mint({ ...overrides }, id)
    );
  }
  async mintERC20NoLimit(tokenAddress: any, amount: any, overrides: any): Promise<any> {
    const signer = _requireSigner(this._readable.connection);
    const ERC20 = _getTestERC20TokenNoLimit(tokenAddress, signer);
    return await this._wrapSimpleTransaction(
      await ERC20.token.estimateAndPopulate.mint({ ...overrides }, id, amount.hex)
    );
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.openTrove} */
  // @ts-expect-error: Testing
  async openTrove(
    params: any,
    ICRWithFees: any,
    maxBorrowingRateOrOptionalParams: any,
    overrides: any
  ): Promise<any> {
    const { borrowerOperations } = _getContracts(this._readable.connection);
    const whitelistedCollaterals = await this._readable.getWhitelistedCollaterals();
    const normalizedParams = _normalizeTroveCreation(params);
    const { depositCollaterals, borrowYUSD } = normalizedParams;
    const [fees, blockTimestamp, total, recoveryRatios] = await Promise.all([
      this._readable._getFeesFactory(),
      this._readable._getBlockTimestamp(),
      this._readable.getTotal(),
      this._readable.getRecoveryRatios(whitelistedCollaterals)
    ]);
    const priceMapping = {};
    for (let i = 0; i < whitelistedCollaterals.length; i++) {
      const [colPrice] = await Promise.all([this._readable.getCollPrice(whitelistedCollaterals[i])]);
      priceMapping[whitelistedCollaterals[i]] = colPrice;
    }
    const recoveryMode = total.collateralRatioIsBelowCritical(priceMapping, recoveryRatios);
    const decayBorrowingRate = seconds =>
      fees(blockTimestamp + seconds, recoveryMode).borrowingRate();
    const currentBorrowingRate = decayBorrowingRate(0);
    const newTrove = Trove.create(normalizedParams, currentBorrowingRate);
    const hints = await this._findHints(newTrove, ICRWithFees);
    const {
      maxBorrowingRate,
      borrowingFeeDecayToleranceMinutes
    } = normalizeBorrowingOperationOptionalParams(
      maxBorrowingRateOrOptionalParams,
      currentBorrowingRate
    );
    const txParams = (borrowYUSD: any, collateral: any, collateralAmounts: any): Array<unknown> => [
      maxBorrowingRate.hex,
      borrowYUSD.hex,
      ...hints,
      collateral,
      collateralAmounts
    ];
    const collateralNames = Object.keys(depositCollaterals);
    collateralNames.sort(function (a, b) {
      return whitelistedCollaterals.indexOf(a) - whitelistedCollaterals.indexOf(b);
    });
    const collateral = [];
    for (let i = 0; i < collateralNames.length; i++) {
      collateral[i] = depositCollaterals[collateralNames[i]].hex;
    }
    let gasHeadroom;
    if ((overrides === null || overrides === void 0 ? void 0 : overrides.gasLimit) === undefined) {
      const decayedBorrowingRate = decayBorrowingRate(60 * borrowingFeeDecayToleranceMinutes);
      const decayedTrove = Trove.create(normalizedParams, decayedBorrowingRate);
      const { borrowYUSD: borrowYUSDSimulatingDecay } = Trove.recreate(
        decayedTrove,
        currentBorrowingRate
      );
      if (decayedTrove.debt["debt"].lt(YUSD_MINIMUM_DEBT)) {
        throw new Error(
          `Trove's debt might fall below ${YUSD_MINIMUM_DEBT} ` +
            `within ${borrowingFeeDecayToleranceMinutes} minutes`
        );
      }
      // console.log("OPEN TROVE PARAMS", ...txParams(borrowYUSD['debt'], collateralNames, collateral))
      const [gasNow, gasLater] = await Promise.all([
        borrowerOperations.estimateGas.openTrove(
          //  @ts-expect-error: Testing
          ...txParams(borrowYUSD["debt"], collateralNames, collateral)
        ),
        borrowerOperations.estimateGas.openTrove(
          //  @ts-expect-error: Testing
          ...txParams(borrowYUSDSimulatingDecay["debt"], collateralNames, collateral)
        )
      ]);
      // console.log('gasNow', gasNow)
      // console.log('gasLater', gasLater)
      const gasTotal = addGasForBaseRateUpdate(borrowingFeeDecayToleranceMinutes)(
        bigNumberMax(addGasForPotentialListTraversal(gasNow), gasLater)
      );
      const gasLimit = Math.min(gasTotal.toNumber() * 2 + 1000000, 7900000);
      gasHeadroom = gasLimit;
      overrides = { ...overrides, gasLimit };
    }
    return this._wrapTroveChangeWithFees(
      normalizedParams,
      await borrowerOperations.populateTransaction.openTrove(
        maxBorrowingRate.hex,
        borrowYUSD["debt"].hex,
        ...hints,
        collateralNames,
        collateral,
        overrides
      ),
      gasHeadroom
    );
  }
  async openTroveLeverUp(
    params: any,
    ICRWithFees: any,
    troveOpen: any,
    maxBorrowingRateOrOptionalParams: any,
    overrides: any
  ): Promise<any> {
    const { borrowerOperations } = _getContracts(this._readable.connection);
    const normalizedParams = _normalizeTroveLeverUpCreation(params);
    const {
      depositCollaterals,
      depositCollateralsLeverages,
      depositCollateralsMaxSlippages,
      borrowYUSD,
      decimals
    } = normalizedParams;
    const postLeverageAmounts = {};
    const depositedCollateralsArray = Object.keys(depositCollaterals);
    for (let i = 0; i < depositedCollateralsArray.length; i++) {
      postLeverageAmounts[depositedCollateralsArray[i]] = depositCollaterals[
        depositedCollateralsArray[i]
      ].mul(depositCollateralsLeverages[depositedCollateralsArray[i]]);
    }
    // console.log("postLeverageAmounts", postLeverageAmounts)
    const debt = borrowYUSD["debt"];
    const creationParams = {
      depositCollaterals: postLeverageAmounts,
      decimals: decimals,
      borrowYUSD: { debt: debt }
    };
    // const adjustParams:TroveAdjustmentParams<TroveMappings> = {
    //   depositCollaterals: postLeverageAmounts,
    //   withdrawCollaterals: {},
    //   borrowYUSD: { "debt": debt }
    // };
    const normalizedCreationParams = _normalizeTroveCreation(creationParams);
    // if (troveOpen == "open") {
    //   const normalizedCreationParams = _normalizeTroveCreation(creationParams)
    // } else {
    //   const normalizedCreationParams = _normalizeTroveCreation(creationParams)
    // }
    // console.log(normalizedCreationParams)
    const [fees, blockTimestamp, total] = await Promise.all([
      this._readable._getFeesFactory(),
      this._readable._getBlockTimestamp(),
      this._readable.getTotal()
    ]);
    const priceMapping = {};
    const whitelistedCollaterals = await this._readable.getWhitelistedCollaterals();
    for (let i = 0; i < whitelistedCollaterals.length; i++) {
      const [colPrice] = await Promise.all([this._readable.getCollPrice(whitelistedCollaterals[i])]);
      priceMapping[whitelistedCollaterals[i]] = colPrice;
    }
    const recoveryRatios = await this._readable.getRecoveryRatios(whitelistedCollaterals);
    const recoveryMode = total.collateralRatioIsBelowCritical(priceMapping, recoveryRatios);
    const decayBorrowingRate = seconds =>
      fees(blockTimestamp + seconds, recoveryMode).borrowingRate();
    const currentBorrowingRate = decayBorrowingRate(0);
    // const levera_normalized =
    const newTrove = Trove.create(normalizedCreationParams, ICRWithFees);
    const hints = await this._findHints(newTrove, ICRWithFees);
    const {
      maxBorrowingRate,
      borrowingFeeDecayToleranceMinutes
    } = normalizeBorrowingOperationOptionalParams(
      maxBorrowingRateOrOptionalParams,
      currentBorrowingRate
    );
    const txParams = (
      borrowYUSD: any,
      collateral: any,
      collateralAmounts: any,
      leverages: any,
      maxSlippages: any
    ) => [
      maxBorrowingRate.hex,
      borrowYUSD.hex,
      ...hints,
      collateral,
      collateralAmounts,
      leverages,
      maxSlippages,
      { ...overrides }
    ];
    const collateralNames = Object.keys(depositCollaterals);
    collateralNames.sort(function (a, b) {
      return whitelistedCollaterals.indexOf(a) - whitelistedCollaterals.indexOf(b);
    });
    const amount = [];
    const leverages = [];
    const maxSlippages = [];
    for (let i = 0; i < collateralNames.length; i++) {
      amount[i] = depositCollaterals[collateralNames[i]].hex;
      leverages[i] = depositCollateralsLeverages[collateralNames[i]].hex;
      maxSlippages[i] = depositCollateralsMaxSlippages[collateralNames[i]].hex;
    }
    let gasHeadroom;
    if ((overrides === null || overrides === void 0 ? void 0 : overrides.gasLimit) === undefined) {
      const decayedBorrowingRate = decayBorrowingRate(60 * borrowingFeeDecayToleranceMinutes);
      const decayedTrove = Trove.create(normalizedCreationParams, decayedBorrowingRate);
      const { borrowYUSD: borrowYUSDSimulatingDecay } = Trove.recreate(
        decayedTrove,
        currentBorrowingRate
      );
      // console.log("txParams(borrowYUSD['debt']", borrowYUSD['debt'])
      // console.log("collaterals", collateralNames)
      // console.log("amountHex", amount)
      // console.log("leveragesHex", leverages)
      // console.log("maxSlippagesHex", maxSlippages)
      const [gasNow, gasLater] = await Promise.all([
        // @ts-expect-error: Testing
        borrowerOperations.estimateGas.openTroveLeverUp(
          ...txParams(borrowYUSD["debt"], collateralNames, amount, leverages, maxSlippages)
        ),
        // @ts-expect-error: Testing
        borrowerOperations.estimateGas.openTroveLeverUp(
          ...txParams(borrowYUSD["debt"], collateralNames, amount, leverages, maxSlippages)
        )
      ]);
      // console.log('gasNow', gasNow)
      // console.log('gasLater', gasLater)
      const gasLimit = addGasForBaseRateUpdate(borrowingFeeDecayToleranceMinutes)(
        bigNumberMax(addGasForPotentialListTraversal(gasNow), gasLater)
      );
      gasHeadroom = gasLimit.toNumber() + 1000000;
      overrides = { ...overrides, gasLimit };
    }
    return this._wrapTroveChangeWithFees(
      normalizedParams,
      // @ts-expect-error: Testing
      await borrowerOperations.populateTransaction.openTroveLeverUp(
        maxBorrowingRate.hex,
        borrowYUSD["debt"].hex,
        ...hints,
        collateralNames,
        amount,
        leverages,
        maxSlippages,
        overrides
      ),
      gasHeadroom
    );
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.closeTrove} */
  // @ts-expect-error: Testing
  async closeTrove(overrides: any): Promise<any> {
    const { borrowerOperations } = _getContracts(this._readable.connection);
    return this._wrapTroveClosure(
      await borrowerOperations.estimateAndPopulate.closeTrove({ ...overrides }, id)
    );
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.closeTroveUnleverUp} */
  async closeTroveUnleverUp(params, overrides: any): Promise<any> {
    const { borrowerOperations } = _getContracts(this._readable.connection);
    const whitelistedCollaterals = await this._readable.getWhitelistedCollaterals();
    const { withdrawCollaterals, withdrawCollateralsMaxSlippages } = params;
    const collateralNames = Object.keys(withdrawCollaterals);
    collateralNames.sort(function (a, b) {
      return whitelistedCollaterals.indexOf(a) - whitelistedCollaterals.indexOf(b);
    });
    const amount = [];
    const maxSlippages = [];
    for (let i = 0; i < collateralNames.length; i++) {
      amount[i] = withdrawCollaterals[collateralNames[i]].hex;
      maxSlippages[i] = withdrawCollateralsMaxSlippages[collateralNames[i]].hex;
    }
    console.log("collateralNames", collateralNames);
    console.log("amount", amount);
    console.log("maxSlippages", maxSlippages);
    return this._wrapTroveClosureUnleverUp(
      // @ts-expect-error: Testing
      await borrowerOperations.estimateAndPopulate.closeTroveUnlever(
        { ...overrides },
        id,
        collateralNames,
        amount,
        maxSlippages
      )
    );
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.depositCollateral} */
  // @ts-expect-error: Testing
  depositCollateral(amount: any, ICRWithFees: any, overrides: any): any {
    return this.adjustTrove({ depositCollaterals: amount }, ICRWithFees, undefined, overrides);
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.withdrawCollateral} */
  // @ts-expect-error: Testing
  withdrawCollateral(amount: any, ICRWithFees: any, overrides: any): any {
    return this.adjustTrove({ withdrawCollaterals: amount }, ICRWithFees, undefined, overrides);
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.borrowYUSD} */
  // @ts-expect-error: Testing
  borrowYUSD(amount: any, ICRWithFees: any, maxBorrowingRate: any, overrides: any): any {
    return this.adjustTrove({ borrowYUSD: amount }, ICRWithFees, maxBorrowingRate, overrides);
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.repayYUSD} */
  // @ts-expect-error: Testing
  repayYUSD(amount: any, ICRWithFees: any, overrides: any): any {
    return this.adjustTrove({ repayYUSD: amount }, ICRWithFees, undefined, overrides);
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.adjustTrove} */
  // @ts-expect-error: Testing
  async adjustTrove(
    params: any,
    ICRWithFees: any,
    maxBorrowingRateOrOptionalParams: any,
    overrides: any
  ): Promise<any> {
    const whitelistedCollaterals = await this._readable.getWhitelistedCollaterals();
    const recoveryRatios = await this._readable.getRecoveryRatios(whitelistedCollaterals);
    const address = _requireAddress(this._readable.connection, overrides);
    const { borrowerOperations } = _getContracts(this._readable.connection);
    const normalizedParams = _normalizeTroveAdjustment(params);
    const { depositCollaterals, withdrawCollaterals, borrowYUSD, repayYUSD } = normalizedParams;
    // Checks if it is a borrow or a repay adjustment.
    let borrowIncrease = false;
    let borrowChange = Decimal.ZERO;
    // console.log("repayYUSD", repayYUSD)
    if (repayYUSD != undefined) {
      borrowChange = repayYUSD["debt"];
    }
    if (borrowYUSD != undefined) {
      // console.log("borrowYUSD adjust", borrowYUSD)
      if (borrowYUSD["debt"] != Decimal.ZERO) {
        // console.log("borrowYUSD[debt]", borrowYUSD["debt"])
        borrowIncrease = true;
      }
      borrowChange = borrowYUSD["debt"];
    }
    let deposited = {};
    let withdraw = {};
    // Check to see if DepositCollaterals or Withdraw are undefined
    if (depositCollaterals != undefined) {
      deposited = depositCollaterals;
    }
    if (withdrawCollaterals != undefined) {
      withdraw = withdrawCollaterals;
    }
    // Get the current collateral prices to be adjusted
    const collPrices = {};
    for (let i = 0; i < whitelistedCollaterals.length; i++) {
      const [colPrice] = await Promise.all([this._readable.getCollPrice(whitelistedCollaterals[i])]);
      collPrices[whitelistedCollaterals[i]] = colPrice;
    }
    // for (let i = 0; i < finalWithdraw.length; i++) {
    //   collPrices[finalWithdraw[i]] = await this._readable.getCollPrice(finalWithdraw[i]);
    // }
    // console.log("COL PRICES POPULATABLE", collPrices)
    const collateralNamesDeposit = Object.keys(deposited);
    const collateralNamesWithdraw = Object.keys(withdraw);
    collateralNamesDeposit.sort(function (a, b) {
      return whitelistedCollaterals.indexOf(a) - whitelistedCollaterals.indexOf(b);
    });
    collateralNamesWithdraw.sort(function (a, b) {
      return whitelistedCollaterals.indexOf(a) - whitelistedCollaterals.indexOf(b);
    });
    const amountDeposit = [];
    const amountWithdraw = [];
    for (let i = 0; i < collateralNamesDeposit.length; i++) {
      amountDeposit[i] = deposited[collateralNamesDeposit[i]].hex;
    }
    for (let i = 0; i < collateralNamesWithdraw.length; i++) {
      amountWithdraw[i] = withdraw[collateralNamesWithdraw[i]].hex;
    }
    // Initialize trove and feeVars which are used to find hints.
    const [trove, feeVars] = await Promise.all([
      this._readable.getTrove(address),
      borrowYUSD &&
        promiseAllValues({
          fees: this._readable._getFeesFactory(),
          blockTimestamp: this._readable._getBlockTimestamp(),
          total: this._readable.getTotal(),
          price: collPrices
        })
    ]);
    const decayBorrowingRate = seconds =>
      feeVars === null || feeVars === void 0
        ? void 0
        : feeVars
            .fees(
              feeVars.blockTimestamp + seconds,
              feeVars.total.collateralRatioIsBelowCritical(feeVars.price, recoveryRatios)
            )
            .borrowingRate();
    const currentBorrowingRate = decayBorrowingRate(0);
    // console.log("PopulatableEthersLiquity.ts, normalizedParams", normalizedParams)
    const adjustedTrove = trove.adjust(normalizedParams, currentBorrowingRate);
    // console.log("PopulatableEthersLiquity.ts, ICRwithfees", ICRWithFees)
    const hints = await this._findHints(adjustedTrove, ICRWithFees);
    const {
      maxBorrowingRate,
      borrowingFeeDecayToleranceMinutes
    } = normalizeBorrowingOperationOptionalParams(
      maxBorrowingRateOrOptionalParams,
      currentBorrowingRate
    );
    // Removed value: key in object.
    const txParams = (
      borrowYUSD: any,
      collateralIn: any,
      amountsIn: any,
      collateralOut: any,
      amountsOut: any
    ): any => [
      collateralIn,
      amountsIn,
      collateralOut,
      amountsOut,
      borrowYUSD.hex,
      borrowIncrease,
      ...hints,
      maxBorrowingRate.hex,
      { ...overrides }
    ];
    let gasHeadroom;
    if ((overrides === null || overrides === void 0 ? void 0 : overrides.gasLimit) === undefined) {
      const decayedBorrowingRate = decayBorrowingRate(60 * borrowingFeeDecayToleranceMinutes);
      const decayedTrove = trove.adjust(normalizedParams, decayedBorrowingRate);
      const { borrowYUSD: borrowYUSDSimulatingDecay } = trove.adjustTo(
        decayedTrove,
        currentBorrowingRate
      );
      // if (decayedTrove.debt['debt'].lt(YUSD_MINIMUM_DEBT)) {
      //   throw new Error(
      //     `Trove's debt might fall below ${YUSD_MINIMUM_DEBT} ` +
      //       `within ${borrowingFeeDecayToleranceMinutes} minutes`
      //   );
      // }
      //}
      let finalReturn = {};
      if (borrowYUSD == undefined) {
        finalReturn = { debt: Decimal.ZERO };
      } else {
        finalReturn = borrowYUSD;
      }
      // console.log("collateralNamesDeposit, amountDeposit, collateralNamesWithdraw, amountWithdraw, borrowChange.hex, borrowIncrease, ...hints, maxBorrowingRate.hex", collateralNamesDeposit, amountDeposit, collateralNamesWithdraw, amountWithdraw, borrowChange.hex, borrowIncrease, ...hints, maxBorrowingRate.hex)
      const [gasNow, gasLater] = await Promise.all([
        borrowerOperations.estimateGas.adjustTrove(
          collateralNamesDeposit,
          amountDeposit,
          collateralNamesWithdraw,
          amountWithdraw,
          borrowChange.hex,
          borrowIncrease,
          ...hints,
          maxBorrowingRate.hex
        ),
        borrowerOperations.estimateGas.adjustTrove(
          collateralNamesDeposit,
          amountDeposit,
          collateralNamesWithdraw,
          amountWithdraw,
          borrowChange.hex,
          borrowIncrease,
          ...hints,
          maxBorrowingRate.hex
        )
      ]);
      const gastotal = bigNumberMax(addGasForPotentialListTraversal(gasNow), gasLater);
      // if (borrowYUSD) {
      //   gasLimit = addGasForBaseRateUpdate(borrowingFeeDecayToleranceMinutes)(gasLimit);
      // }
      const gasLimit = Math.min(gastotal.toNumber() * 2 + 1000000, 7900000);
      gasHeadroom = gastotal.toNumber() * 10 + 1000000;
      overrides = { ...overrides, gasLimit };
    }
    // console.log("adjust params", collateralNamesDeposit, amountDeposit, collateralNamesWithdraw, amountWithdraw, borrowChange.hex, borrowIncrease, ...hints, maxBorrowingRate.hex)
    return this._wrapTroveChangeWithFees(
      normalizedParams,
      await borrowerOperations.populateTransaction.adjustTrove(
        collateralNamesDeposit,
        amountDeposit,
        collateralNamesWithdraw,
        amountWithdraw,
        borrowChange.hex,
        borrowIncrease,
        ...hints,
        maxBorrowingRate.hex,
        overrides
      ),
      gasHeadroom
    );
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.addCollLeverUp} */
  async addCollLeverUp(
    params: any,
    ICRWithFees: any,
    maxBorrowingRateOrOptionalParams: any,
    overrides: any
  ): Promise<any> {
    const address = _requireAddress(this._readable.connection, overrides);
    const { borrowerOperations } = _getContracts(this._readable.connection);
    const whitelistedCollaterals = await this._readable.getWhitelistedCollaterals();
    console.log("1");
    const getRecoveryRatios = await this._readable.getRecoveryRatios(whitelistedCollaterals);
    console.log("2");
    const normalizedParams = _normalizeTroveAddCollLeverUp(params);
    console.log("3");
    const {
      depositCollaterals,
      depositCollateralsLeverages,
      depositCollateralsMaxSlippages,
      // @ts-expect-error: Testing
      borrowYUSD
    } = normalizedParams;
    console.log("4", depositCollateralsMaxSlippages);
    // Checks if it is a borrow or a repay adjustment.
    let borrowIncrease = false;
    let borrowChange = Decimal.ZERO;
    if (borrowYUSD != undefined) {
      // console.log("borrowYUSD adjust", borrowYUSD)
      if (borrowYUSD["debt"] != Decimal.ZERO) {
        // console.log("borrowYUSD[debt]", borrowYUSD["debt"])
        borrowIncrease = true;
      }
      borrowChange = borrowYUSD["debt"];
    }
    let deposited = {};
    // Check to see if DepositCollaterals is undefined
    if (depositCollaterals != undefined) {
      deposited = depositCollaterals;
    }
    console.log("5");
    // Get the current collateral prices to be adjusted
    const collPrices = {};
    for (let i = 0; i < whitelistedCollaterals.length; i++) {
      const [colPrice] = await Promise.all([this._readable.getCollPrice(whitelistedCollaterals[i])]);
      collPrices[whitelistedCollaterals[i]] = colPrice;
    }
    console.log("6");
    const collateralNames = Object.keys(deposited);
    collateralNames.sort(function (a, b) {
      return whitelistedCollaterals.indexOf(a) - whitelistedCollaterals.indexOf(b);
    });
    console.log("7");
    const amount = [];
    const leverages = [];
    const maxSlippages = [];
    for (let i = 0; i < collateralNames.length; i++) {
      amount[i] = depositCollaterals[collateralNames[i]].hex;
      leverages[i] = depositCollateralsLeverages[collateralNames[i]].hex;
      maxSlippages[i] = depositCollateralsMaxSlippages[collateralNames[i]].hex;
    }
    console.log("8");
    // Initialize trove and feeVars which are used to find hints.
    const [trove, feeVars] = await Promise.all([
      this._readable.getTrove(address),
      borrowYUSD &&
        promiseAllValues({
          fees: this._readable._getFeesFactory(),
          blockTimestamp: this._readable._getBlockTimestamp(),
          total: this._readable.getTotal(),
          price: collPrices
        })
    ]);
    console.log("9");
    const decayBorrowingRate = seconds =>
      feeVars === null || feeVars === void 0
        ? void 0
        : feeVars
            .fees(
              feeVars.blockTimestamp + seconds,
              feeVars.total.collateralRatioIsBelowCritical(feeVars.price, getRecoveryRatios)
            )
            .borrowingRate();
    console.log("10");
    const currentBorrowingRate = decayBorrowingRate(0);
    // @ts-expect-error: Testing
    const tempTroveAdjustmentParams = normalizedParams.borrowYUSD
      ? {
          depositCollaterals: normalizedParams.depositCollaterals,
          withdrawCollaterals: {},
          // @ts-expect-error: Testing
          borrowYUSD: normalizedParams.borrowYUSD
        }
      : {
          depositCollaterals: normalizedParams.depositCollaterals,
          withdrawCollaterals: {}
        };
    const adjustedTrove = trove.adjust(tempTroveAdjustmentParams, currentBorrowingRate);
    console.log("111");
    const hints = await this._findHints(adjustedTrove, ICRWithFees);
    console.log("11");
    const {
      maxBorrowingRate,
      borrowingFeeDecayToleranceMinutes
    } = normalizeBorrowingOperationOptionalParams(
      maxBorrowingRateOrOptionalParams,
      currentBorrowingRate
    );
    // // Removed value: key in object.
    // const txParams = (borrowYUSD: Decimal, collateralIn: string[], amountsIn: string[], collateralOut:string[], amountsOut:string[]): Parameters<typeof borrowerOperations.adjustTrove> => [
    //   collateralIn,
    //   amountsIn,
    //   collateralOut,
    //   amountsOut,
    //   borrowYUSD.hex,
    //   borrowIncrease,
    //   ...hints,
    //   maxBorrowingRate.hex,
    //   { ...overrides }
    // ];
    let gasHeadroom;
    if ((overrides === null || overrides === void 0 ? void 0 : overrides.gasLimit) === undefined) {
      //   const decayedBorrowingRate = decayBorrowingRate(60 * borrowingFeeDecayToleranceMinutes);
      //   const decayedTrove = trove.adjust(normalizedParams, decayedBorrowingRate);
      //   const { borrowYUSD: borrowYUSDSimulatingDecay } = trove.adjustTo(
      //     decayedTrove,
      //     currentBorrowingRate
      //   );
      //   // if (decayedTrove.debt['debt'].lt(YUSD_MINIMUM_DEBT)) {
      //   //   throw new Error(
      //   //     `Trove's debt might fall below ${YUSD_MINIMUM_DEBT} ` +
      //   //       `within ${borrowingFeeDecayToleranceMinutes} minutes`
      //   //   );
      //   // }
      // //}
      //   const [gasNow, gasLater] = await Promise.all([
      //     borrowerOperations.estimateGas.adjustTrove(...txParams(borrowChange, finalDeposit, new_collateral_hex, finalWithdraw, new_collateral_hex_withdraw)),
      //     borrowYUSD && borrowYUSDSimulatingDecay &&
      //       borrowerOperations.estimateGas.adjustTrove(...txParams(borrowYUSDSimulatingDecay['debt'], finalDeposit, new_collateral_hex, finalWithdraw, new_collateral_hex_withdraw))
      //   ]);
      //   let gasLimit = bigNumberMax(addGasForPotentialListTraversal(gasNow), gasLater);
      //   if (borrowYUSD) {
      //     gasLimit = addGasForBaseRateUpdate(borrowingFeeDecayToleranceMinutes)(gasLimit);
      //   }
      // gasHeadroom = gasLimit.sub(gasNow).toNumber();
    }
    let finalReturn = {};
    if (borrowYUSD == undefined) {
      finalReturn = { debt: Decimal.ZERO };
    } else {
      finalReturn = borrowYUSD;
    }
    // const gasNow = await borrowerOperations.estimateGas.addCollLeverUp(collateralNames, amount, leverages, maxSlippages, borrowChange.hex, ...hints, maxBorrowingRate.hex)
    // const gasLimit = gasNow.toNumber() + 1000000
    // overrides = { ...overrides, gasLimit };
    console.log(
      "HELLOW",
      collateralNames,
      amount,
      leverages,
      maxSlippages,
      borrowChange.hex,
      maxBorrowingRate.hex
    );
    return this._wrapTroveChangeWithFees(
      normalizedParams,
      // @ts-expect-error: Testing
      await borrowerOperations.populateTransaction.addCollLeverUp(
        collateralNames,
        amount,
        leverages,
        maxSlippages,
        borrowChange.hex,
        ...hints,
        maxBorrowingRate.hex,
        overrides
      ),
      gasHeadroom
    );
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.addCollLeverUp} */
  async withdrawCollUnleverUp(
    params,
    ICRWithFees,
    maxBorrowingRateOrOptionalParams,
    overrides: any
  ): Promise<any> {
    const whitelistedCollaterals = await this._readable.getWhitelistedCollaterals();
    const recoveryRatios = await this._readable.getRecoveryRatios(whitelistedCollaterals);
    const address = _requireAddress(this._readable.connection, overrides);
    const { borrowerOperations } = _getContracts(this._readable.connection);
    const normalizedParams = _normalizeTroveWithdrawCollUnleverUp(params);
    // @ts-expect-error: Testing
    const { withdrawCollaterals, withdrawCollateralsMaxSlippages, repayYUSD } = normalizedParams;
    let borrowDecrease = false;
    let borrowChange = Decimal.ZERO;
    if (repayYUSD != undefined) {
      // console.log("borrowYUSD adjust", borrowYUSD)
      if (repayYUSD["debt"] != Decimal.ZERO) {
        // console.log("borrowYUSD[debt]", borrowYUSD["debt"])
        borrowDecrease = true;
      }
      borrowChange = repayYUSD["debt"];
    }
    let withdrawed = {};
    // Check to see if DepositCollaterals is undefined
    if (withdrawCollaterals != undefined) {
      withdrawed = withdrawCollaterals;
    }
    // Get the current collateral prices to be adjusted
    const collPrices = {};
    for (let i = 0; i < whitelistedCollaterals.length; i++) {
      const [colPrice] = await Promise.all([this._readable.getCollPrice(whitelistedCollaterals[i])]);
      collPrices[whitelistedCollaterals[i]] = colPrice;
    }
    const collateralNames = Object.keys(withdrawed);
    collateralNames.sort(function (a, b) {
      return whitelistedCollaterals.indexOf(a) - whitelistedCollaterals.indexOf(b);
    });
    const amount = [];
    const maxSlippages = [];
    for (let i = 0; i < collateralNames.length; i++) {
      amount[i] = withdrawed[collateralNames[i]].hex;
      maxSlippages[i] = withdrawCollateralsMaxSlippages[collateralNames[i]].hex;
    }
    // Initialize trove and feeVars which are used to find hints.
    const [trove, feeVars] = await Promise.all([
      this._readable.getTrove(address),
      repayYUSD &&
        promiseAllValues({
          fees: this._readable._getFeesFactory(),
          blockTimestamp: this._readable._getBlockTimestamp(),
          total: this._readable.getTotal(),
          price: collPrices
        })
    ]);
    const decayBorrowingRate = seconds =>
      feeVars === null || feeVars === void 0
        ? void 0
        : feeVars
            .fees(
              feeVars.blockTimestamp + seconds,
              feeVars.total.collateralRatioIsBelowCritical(feeVars.price, recoveryRatios)
            )
            .borrowingRate();
    const currentBorrowingRate = decayBorrowingRate(0);
    const collateralAmountAfterSlippage = {};
    // for (const [key, value] of Object.entries(normalizedParams.withdrawCollaterals)) {
    //   collateralAmountAfterSlippage[key] = value.sub(value.mul(normalizedParams.withdrawCollateralsMaxSlippages[key.concat('slippage')]))
    // }
    //TODO: include slippage
    // @ts-expect-error: Testing
    const tempTroveAdjustmentParams = normalizedParams.repayYUSD
      ? {
          depositCollaterals: {},
          withdrawCollaterals: normalizedParams.withdrawCollaterals,
          // @ts-expect-error: Testing
          repayYUSD: normalizedParams.repayYUSD
        }
      : {
          depositCollaterals: {},
          withdrawCollaterals: normalizedParams.withdrawCollaterals
        };
    const adjustedTrove = trove.adjust(tempTroveAdjustmentParams, currentBorrowingRate);
    const hints = await this._findHints(adjustedTrove, ICRWithFees);
    const {
      maxBorrowingRate,
      borrowingFeeDecayToleranceMinutes
    } = normalizeBorrowingOperationOptionalParams(
      maxBorrowingRateOrOptionalParams,
      currentBorrowingRate
    );
    // // Removed value: key in object.
    // const txParams = (borrowYUSD: Decimal, collateralIn: string[], amountsIn: string[], collateralOut:string[], amountsOut:string[]): Parameters<typeof borrowerOperations.adjustTrove> => [
    //   collateralIn,
    //   amountsIn,
    //   collateralOut,
    //   amountsOut,
    //   borrowYUSD.hex,
    //   borrowIncrease,
    //   ...hints,
    //   maxBorrowingRate.hex,
    //   { ...overrides }
    // ];
    let gasHeadroom;
    // if (overrides?.gasLimit === undefined) {
    //   const decayedBorrowingRate = decayBorrowingRate(60 * borrowingFeeDecayToleranceMinutes);
    //   const decayedTrove = trove.adjust(normalizedParams, decayedBorrowingRate);
    //   const { borrowYUSD: borrowYUSDSimulatingDecay } = trove.adjustTo(
    //     decayedTrove,
    //     currentBorrowingRate
    //   );
    //   // if (decayedTrove.debt['debt'].lt(YUSD_MINIMUM_DEBT)) {
    //   //   throw new Error(
    //   //     `Trove's debt might fall below ${YUSD_MINIMUM_DEBT} ` +
    //   //       `within ${borrowingFeeDecayToleranceMinutes} minutes`
    //   //   );
    //   // }
    // //}
    //   const [gasNow, gasLater] = await Promise.all([
    //     borrowerOperations.estimateGas.adjustTrove(...txParams(borrowChange, finalDeposit, new_collateral_hex, finalWithdraw, new_collateral_hex_withdraw)),
    //     borrowYUSD && borrowYUSDSimulatingDecay &&
    //       borrowerOperations.estimateGas.adjustTrove(...txParams(borrowYUSDSimulatingDecay['debt'], finalDeposit, new_collateral_hex, finalWithdraw, new_collateral_hex_withdraw))
    //   ]);
    //   let gasLimit = bigNumberMax(addGasForPotentialListTraversal(gasNow), gasLater);
    //   if (borrowYUSD) {
    //     gasLimit = addGasForBaseRateUpdate(borrowingFeeDecayToleranceMinutes)(gasLimit);
    //   }
    //   gasHeadroom = gasLimit.sub(gasNow).toNumber();
    //   overrides = { ...overrides, gasLimit };
    // }
    let finalReturn = {};
    if (repayYUSD == undefined) {
      finalReturn = { debt: Decimal.ZERO };
    } else {
      finalReturn = repayYUSD;
    }
    // @ts-expect-error: Testing
    const gasNow = await borrowerOperations.estimateGas.withdrawCollUnleverUp(
      collateralNames,
      amount,
      maxSlippages,
      borrowChange.hex,
      ...hints
    );
    const gasLimit = gasNow.toNumber() + 1000000;
    overrides = { ...overrides, gasLimit };
    return this._wrapTroveChangeWithFees(
      normalizedParams,
      // @ts-expect-error: Testing
      await borrowerOperations.populateTransaction.withdrawCollUnleverUp(
        collateralNames,
        amount,
        maxSlippages,
        borrowChange.hex,
        ...hints,
        overrides
      ),
      gasHeadroom
    );
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.claimCollateralSurplus} */
  // @ts-expect-error: Testing
  async claimCollateralSurplus(overrides: any): Promise<any> {
    const { collSurplusPool } = _getContracts(this._readable.connection);
    return this._wrapSimpleTransaction(
      // @ts-expect-error: Testing
      await collSurplusPool.estimateAndPopulate.claimCollateral({ ...overrides }, id)
    );
  }
  /** @internal */
  // @ts-expect-error: Testing
  async setPrice(price, overrides: any): Promise<any> {
    const { priceFeed } = _getContracts(this._readable.connection);
    if (!_priceFeedIsTestnet(priceFeed)) {
      throw new Error("setPrice() unavailable on this deployment of Liquity");
    }
    return this._wrapSimpleTransaction(
      await priceFeed.estimateAndPopulate.setPrice({ ...overrides }, id, Decimal.from(price).hex)
    );
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.liquidate} */
  // @ts-expect-error: Testing
  async liquidate(address, liquidator, overrides: any): Promise<any> {
    const { troveManager } = _getContracts(this._readable.connection);
    const decimals = await this._readable.getDecimals(
      await this._readable.getWhitelistedCollaterals()
    );
    if (Array.isArray(address)) {
      return this._wrapLiquidation(
        await troveManager.estimateAndPopulate.batchLiquidateTroves(
          { ...overrides },
          addGasForYETIIssuance,
          address,
          // @ts-expect-error: Testing
          liquidator
        ),
        decimals
      );
    } else {
      return this._wrapLiquidation(
        await troveManager.estimateAndPopulate.liquidate(
          { ...overrides },
          addGasForYETIIssuance,
          address
        ),
        decimals
      );
    }
  }
  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.liquidateUpTo} */
  // async liquidateUpTo(
  //   maximumNumberOfTrovesToLiquidate: number,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<LiquidationDetails>> {
  //   const { troveManager } = _getContracts(this._readable.connection);
  //   return this._wrapLiquidation(
  //     await troveManager.estimateAndPopulate.liquidateTroves(
  //       { ...overrides },
  //       addGasForYETIIssuance,
  //       maximumNumberOfTrovesToLiquidate
  //     )
  //   );
  // }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.depositYUSDInStabilityPool} */
  async depositYUSDInStabilityPool(amount: any, overrides: any): Promise<any> {
    const { stabilityPool } = _getContracts(this._readable.connection);
    const depositYUSD = Decimal.from(amount);
    return this._wrapStabilityDepositTopup(
      { depositYUSD },
      // @ts-expect-error: Testing
      await stabilityPool.estimateAndPopulate.provideToSP(
        { ...overrides },
        addGasForYETIIssuance,
        depositYUSD.hex
      )
    );
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.withdrawYUSDFromStabilityPool} */
  // @ts-expect-error: Testing
  async withdrawYUSDFromStabilityPool(amount: any, overrides: any): Promise<any> {
    const { stabilityPool } = _getContracts(this._readable.connection);
    return this._wrapStabilityDepositWithdrawal(
      await stabilityPool.estimateAndPopulate.withdrawFromSP(
        { ...overrides },
        gasLimit,
        Decimal.from(amount).hex
      )
    );
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.withdrawGainsFromStabilityPool} */
  // @ts-expect-error: Testing
  async withdrawGainsFromStabilityPool(overrides: any): Promise<any> {
    const { stabilityPool } = _getContracts(this._readable.connection);
    return this._wrapStabilityPoolGainsWithdrawal(
      await stabilityPool.estimateAndPopulate.withdrawFromSP(
        { ...overrides },
        gasLimit,
        Decimal.ZERO.hex
      )
    );
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.withdrawYUSDFromStabilityPool} */
  async claimRewardsSwap(amount: any, overrides: any): Promise<any> {
    const { stabilityPool } = _getContracts(this._readable.connection);
    return this._wrapSimpleTransaction(
      // @ts-expect-error: Testing
      await stabilityPool.estimateAndPopulate.claimRewardsSwap({ ...overrides }, id, amount)
    );
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.stakeLPTokens} */
  async stakeLPTokens(amount: any, overrides: any): Promise<any> {
    const { boostedFarm } = _getContracts(this._readable.connection);
    const depositLPTokens = Decimal.from(amount);
    return this._wrapSimpleTransaction(
      await boostedFarm.estimateAndPopulate.deposit({ ...overrides }, id, depositLPTokens.hex)
    );
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.withdrawLPTokens} */
  async withdrawLPTokens(amount: any, overrides: any): Promise<any> {
    const { boostedFarm } = _getContracts(this._readable.connection);
    const withdrawLPTokens = Decimal.from(amount);
    return this._wrapSimpleTransaction(
      await boostedFarm.estimateAndPopulate.withdraw({ ...overrides }, id, withdrawLPTokens.hex)
    );
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.stakeLPTokens} */
  async stakeLPTokensOldFarm(amount: any, overrides: any): Promise<any> {
    const { farm } = _getContracts(this._readable.connection);
    const depositLPTokens = Decimal.from(amount);
    return this._wrapSimpleTransaction(
      await farm.estimateAndPopulate.stake({ ...overrides }, id, depositLPTokens.hex)
    );
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.withdrawLPTokens} */
  async withdrawLPTokensOldFarm(amount: any, overrides: any): Promise<any> {
    const { farm } = _getContracts(this._readable.connection);
    const withdrawLPTokens = Decimal.from(amount);
    return this._wrapSimpleTransaction(
      await farm.estimateAndPopulate.withdraw({ ...overrides }, id, withdrawLPTokens.hex)
    );
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.getFarmRewards} */
  async getFarmRewards(overrides: any): Promise<any> {
    const { boostedFarm } = _getContracts(this._readable.connection);
    return this._wrapSimpleTransaction(
      await boostedFarm.estimateAndPopulate.withdraw({ ...overrides }, id, Decimal.from(0).hex)
    );
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.getFarmRewards} */
  async getOldFarmRewards(overrides: any): Promise<any> {
    const { farm } = _getContracts(this._readable.connection);
    return this._wrapSimpleTransaction(
      await farm.estimateAndPopulate.getReward({ ...overrides }, id)
    );
  }
  async getVeYetiStakeReward(overrides: any): Promise<any> {
    const { veYETIEmissions } = _getContracts(this._readable.connection);
    return this._wrapSimpleTransaction(
      await veYETIEmissions.estimateAndPopulate.getReward({ ...overrides }, id)
    );
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.getFarmRewards} */
  async updateVEYETI(params, overrides: any): Promise<any> {
    const { veYETI } = _getContracts(this._readable.connection);
    return this._wrapSimpleTransaction(
      await veYETI.estimateAndPopulate.update({ ...overrides }, id, params)
    );
  }
  async notifyAllRewarders(overrides: any): Promise<any> {
    const { veYETI } = _getContracts(this._readable.connection);
    return this._wrapSimpleTransaction(
      await veYETI.estimateAndPopulate.notifyAllRewarders({ ...overrides }, id)
    );
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.transferCollateralGainToTrove} */
  // @ts-expect-error: Testing
  async transferCollateralGainToTrove(overrides: any): Promise<any> {
    const address = _requireAddress(this._readable.connection, overrides);
    const { stabilityPool } = _getContracts(this._readable.connection);
    const [initialTrove, stabilityDeposit] = await Promise.all([
      this._readable.getTrove(address),
      this._readable.getStabilityDeposit(address)
    ]);
    const finalTrove = initialTrove.addCollateral(stabilityDeposit.collateralGain);
    return this._wrapCollateralGainTransfer(
      // @ts-expect-error: Testing
      await stabilityPool.estimateAndPopulate.receiveCollateral(
        { ...overrides },
        compose(addGasForPotentialListTraversal, addGasForYETIIssuance),
        Object.keys(stabilityDeposit.collateralGain),
        decToBN(Object.values(stabilityDeposit.collateralGain))
      )
    );
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.sendYUSD} */
  // @ts-expect-error: Testing
  async sendYUSD(toAddress: any, amount: any, overrides: any): Promise<any> {
    const { yusdToken } = _getContracts(this._readable.connection);
    return this._wrapSimpleTransaction(
      await yusdToken.estimateAndPopulate.transfer(
        { ...overrides },
        id,
        toAddress,
        Decimal.from(amount).hex
      )
    );
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.sendYETI} */
  async sendYETI(toAddress: any, amount: any, overrides: any): Promise<any> {
    const { yetiToken } = _getContracts(this._readable.connection);
    return this._wrapSimpleTransaction(
      await yetiToken.estimateAndPopulate.transfer(
        { ...overrides },
        id,
        toAddress,
        Decimal.from(amount).hex
      )
    );
  }
  async getMaxRedeemFee(amount: any): Promise<any> {
    const { troveManager } = _getContracts(this._readable.connection);
  }
  /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.redeemYUSD} */
  // @ts-expect-error: Testing
  async redeemYUSD(amount, maxRedemptionRate, overrides): Promise<any> {
    const { troveManager } = _getContracts(this._readable.connection);
    const attemptedYUSDAmount = Decimal.from(amount);
    const [
      fees,
      total,
      [truncatedAmount, firstRedemptionHint, ...partialHints]
    ] = await Promise.all([
      this._readable.getFees(),
      this._readable.getTotal(),
      this._findRedemptionHints(attemptedYUSDAmount)
    ]);
    if (truncatedAmount.isZero) {
      throw new Error(
        `redeemYUSD: amount too low to redeem (try at least ${YUSD_MINIMUM_NET_DEBT})`
      );
    }
    const defaultMaxRedemptionRate = amount =>
      Decimal.min(
        fees
          .redemptionRate(amount.div(total.debt["debt"]))
          .add(defaultRedemptionRateSlippageTolerance),
        Decimal.ONE
      );

    const populateRedemption = async (
      attemptedYUSDAmount,
      maxRedemptionRate,
      truncatedAmount = attemptedYUSDAmount,
      partialHints: [string, string, BigNumberish] = [AddressZero, AddressZero, 0]
    ) => {
      const maxRedemptionRateOrDefault =
        maxRedemptionRate !== undefined
          ? Decimal.from(maxRedemptionRate)
          : defaultMaxRedemptionRate(truncatedAmount);

      return new PopulatedEthersRedemption(
        await troveManager.estimateAndPopulate.redeemCollateral(
          { ...overrides },
          addGasForBaseRateUpdate(),
          truncatedAmount.hex,
          //INSERT MAX FEE UPDATE BELOW,
          BigNumber.from(0),
          firstRedemptionHint,
          ...partialHints,
          _redeemMaxIterations
        ),
        this._readable.connection,
        attemptedYUSDAmount,
        truncatedAmount,
        // @ts-expect-error: Testing
        truncatedAmount.lt(attemptedYUSDAmount)
          ? newMaxRedemptionRate =>
              populateRedemption(
                truncatedAmount.add(YUSD_MINIMUM_NET_DEBT),
                newMaxRedemptionRate !== null && newMaxRedemptionRate !== void 0
                  ? newMaxRedemptionRate
                  : maxRedemptionRate
              )
          : undefined
      );
    };
    return populateRedemption(attemptedYUSDAmount, maxRedemptionRate, truncatedAmount, partialHints);
  }

  // constructor(readable: ReadableEthersLiquity) {
  //   this._readable = readable;
  // }

  // private _wrapSimpleTransaction(
  //   rawPopulatedTransaction: EthersPopulatedTransaction
  // ): PopulatedEthersLiquityTransaction<void> {
  //   return new PopulatedEthersLiquityTransaction(
  //     rawPopulatedTransaction,
  //     this._readable.connection,
  //     noDetails
  //   );
  // }

  // private _wrapTroveChangeWithFees<T>(
  //   params: T,
  //   rawPopulatedTransaction: EthersPopulatedTransaction,
  //   gasHeadroom?: number
  // ): PopulatedEthersLiquityTransaction<_TroveChangeWithFees<T>> {
  //   const { borrowerOperations } = _getContracts(this._readable.connection);

  //   return new PopulatedEthersLiquityTransaction(
  //     rawPopulatedTransaction,
  //     this._readable.connection,

  //     ({ logs }) => {
  //       const [newTrove] = borrowerOperations
  //         .extractEvents(logs, "TroveUpdated")
  //         .map(({ args: { _coll, _debt } }) => new Trove(decimalify(_coll), decimalify(_debt)));

  //       const [fee] = borrowerOperations
  //         .extractEvents(logs, "YUSDBorrowingFeePaid")
  //         .map(({ args: { _YUSDFee } }) => decimalify(_YUSDFee));

  //       return {
  //         params,
  //         newTrove,
  //         fee
  //       };
  //     },

  //     gasHeadroom
  //   );
  // }

  // private async _wrapTroveClosure(
  //   rawPopulatedTransaction: EthersPopulatedTransaction
  // ): Promise<PopulatedEthersLiquityTransaction<TroveClosureDetails>> {
  //   const { activePool, yusdToken } = _getContracts(this._readable.connection);

  //   return new PopulatedEthersLiquityTransaction(
  //     rawPopulatedTransaction,
  //     this._readable.connection,

  //     ({ logs, from: userAddress }) => {
  //       const [repayYUSD] = yusdToken
  //         .extractEvents(logs, "Transfer")
  //         .filter(({ args: { from, to } }) => from === userAddress && to === AddressZero)
  //         .map(({ args: { value } }) => decimalify(value));

  //       const [withdrawCollateral] = activePool
  //         .extractEvents(logs, "EtherSent")
  //         .filter(({ args: { _to } }) => _to === userAddress)
  //         .map(({ args: { _amount } }) => decimalify(_amount));

  //       return {
  //         params: repayYUSD.nonZero ? { withdrawCollateral, repayYUSD } : { withdrawCollateral }
  //       };
  //     }
  //   );
  // }

  // private _wrapLiquidation(
  //   rawPopulatedTransaction: EthersPopulatedTransaction
  // ): PopulatedEthersLiquityTransaction<LiquidationDetails> {
  //   const { troveManager } = _getContracts(this._readable.connection);

  //   return new PopulatedEthersLiquityTransaction(
  //     rawPopulatedTransaction,
  //     this._readable.connection,

  //     ({ logs }) => {
  //       const liquidatedAddresses = troveManager
  //         .extractEvents(logs, "TroveLiquidated")
  //         .map(({ args: { _borrower } }) => _borrower);

  //       const [totals] = troveManager
  //         .extractEvents(logs, "Liquidation")
  //         .map(
  //           ({
  //             args: { _YUSDGasCompensation, _collGasCompensation, _liquidatedColl, _liquidatedDebt }
  //           }) => ({
  //             collateralGasCompensation: decimalify(_collGasCompensation),
  //             yusdGasCompensation: decimalify(_YUSDGasCompensation),
  //             totalLiquidated: new Trove(decimalify(_liquidatedColl), decimalify(_liquidatedDebt))
  //           })
  //         );

  //       return {
  //         liquidatedAddresses,
  //         ...totals
  //       };
  //     }
  //   );
  // }

  // private _extractStabilityPoolGainsWithdrawalDetails(
  //   logs: Log[]
  // ): StabilityPoolGainsWithdrawalDetails {
  //   const { stabilityPool } = _getContracts(this._readable.connection);

  //   const [newYUSDDeposit] = stabilityPool
  //     .extractEvents(logs, "UserDepositChanged")
  //     .map(({ args: { _newDeposit } }) => decimalify(_newDeposit));

  //   const [[collateralGain, yusdLoss]] = stabilityPool
  //     .extractEvents(logs, "ETHGainWithdrawn")
  //     .map(({ args: { _ETH, _YUSDLoss } }) => [decimalify(_ETH), decimalify(_YUSDLoss)]);

  //   const [lqtyReward] = stabilityPool
  //     .extractEvents(logs, "LQTYPaidToDepositor")
  //     .map(({ args: { _LQTY } }) => decimalify(_LQTY));

  //   return {
  //     yusdLoss,
  //     newYUSDDeposit,
  //     collateralGain,
  //     lqtyReward
  //   };
  // }

  // private _wrapStabilityPoolGainsWithdrawal(
  //   rawPopulatedTransaction: EthersPopulatedTransaction
  // ): PopulatedEthersLiquityTransaction<StabilityPoolGainsWithdrawalDetails> {
  //   return new PopulatedEthersLiquityTransaction(
  //     rawPopulatedTransaction,
  //     this._readable.connection,
  //     ({ logs }) => this._extractStabilityPoolGainsWithdrawalDetails(logs)
  //   );
  // }

  // private _wrapStabilityDepositTopup(
  //   change: { depositYUSD: Decimal },
  //   rawPopulatedTransaction: EthersPopulatedTransaction
  // ): PopulatedEthersLiquityTransaction<StabilityDepositChangeDetails> {
  //   return new PopulatedEthersLiquityTransaction(
  //     rawPopulatedTransaction,
  //     this._readable.connection,

  //     ({ logs }) => ({
  //       ...this._extractStabilityPoolGainsWithdrawalDetails(logs),
  //       change
  //     })
  //   );
  // }

  // private async _wrapStabilityDepositWithdrawal(
  //   rawPopulatedTransaction: EthersPopulatedTransaction
  // ): Promise<PopulatedEthersLiquityTransaction<StabilityDepositChangeDetails>> {
  //   const { stabilityPool, yusdToken } = _getContracts(this._readable.connection);

  //   return new PopulatedEthersLiquityTransaction(
  //     rawPopulatedTransaction,
  //     this._readable.connection,

  //     ({ logs, from: userAddress }) => {
  //       const gainsWithdrawalDetails = this._extractStabilityPoolGainsWithdrawalDetails(logs);

  //       const [withdrawYUSD] = yusdToken
  //         .extractEvents(logs, "Transfer")
  //         .filter(({ args: { from, to } }) => from === stabilityPool.address && to === userAddress)
  //         .map(({ args: { value } }) => decimalify(value));

  //       return {
  //         ...gainsWithdrawalDetails,
  //         change: { withdrawYUSD, withdrawAllYUSD: gainsWithdrawalDetails.newYUSDDeposit.isZero }
  //       };
  //     }
  //   );
  // }

  // private _wrapCollateralGainTransfer(
  //   rawPopulatedTransaction: EthersPopulatedTransaction
  // ): PopulatedEthersLiquityTransaction<CollateralGainTransferDetails> {
  //   const { borrowerOperations } = _getContracts(this._readable.connection);

  //   return new PopulatedEthersLiquityTransaction(
  //     rawPopulatedTransaction,
  //     this._readable.connection,

  //     ({ logs }) => {
  //       const [newTrove] = borrowerOperations
  //         .extractEvents(logs, "TroveUpdated")
  //         .map(({ args: { _coll, _debt } }) => new Trove(decimalify(_coll), decimalify(_debt)));

  //       return {
  //         ...this._extractStabilityPoolGainsWithdrawalDetails(logs),
  //         newTrove
  //       };
  //     }
  //   );
  // }

  // private async _findHintsForNominalCollateralRatio(
  //   nominalCollateralRatio: Decimal,
  //   ownAddress?: string
  // ): Promise<[string, string]> {
  //   const { sortedTroves, hintHelpers } = _getContracts(this._readable.connection);
  //   const numberOfTroves = await this._readable.getNumberOfTroves();

  //   if (!numberOfTroves) {
  //     return [AddressZero, AddressZero];
  //   }

  //   if (nominalCollateralRatio.infinite) {
  //     return [AddressZero, await sortedTroves.getFirst()];
  //   }

  //   const totalNumberOfTrials = Math.ceil(10 * Math.sqrt(numberOfTroves));
  //   const [firstTrials, ...restOfTrials] = generateTrials(totalNumberOfTrials);

  //   const collectApproxHint = (
  //     {
  //       latestRandomSeed,
  //       results
  //     }: {
  //       latestRandomSeed: BigNumberish;
  //       results: { diff: BigNumber; hintAddress: string }[];
  //     },
  //     numberOfTrials: number
  //   ) =>
  //     hintHelpers
  //       .getApproxHint(nominalCollateralRatio.hex, numberOfTrials, latestRandomSeed)
  //       .then(({ latestRandomSeed, ...result }) => ({
  //         latestRandomSeed,
  //         results: [...results, result]
  //       }));

  //   const { results } = await restOfTrials.reduce(
  //     (p, numberOfTrials) => p.then(state => collectApproxHint(state, numberOfTrials)),
  //     collectApproxHint({ latestRandomSeed: randomInteger(), results: [] }, firstTrials)
  //   );

  //   const { hintAddress } = results.reduce((a, b) => (a.diff.lt(b.diff) ? a : b));

  //   let [prev, next] = await sortedTroves.findInsertPosition(
  //     nominalCollateralRatio.hex,
  //     hintAddress,
  //     hintAddress
  //   );

  //   if (ownAddress) {
  //     // In the case of reinsertion, the address of the Trove being reinserted is not a usable hint,
  //     // because it is deleted from the list before the reinsertion.
  //     // "Jump over" the Trove to get the proper hint.
  //     if (prev === ownAddress) {
  //       prev = await sortedTroves.getPrev(prev);
  //     } else if (next === ownAddress) {
  //       next = await sortedTroves.getNext(next);
  //     }
  //   }

  //   // Don't use `address(0)` as hint as it can result in huge gas cost.
  //   // (See https://github.com/0xDyeus/yeti2-app-staging/issues/600).
  //   if (prev === AddressZero) {
  //     prev = next;
  //   } else if (next === AddressZero) {
  //     next = prev;
  //   }

  //   return [prev, next];
  // }

  // private async _findHints(trove: Trove, ownAddress?: string): Promise<[string, string]> {
  //   if (trove instanceof TroveWithPendingRedistribution) {
  //     throw new Error("Rewards must be applied to this Trove");
  //   }

  //   return this._findHintsForNominalCollateralRatio(trove._nominalCollateralRatio, ownAddress);
  // }

  // private async _findRedemptionHints(
  //   amount: Decimal
  // ): Promise<
  //   [
  //     truncatedAmount: Decimal,
  //     firstRedemptionHint: string,
  //     partialRedemptionUpperHint: string,
  //     partialRedemptionLowerHint: string,
  //     partialRedemptionHintNICR: BigNumber
  //   ]
  // > {
  //   const { hintHelpers } = _getContracts(this._readable.connection);
  //   const price = await this._readable.getPrice();

  //   const {
  //     firstRedemptionHint,
  //     partialRedemptionHintNICR,
  //     truncatedYUSDamount
  //   } = await hintHelpers.getRedemptionHints(amount.hex, price.hex, _redeemMaxIterations);

  //   const [
  //     partialRedemptionUpperHint,
  //     partialRedemptionLowerHint
  //   ] = partialRedemptionHintNICR.isZero()
  //     ? [AddressZero, AddressZero]
  //     : await this._findHintsForNominalCollateralRatio(
  //         decimalify(partialRedemptionHintNICR)
  //         // XXX: if we knew the partially redeemed Trove's address, we'd pass it here
  //       );

  //   return [
  //     decimalify(truncatedYUSDamount),
  //     firstRedemptionHint,
  //     partialRedemptionUpperHint,
  //     partialRedemptionLowerHint,
  //     partialRedemptionHintNICR
  //   ];
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.openTrove} */
  // async openTrove(
  //   params: TroveCreationParams<Decimalish>,
  //   maxBorrowingRateOrOptionalParams?: Decimalish | BorrowingOperationOptionalParams,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<TroveCreationDetails>> {
  //   const { borrowerOperations } = _getContracts(this._readable.connection);

  //   const normalizedParams = _normalizeTroveCreation(params);
  //   const { depositCollateral, borrowYUSD } = normalizedParams;

  //   const [fees, blockTimestamp, total, price] = await Promise.all([
  //     this._readable._getFeesFactory(),
  //     this._readable._getBlockTimestamp(),
  //     this._readable.getTotal(),
  //     this._readable.getPrice()
  //   ]);

  //   const recoveryMode = total.collateralRatioIsBelowCritical(price);

  //   const decayBorrowingRate = (seconds: number) =>
  //     fees(blockTimestamp + seconds, recoveryMode).borrowingRate();

  //   const currentBorrowingRate = decayBorrowingRate(0);
  //   const newTrove = Trove.create(normalizedParams, currentBorrowingRate);
  //   const hints = await this._findHints(newTrove);

  //   const {
  //     maxBorrowingRate,
  //     borrowingFeeDecayToleranceMinutes
  //   } = normalizeBorrowingOperationOptionalParams(
  //     maxBorrowingRateOrOptionalParams,
  //     currentBorrowingRate
  //   );

  //   const txParams = (borrowYUSD: Decimal): Parameters<typeof borrowerOperations.openTrove> => [
  //     maxBorrowingRate.hex,
  //     borrowYUSD.hex,
  //     ...hints,
  //     { value: depositCollateral.hex, ...overrides }
  //   ];

  //   let gasHeadroom: number | undefined;

  //   if (overrides?.gasLimit === undefined) {
  //     const decayedBorrowingRate = decayBorrowingRate(60 * borrowingFeeDecayToleranceMinutes);
  //     const decayedTrove = Trove.create(normalizedParams, decayedBorrowingRate);
  //     const { borrowYUSD: borrowYUSDSimulatingDecay } = Trove.recreate(
  //       decayedTrove,
  //       currentBorrowingRate
  //     );

  //     if (decayedTrove.debt.lt(YUSD_MINIMUM_DEBT)) {
  //       throw new Error(
  //         `Trove's debt might fall below ${YUSD_MINIMUM_DEBT} ` +
  //           `within ${borrowingFeeDecayToleranceMinutes} minutes`
  //       );
  //     }

  //     const [gasNow, gasLater] = await Promise.all([
  //       borrowerOperations.estimateGas.openTrove(...txParams(borrowYUSD)),
  //       borrowerOperations.estimateGas.openTrove(...txParams(borrowYUSDSimulatingDecay))
  //     ]);

  //     const gasLimit = addGasForBaseRateUpdate(borrowingFeeDecayToleranceMinutes)(
  //       bigNumberMax(addGasForPotentialListTraversal(gasNow), gasLater)
  //     );

  //     gasHeadroom = gasLimit.sub(gasNow).toNumber();
  //     overrides = { ...overrides, gasLimit };
  //   }

  //   return this._wrapTroveChangeWithFees(
  //     normalizedParams,
  //     await borrowerOperations.populateTransaction.openTrove(...txParams(borrowYUSD)),
  //     gasHeadroom
  //   );
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.closeTrove} */
  // async closeTrove(
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<TroveClosureDetails>> {
  //   const { borrowerOperations } = _getContracts(this._readable.connection);

  //   return this._wrapTroveClosure(
  //     await borrowerOperations.estimateAndPopulate.closeTrove({ ...overrides }, id)
  //   );
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.depositCollateral} */
  // depositCollateral(
  //   amount: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<TroveAdjustmentDetails>> {
  //   return this.adjustTrove({ depositCollateral: amount }, undefined, overrides);
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.withdrawCollateral} */
  // withdrawCollateral(
  //   amount: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<TroveAdjustmentDetails>> {
  //   return this.adjustTrove({ withdrawCollateral: amount }, undefined, overrides);
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.borrowYUSD} */
  // borrowYUSD(
  //   amount: Decimalish,
  //   maxBorrowingRate?: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<TroveAdjustmentDetails>> {
  //   return this.adjustTrove({ borrowYUSD: amount }, maxBorrowingRate, overrides);
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.repayYUSD} */
  // repayYUSD(
  //   amount: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<TroveAdjustmentDetails>> {
  //   return this.adjustTrove({ repayYUSD: amount }, undefined, overrides);
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.adjustTrove} */
  // async adjustTrove(
  //   params: TroveAdjustmentParams<Decimalish>,
  //   maxBorrowingRateOrOptionalParams?: Decimalish | BorrowingOperationOptionalParams,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<TroveAdjustmentDetails>> {
  //   const address = _requireAddress(this._readable.connection, overrides);
  //   const { borrowerOperations } = _getContracts(this._readable.connection);

  //   const normalizedParams = _normalizeTroveAdjustment(params);
  //   const { depositCollateral, withdrawCollateral, borrowYUSD, repayYUSD } = normalizedParams;

  //   const [trove, feeVars] = await Promise.all([
  //     this._readable.getTrove(address),
  //     borrowYUSD &&
  //       promiseAllValues({
  //         fees: this._readable._getFeesFactory(),
  //         blockTimestamp: this._readable._getBlockTimestamp(),
  //         total: this._readable.getTotal(),
  //         price: this._readable.getPrice()
  //       })
  //   ]);

  //   const decayBorrowingRate = (seconds: number) =>
  //     feeVars
  //       ?.fees(
  //         feeVars.blockTimestamp + seconds,
  //         feeVars.total.collateralRatioIsBelowCritical(feeVars.price)
  //       )
  //       .borrowingRate();

  //   const currentBorrowingRate = decayBorrowingRate(0);
  //   const adjustedTrove = trove.adjust(normalizedParams, currentBorrowingRate);
  //   const hints = await this._findHints(adjustedTrove, address);

  //   const {
  //     maxBorrowingRate,
  //     borrowingFeeDecayToleranceMinutes
  //   } = normalizeBorrowingOperationOptionalParams(
  //     maxBorrowingRateOrOptionalParams,
  //     currentBorrowingRate
  //   );

  //   const txParams = (borrowYUSD?: Decimal): Parameters<typeof borrowerOperations.adjustTrove> => [
  //     maxBorrowingRate.hex,
  //     (withdrawCollateral ?? Decimal.ZERO).hex,
  //     (borrowYUSD ?? repayYUSD ?? Decimal.ZERO).hex,
  //     !!borrowYUSD,
  //     ...hints,
  //     { value: depositCollateral?.hex, ...overrides }
  //   ];

  //   let gasHeadroom: number | undefined;

  //   if (overrides?.gasLimit === undefined) {
  //     const decayedBorrowingRate = decayBorrowingRate(60 * borrowingFeeDecayToleranceMinutes);
  //     const decayedTrove = trove.adjust(normalizedParams, decayedBorrowingRate);
  //     const { borrowYUSD: borrowYUSDSimulatingDecay } = trove.adjustTo(
  //       decayedTrove,
  //       currentBorrowingRate
  //     );

  //     if (decayedTrove.debt.lt(YUSD_MINIMUM_DEBT)) {
  //       throw new Error(
  //         `Trove's debt might fall below ${YUSD_MINIMUM_DEBT} ` +
  //           `within ${borrowingFeeDecayToleranceMinutes} minutes`
  //       );
  //     }

  //     const [gasNow, gasLater] = await Promise.all([
  //       borrowerOperations.estimateGas.adjustTrove(...txParams(borrowYUSD)),
  //       borrowYUSD &&
  //         borrowerOperations.estimateGas.adjustTrove(...txParams(borrowYUSDSimulatingDecay))
  //     ]);

  //     let gasLimit = bigNumberMax(addGasForPotentialListTraversal(gasNow), gasLater);

  //     if (borrowYUSD) {
  //       gasLimit = addGasForBaseRateUpdate(borrowingFeeDecayToleranceMinutes)(gasLimit);
  //     }

  //     gasHeadroom = gasLimit.sub(gasNow).toNumber();
  //     overrides = { ...overrides, gasLimit };
  //   }

  //   return this._wrapTroveChangeWithFees(
  //     normalizedParams,
  //     await borrowerOperations.populateTransaction.adjustTrove(...txParams(borrowYUSD)),
  //     gasHeadroom
  //   );
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.claimCollateralSurplus} */
  // async claimCollateralSurplus(
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<void>> {
  //   const { borrowerOperations } = _getContracts(this._readable.connection);

  //   return this._wrapSimpleTransaction(
  //     await borrowerOperations.estimateAndPopulate.claimCollateral({ ...overrides }, id)
  //   );
  // }

  // /** @internal */
  // async setPrice(
  //   price: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<void>> {
  //   const { priceFeed } = _getContracts(this._readable.connection);

  //   if (!_priceFeedIsTestnet(priceFeed)) {
  //     throw new Error("setPrice() unavailable on this deployment of Liquity");
  //   }

  //   return this._wrapSimpleTransaction(
  //     await priceFeed.estimateAndPopulate.setPrice({ ...overrides }, id, Decimal.from(price).hex)
  //   );
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.liquidate} */
  // async liquidate(
  //   address: string | string[],
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<LiquidationDetails>> {
  //   const { troveManager } = _getContracts(this._readable.connection);

  //   if (Array.isArray(address)) {
  //     return this._wrapLiquidation(
  //       await troveManager.estimateAndPopulate.batchLiquidateTroves(
  //         { ...overrides },
  //         addGasForLQTYIssuance,
  //         address
  //       )
  //     );
  //   } else {
  //     return this._wrapLiquidation(
  //       await troveManager.estimateAndPopulate.liquidate(
  //         { ...overrides },
  //         addGasForLQTYIssuance,
  //         address
  //       )
  //     );
  //   }
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.liquidateUpTo} */
  // async liquidateUpTo(
  //   maximumNumberOfTrovesToLiquidate: number,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<LiquidationDetails>> {
  //   const { troveManager } = _getContracts(this._readable.connection);

  //   return this._wrapLiquidation(
  //     await troveManager.estimateAndPopulate.liquidateTroves(
  //       { ...overrides },
  //       addGasForLQTYIssuance,
  //       maximumNumberOfTrovesToLiquidate
  //     )
  //   );
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.depositYUSDInStabilityPool} */
  // async depositYUSDInStabilityPool(
  //   amount: Decimalish,
  //   frontendTag?: string,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<StabilityDepositChangeDetails>> {
  //   const { stabilityPool } = _getContracts(this._readable.connection);
  //   const depositYUSD = Decimal.from(amount);

  //   return this._wrapStabilityDepositTopup(
  //     { depositYUSD },
  //     await stabilityPool.estimateAndPopulate.provideToSP(
  //       { ...overrides },
  //       addGasForLQTYIssuance,
  //       depositYUSD.hex,
  //       frontendTag ?? this._readable.connection.frontendTag ?? AddressZero
  //     )
  //   );
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.withdrawYUSDFromStabilityPool} */
  // async withdrawYUSDFromStabilityPool(
  //   amount: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<StabilityDepositChangeDetails>> {
  //   const { stabilityPool } = _getContracts(this._readable.connection);

  //   return this._wrapStabilityDepositWithdrawal(
  //     await stabilityPool.estimateAndPopulate.withdrawFromSP(
  //       { ...overrides },
  //       addGasForLQTYIssuance,
  //       Decimal.from(amount).hex
  //     )
  //   );
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.withdrawGainsFromStabilityPool} */
  // async withdrawGainsFromStabilityPool(
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<StabilityPoolGainsWithdrawalDetails>> {
  //   const { stabilityPool } = _getContracts(this._readable.connection);

  //   return this._wrapStabilityPoolGainsWithdrawal(
  //     await stabilityPool.estimateAndPopulate.withdrawFromSP(
  //       { ...overrides },
  //       addGasForLQTYIssuance,
  //       Decimal.ZERO.hex
  //     )
  //   );
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.transferCollateralGainToTrove} */
  // async transferCollateralGainToTrove(
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<CollateralGainTransferDetails>> {
  //   const address = _requireAddress(this._readable.connection, overrides);
  //   const { stabilityPool } = _getContracts(this._readable.connection);

  //   const [initialTrove, stabilityDeposit] = await Promise.all([
  //     this._readable.getTrove(address),
  //     this._readable.getStabilityDeposit(address)
  //   ]);

  //   const finalTrove = initialTrove.addCollateral(stabilityDeposit.collateralGain);

  //   return this._wrapCollateralGainTransfer(
  //     await stabilityPool.estimateAndPopulate.withdrawETHGainToTrove(
  //       { ...overrides },
  //       compose(addGasForPotentialListTraversal, addGasForLQTYIssuance),
  //       ...(await this._findHints(finalTrove, address))
  //     )
  //   );
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.sendYUSD} */
  // async sendYUSD(
  //   toAddress: string,
  //   amount: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<void>> {
  //   const { yusdToken } = _getContracts(this._readable.connection);

  //   return this._wrapSimpleTransaction(
  //     await yusdToken.estimateAndPopulate.transfer(
  //       { ...overrides },
  //       id,
  //       toAddress,
  //       Decimal.from(amount).hex
  //     )
  //   );
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.sendLQTY} */
  // async sendLQTY(
  //   toAddress: string,
  //   amount: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<void>> {
  //   const { lqtyToken } = _getContracts(this._readable.connection);

  //   return this._wrapSimpleTransaction(
  //     await lqtyToken.estimateAndPopulate.transfer(
  //       { ...overrides },
  //       id,
  //       toAddress,
  //       Decimal.from(amount).hex
  //     )
  //   );
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.redeemYUSD} */
  // async redeemYUSD(
  //   amount: Decimalish,
  //   maxRedemptionRate?: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersRedemption> {
  //   const { troveManager } = _getContracts(this._readable.connection);
  //   const attemptedYUSDAmount = Decimal.from(amount);

  //   const [
  //     fees,
  //     total,
  //     [truncatedAmount, firstRedemptionHint, ...partialHints]
  //   ] = await Promise.all([
  //     this._readable.getFees(),
  //     this._readable.getTotal(),
  //     this._findRedemptionHints(attemptedYUSDAmount)
  //   ]);

  //   if (truncatedAmount.isZero) {
  //     throw new Error(
  //       `redeemYUSD: amount too low to redeem (try at least ${YUSD_MINIMUM_NET_DEBT})`
  //     );
  //   }

  //   const defaultMaxRedemptionRate = (amount: Decimal) =>
  //     Decimal.min(
  //       fees.redemptionRate(amount.div(total.debt)).add(defaultRedemptionRateSlippageTolerance),
  //       Decimal.ONE
  //     );

  //   const populateRedemption = async (
  //     attemptedYUSDAmount: Decimal,
  //     maxRedemptionRate?: Decimalish,
  //     truncatedAmount: Decimal = attemptedYUSDAmount,
  //     partialHints: [string, string, BigNumberish] = [AddressZero, AddressZero, 0]
  //   ): Promise<PopulatedEthersRedemption> => {
  //     const maxRedemptionRateOrDefault =
  //       maxRedemptionRate !== undefined
  //         ? Decimal.from(maxRedemptionRate)
  //         : defaultMaxRedemptionRate(truncatedAmount);

  //     return new PopulatedEthersRedemption(
  //       await troveManager.estimateAndPopulate.redeemCollateral(
  //         { ...overrides },
  //         addGasForBaseRateUpdate(),
  //         truncatedAmount.hex,
  //         firstRedemptionHint,
  //         ...partialHints,
  //         _redeemMaxIterations,
  //         maxRedemptionRateOrDefault.hex
  //       ),

  //       this._readable.connection,
  //       attemptedYUSDAmount,
  //       truncatedAmount,

  //       truncatedAmount.lt(attemptedYUSDAmount)
  //         ? newMaxRedemptionRate =>
  //             populateRedemption(
  //               truncatedAmount.add(YUSD_MINIMUM_NET_DEBT),
  //               newMaxRedemptionRate ?? maxRedemptionRate
  //             )
  //         : undefined
  //     );
  //   };

  //   return populateRedemption(attemptedYUSDAmount, maxRedemptionRate, truncatedAmount, partialHints);
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.stakeLQTY} */
  // async stakeLQTY(
  //   amount: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<void>> {
  //   const { lqtyStaking } = _getContracts(this._readable.connection);

  //   return this._wrapSimpleTransaction(
  //     await lqtyStaking.estimateAndPopulate.stake({ ...overrides }, id, Decimal.from(amount).hex)
  //   );
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.unstakeLQTY} */
  // async unstakeLQTY(
  //   amount: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<void>> {
  //   const { lqtyStaking } = _getContracts(this._readable.connection);

  //   return this._wrapSimpleTransaction(
  //     await lqtyStaking.estimateAndPopulate.unstake({ ...overrides }, id, Decimal.from(amount).hex)
  //   );
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.withdrawGainsFromStaking} */
  // withdrawGainsFromStaking(
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<void>> {
  //   return this.unstakeLQTY(Decimal.ZERO, overrides);
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.registerFrontend} */
  // async registerFrontend(
  //   kickbackRate: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<void>> {
  //   const { stabilityPool } = _getContracts(this._readable.connection);

  //   return this._wrapSimpleTransaction(
  //     await stabilityPool.estimateAndPopulate.registerFrontEnd(
  //       { ...overrides },
  //       id,
  //       Decimal.from(kickbackRate).hex
  //     )
  //   );
  // }

  // /** @internal */
  // async _mintUniToken(
  //   amount: Decimalish,
  //   address?: string,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<void>> {
  //   address ??= _requireAddress(this._readable.connection, overrides);
  //   const { uniToken } = _getContracts(this._readable.connection);

  //   if (!_uniTokenIsMock(uniToken)) {
  //     throw new Error("_mintUniToken() unavailable on this deployment of Liquity");
  //   }

  //   return this._wrapSimpleTransaction(
  //     await uniToken.estimateAndPopulate.mint(
  //       { ...overrides },
  //       id,
  //       address,
  //       Decimal.from(amount).hex
  //     )
  //   );
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.approveUniTokens} */
  // async approveUniTokens(
  //   allowance?: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<void>> {
  //   const { uniToken, unipool } = _getContracts(this._readable.connection);

  //   return this._wrapSimpleTransaction(
  //     await uniToken.estimateAndPopulate.approve(
  //       { ...overrides },
  //       id,
  //       unipool.address,
  //       Decimal.from(allowance ?? Decimal.INFINITY).hex
  //     )
  //   );
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.stakeUniTokens} */
  // async stakeUniTokens(
  //   amount: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<void>> {
  //   const { unipool } = _getContracts(this._readable.connection);

  //   return this._wrapSimpleTransaction(
  //     await unipool.estimateAndPopulate.stake(
  //       { ...overrides },
  //       addGasForUnipoolRewardUpdate,
  //       Decimal.from(amount).hex
  //     )
  //   );
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.unstakeUniTokens} */
  // async unstakeUniTokens(
  //   amount: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<void>> {
  //   const { unipool } = _getContracts(this._readable.connection);

  //   return this._wrapSimpleTransaction(
  //     await unipool.estimateAndPopulate.withdraw(
  //       { ...overrides },
  //       addGasForUnipoolRewardUpdate,
  //       Decimal.from(amount).hex
  //     )
  //   );
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.withdrawLQTYRewardFromLiquidityMining} */
  // async withdrawLQTYRewardFromLiquidityMining(
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<void>> {
  //   const { unipool } = _getContracts(this._readable.connection);

  //   return this._wrapSimpleTransaction(
  //     await unipool.estimateAndPopulate.claimReward({ ...overrides }, addGasForUnipoolRewardUpdate)
  //   );
  // }

  // /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.exitLiquidityMining} */
  // async exitLiquidityMining(
  //   overrides?: EthersTransactionOverrides
  // ): Promise<PopulatedEthersLiquityTransaction<void>> {
  //   const { unipool } = _getContracts(this._readable.connection);

  //   return this._wrapSimpleTransaction(
  //     await unipool.estimateAndPopulate.withdrawAndClaim(
  //       { ...overrides },
  //       addGasForUnipoolRewardUpdate
  //     )
  //   );
  // }
}
