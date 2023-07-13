import assert from "assert";

import { Decimal, Decimalish } from "./Decimal";

import {
  MINIMUM_COLLATERAL_RATIO,
  CRITICAL_COLLATERAL_RATIO,
  YUSD_LIQUIDATION_RESERVE,
  MINIMUM_BORROWING_RATE
} from "./constants";

/** @internal */ export type _CollateralDeposit<T> = { depositCollaterals: T };
/** @internal */ export type _CollateralWithdrawal<T> = { withdrawCollaterals: T };
/** @internal */ export type _YUSDBorrowing<T> = { borrowYUSD: T };
/** @internal */ export type _YUSDRepayment<T> = { repayYUSD: T };

/** @internal */ export type _NoCollateralDeposit = Partial<_CollateralDeposit<undefined>>;
/** @internal */ export type _NoCollateralWithdrawal = Partial<_CollateralWithdrawal<undefined>>;
/** @internal */ export type _NoYUSDBorrowing = Partial<_YUSDBorrowing<undefined>>;
/** @internal */ export type _NoYUSDRepayment = Partial<_YUSDRepayment<undefined>>;

/** @internal */
export type _CollateralChange<T> =
  | (_CollateralDeposit<T> & _NoCollateralWithdrawal)
  | (_CollateralWithdrawal<T> & _NoCollateralDeposit);

/** @internal */
export type _NoCollateralChange = _NoCollateralDeposit & _NoCollateralWithdrawal;

/** @internal */
export type _DebtChange<T> =
  | (_YUSDBorrowing<T> & _NoYUSDRepayment)
  | (_YUSDRepayment<T> & _NoYUSDBorrowing);

/** @internal */
export type _NoDebtChange = _NoYUSDBorrowing & _NoYUSDRepayment;

/**
 * Parameters of an {@link TransactableLiquity.openTrove | openTrove()} transaction.
 *
 * @remarks
 * The type parameter `T` specifies the allowed value type(s) of the particular `TroveCreationParams`
 * object's properties.
 *
 * <h2>Properties</h2>
 *
 * <table>
 *
 *   <tr>
 *     <th> Property </th>
 *     <th> Type </th>
 *     <th> Description </th>
 *   </tr>
 *
 *   <tr>
 *     <td> depositCollateral </td>
 *     <td> T </td>
 *     <td> The amount of collateral that's deposited. </td>
 *   </tr>
 *
 *   <tr>
 *     <td> borrowYUSD </td>
 *     <td> T </td>
 *     <td> The amount of YUSD that's borrowed. </td>
 *   </tr>
 *
 * </table>
 *
 * @public
 */
export type TroveCreationParams<T = unknown> = _CollateralDeposit<T> &
  _NoCollateralWithdrawal &
  _YUSDBorrowing<T> &
  _NoYUSDRepayment;

/**
 * Parameters of a {@link TransactableLiquity.closeTrove | closeTrove()} transaction.
 *
 * @remarks
 * The type parameter `T` specifies the allowed value type(s) of the particular `TroveClosureParams`
 * object's properties.
 *
 * <h2>Properties</h2>
 *
 * <table>
 *
 *   <tr>
 *     <th> Property </th>
 *     <th> Type </th>
 *     <th> Description </th>
 *   </tr>
 *
 *   <tr>
 *     <td> withdrawCollateral </td>
 *     <td> T </td>
 *     <td> The amount of collateral that's withdrawn. </td>
 *   </tr>
 *
 *   <tr>
 *     <td> repayYUSD? </td>
 *     <td> T </td>
 *     <td> <i>(Optional)</i> The amount of YUSD that's repaid. </td>
 *   </tr>
 *
 * </table>
 *
 * @public
 */
export type TroveClosureParams<T> = _CollateralWithdrawal<T> &
  _NoCollateralDeposit &
  Partial<_YUSDRepayment<T>> &
  _NoYUSDBorrowing;

/**
 * Parameters of an {@link TransactableLiquity.adjustTrove | adjustTrove()} transaction.
 *
 * @remarks
 * The type parameter `T` specifies the allowed value type(s) of the particular
 * `TroveAdjustmentParams` object's properties.
 *
 * Even though all properties are optional, a valid `TroveAdjustmentParams` object must define at
 * least one.
 *
 * Defining both `depositCollateral` and `withdrawCollateral`, or both `borrowYUSD` and `repayYUSD`
 * at the same time is disallowed, and will result in a type-checking error.
 *
 * <h2>Properties</h2>
 *
 * <table>
 *
 *   <tr>
 *     <th> Property </th>
 *     <th> Type </th>
 *     <th> Description </th>
 *   </tr>
 *
 *   <tr>
 *     <td> depositCollateral? </td>
 *     <td> T </td>
 *     <td> <i>(Optional)</i> The amount of collateral that's deposited. </td>
 *   </tr>
 *
 *   <tr>
 *     <td> withdrawCollateral? </td>
 *     <td> T </td>
 *     <td> <i>(Optional)</i> The amount of collateral that's withdrawn. </td>
 *   </tr>
 *
 *   <tr>
 *     <td> borrowYUSD? </td>
 *     <td> T </td>
 *     <td> <i>(Optional)</i> The amount of YUSD that's borrowed. </td>
 *   </tr>
 *
 *   <tr>
 *     <td> repayYUSD? </td>
 *     <td> T </td>
 *     <td> <i>(Optional)</i> The amount of YUSD that's repaid. </td>
 *   </tr>
 *
 * </table>
 *
 * @public
 */
export type TroveAdjustmentParams<T = unknown> =
  | (_CollateralChange<T> & _NoDebtChange)
  | (_DebtChange<T> & _NoCollateralChange)
  | (_CollateralChange<T> & _DebtChange<T>);

/**
 * Describes why a Trove could not be created.
 *
 * @remarks
 * See {@link TroveChange}.
 *
 * <h2>Possible values</h2>
 *
 * <table>
 *
 *   <tr>
 *     <th> Value </th>
 *     <th> Reason </th>
 *   </tr>
 *
 *   <tr>
 *     <td> "missingLiquidationReserve" </td>
 *     <td> A Trove's debt cannot be less than the liquidation reserve. </td>
 *   </tr>
 *
 * </table>
 *
 * More errors may be added in the future.
 *
 * @public
 */
export type TroveCreationError = "missingLiquidationReserve";

/**
 * Represents the change between two Trove states.
 *
 * @remarks
 * Returned by {@link Trove.whatChanged}.
 *
 * Passed as a parameter to {@link Trove.apply}.
 *
 * @public
 */
export type TroveChange<T> =
  | { type: "invalidCreation"; invalidTrove: Trove; error: TroveCreationError }
  | { type: "creation"; params: TroveCreationParams<T> }
  | { type: "closure"; params: TroveClosureParams<T> }
  | { type: "adjustment"; params: TroveAdjustmentParams<T>; setToZero?: "collateral" | "debt" };

// This might seem backwards, but this way we avoid spamming the .d.ts and generated docs
type InvalidTroveCreation = Extract<TroveChange<never>, { type: "invalidCreation" }>;
type TroveCreation<T> = Extract<TroveChange<T>, { type: "creation" }>;
type TroveClosure<T> = Extract<TroveChange<T>, { type: "closure" }>;
type TroveAdjustment<T> = Extract<TroveChange<T>, { type: "adjustment" }>;

const invalidTroveCreation = (
  invalidTrove: Trove,
  error: TroveCreationError
): InvalidTroveCreation => ({
  type: "invalidCreation",
  invalidTrove,
  error
});

const troveCreation = (params: any): any => ({
  type: "creation",
  params
});

const troveCreationLeverUp = (params: any) => ({
  type: "creationLeverUp",
  params
});

const troveClosure = (params: any): any => ({
  type: "closure",
  params
});

const troveClosureLeverUp = (params: any) => ({
  type: "closureUnleverUp",
  params
});

const troveAdjustment = <T>(
  params: TroveAdjustmentParams<T>,
  setToZero?: "collateral" | "debt"
): TroveAdjustment<T> => ({
  type: "adjustment",
  params,
  setToZero
});

const troveAddCollLeverUp = (params: any) => ({
  type: "addCollLeverUp",
  params
});

const troveWithdrawCollUnleverUp = (params: any) => ({
  type: "withdrawCollUnleverUp",
  params
});

const valueIsDefined = <T>(entry: [string, T | undefined]): entry is [string, T] =>
  entry[1] !== undefined;

type AllowedKey<T> = Exclude<
  {
    [P in keyof T]: T[P] extends undefined ? never : P;
  }[keyof T],
  undefined
>;

const allowedTroveCreationKeys = ["decimals", "depositCollaterals", "borrowYUSD"];

const allowedTroveCreationLeverUpKeys = [
  "decimals",
  "depositCollaterals",
  "depositCollateralsLeverages",
  "depositCollateralsMaxSlippages",
  "borrowYUSD"
];

function checkAllowedTroveCreationKeys<T>(
  entries: [string, T][]
): asserts entries is [AllowedKey<TroveCreationParams>, T][] {
  const badKeys = entries
    .filter(([k]) => !(allowedTroveCreationKeys as string[]).includes(k))
    .map(([k]) => `'${k}'`);

  if (badKeys.length > 0) {
    throw new Error(`TroveCreationParams: property ${badKeys.join(", ")} not allowed`);
  }
}
function checkAllowedTroveCreationLeverUpKeys(entries: any) {
  const badKeys = entries
    .filter(([k]: any) => !allowedTroveCreationLeverUpKeys.includes(k))
    .map(([k]: any) => `'${k}'`);
  if (badKeys.length > 0) {
    throw new Error(`TroveCreationLeverUpParams: property ${badKeys.join(", ")} not allowed`);
  }
}

const troveCreationParamsFromEntries = <T>(
  entries: [AllowedKey<TroveCreationParams>, T][]
): TroveCreationParams<T> => {
  const params = Object.fromEntries(entries) as Record<AllowedKey<TroveCreationParams>, T>;
  const missingKeys = allowedTroveCreationKeys.filter(k => !(k in params)).map(k => `'${k}'`);

  if (missingKeys.length > 0) {
    throw new Error(`TroveCreationParams: property ${missingKeys.join(", ")} missing`);
  }

  return params;
};

const troveCreationLeverUpParamsFromEntries = (entries: any) => {
  const params = Object.fromEntries(entries);
  const missingKeys = allowedTroveCreationKeys.filter(k => !(k in params)).map(k => `'${k}'`);
  if (missingKeys.length > 0) {
    throw new Error(`TroveCreationParams: property ${missingKeys.join(", ")} missing`);
  }
  return params;
};

const decimalize = <T>([k, v]: [T, Decimalish]): [T, Decimal] => [k, Decimal.from(v)];
const nonZero = <T>([, v]: [T, Decimal]): boolean => !v.isZero;

/** @internal */
export const _normalizeTroveCreation = (
  params: Record<string, Decimalish | undefined>
): TroveCreationParams<Decimal> => {
  const definedEntries = Object.entries(params).filter(valueIsDefined);
  checkAllowedTroveCreationKeys(definedEntries);

  return troveCreationParamsFromEntries(definedEntries);
};

export const _normalizeTroveLeverUpCreation = (params: any) => {
  const definedEntries = Object.entries(params).filter(valueIsDefined);
  checkAllowedTroveCreationLeverUpKeys(definedEntries);
  // check if we need to check for nonzero entries
  //const nonZeroEntries = definedEntries.map(decimalize);
  return troveCreationLeverUpParamsFromEntries(definedEntries);
};

const allowedTroveAdjustmentKeys: AllowedKey<TroveAdjustmentParams>[] = [
  "depositCollaterals",
  "withdrawCollaterals",
  "borrowYUSD",
  "repayYUSD"
];

const allowedTroveAddCollLeverUpKeys = [
  "depositCollaterals",
  "depositCollateralsLeverages",
  "depositCollateralsMaxSlippages",
  "borrowYUSD"
];
const allowedTroveWithdrawCollUnleverUpKeys = [
  "withdrawCollaterals",
  "withdrawCollateralsMaxSlippages",
  "repayYUSD"
];

function checkAllowedTroveAdjustmentKeys<T>(
  entries: [string, T][]
): asserts entries is [AllowedKey<TroveAdjustmentParams>, T][] {
  const badKeys = entries //@ts-expect-error: TODO
    .filter(([k]) => !allowedTroveAdjustmentKeys.includes(k))
    .map(([k]) => `'${k}'`);
  if (badKeys.length > 0) {
    throw new Error(`TroveAdjustmentParams: property ${badKeys.join(", ")} not allowed`);
  }
}

function checkAllowedTroveAddCollLeverUpKeys(entries: any) {
  const badKeys = entries //@ts-expect-error: TODO
    .filter(([k]) => !allowedTroveAddCollLeverUpKeys.includes(k)) //@ts-expect-error: TODO
    .map(([k]) => `'${k}'`);
  if (badKeys.length > 0) {
    throw new Error(`TroveAddCollLeverUpKParams: property ${badKeys.join(", ")} not allowed`);
  }
}
function checkAllowedTroveWithdrawalCollUnleverUpKeys(entries: any) {
  const badKeys = entries //@ts-expect-error: TODO
    .filter(([k]) => !allowedTroveWithdrawCollUnleverUpKeys.includes(k)) //@ts-expect-error: TODO
    .map(([k]) => `'${k}'`);
  if (badKeys.length > 0) {
    throw new Error(`TroveWithdrawCollUnleverUpParams: property ${badKeys.join(", ")} not allowed`);
  }
}

const collateralChangeFrom = ({ depositCollaterals, withdrawCollaterals }: any): any => {
  if (depositCollaterals !== undefined && withdrawCollaterals !== undefined) {
    return { depositCollaterals, withdrawCollaterals };
  }
  if (depositCollaterals !== undefined) {
    return { depositCollaterals };
  }
  if (withdrawCollaterals !== undefined) {
    return { withdrawCollaterals };
  }
};

const debtChangeFrom = ({ borrowYUSD, repayYUSD }: any): any => {
  if (borrowYUSD !== undefined && repayYUSD !== undefined) {
    throw new Error(
      "TroveAdjustmentParams: 'borrowYUSD' and 'repayYUSD' can't be present at the same time"
    );
  }
  if (borrowYUSD !== undefined) {
    return { borrowYUSD };
  }
  if (repayYUSD !== undefined) {
    return { repayYUSD };
  }
};

const troveAdjustmentParamsFromEntries = <T>(
  entries: [AllowedKey<TroveAdjustmentParams>, T][]
): TroveAdjustmentParams<T> => {
  const params = Object.fromEntries(entries);
  const collateralChange = collateralChangeFrom(params);
  const debtChange = debtChangeFrom(params);
  if (collateralChange !== undefined && debtChange !== undefined) {
    return { ...collateralChange, ...debtChange };
  }
  if (collateralChange !== undefined) {
    return collateralChange;
  }
  if (debtChange !== undefined) {
    return debtChange;
  }
  throw new Error("TroveAdjustmentParams: must include at least one non-zero parameter");
};

/** @internal */
export const _normalizeTroveAdjustment = (params: Record<string, Decimalish | undefined>): any => {
  const definedEntries = Object.entries(params).filter(valueIsDefined);
  checkAllowedTroveAdjustmentKeys(definedEntries);
  //check for non zero entries
  //const nonZeroEntries = definedEntries.map(decimalize).filter(nonZero);
  return troveAdjustmentParamsFromEntries(definedEntries);
};

const collateralLeverUpFrom = ({
  depositCollaterals,
  depositCollateralsLeverages,
  depositCollateralsMaxSlippages
}: any) => {
  if (
    depositCollaterals !== undefined &&
    depositCollateralsLeverages !== undefined &&
    depositCollateralsMaxSlippages !== undefined
  ) {
    return { depositCollaterals, depositCollateralsLeverages, depositCollateralsMaxSlippages };
  }
};
const troveAddCollLeverUpParamsFromEntries = (entries: any) => {
  const params = Object.fromEntries(entries);
  const missingKeys = allowedTroveAddCollLeverUpKeys.filter(k => !(k in params)).map(k => `'${k}'`);
  if (missingKeys.length > 1 && missingKeys[0] != "borrowYUSD") {
    throw new Error(`TroveAddCollLeverupParams: property ${missingKeys.join(", ")} missing`);
  }
  const collateralLeverup = collateralLeverUpFrom(params);
  const { borrowYUSD } = params;
  if (collateralLeverup !== undefined && borrowYUSD !== undefined) {
    return { ...collateralLeverup, borrowYUSD };
  }
  if (collateralLeverup !== undefined) {
    return collateralLeverup;
  }
  throw new Error("TroveAddCollLeverUpParams: must include at least one non-zero parameter");
};
export const _normalizeTroveAddCollLeverUp = (params: any) => {
  const definedEntries = Object.entries(params).filter(valueIsDefined);
  checkAllowedTroveAddCollLeverUpKeys(definedEntries);
  // check if we need to check for nonzero entries
  //const nonZeroEntries = definedEntries.map(decimalize);
  return troveAddCollLeverUpParamsFromEntries(definedEntries);
};

const collateralUnleverUpFrom = ({ withdrawCollaterals, withdrawCollateralsMaxSlippages }: any) => {
  if (withdrawCollaterals !== undefined && withdrawCollateralsMaxSlippages !== undefined) {
    return { withdrawCollaterals, withdrawCollateralsMaxSlippages };
  }
};
// @ts-expect-error: TODO
const troveWithdrawCollUnleverUpParamsFromEntries = entries => {
  const params = Object.fromEntries(entries);
  const missingKeys = allowedTroveWithdrawCollUnleverUpKeys
    .filter(k => !(k in params))
    .map(k => `'${k}'`);
  if (missingKeys.length > 1 && missingKeys[0] != "repayYUSD") {
    throw new Error(`TroveWithdrawCollUnleverupParams: property ${missingKeys.join(", ")} missing`);
  }
  const collateralUnleverup = collateralUnleverUpFrom(params);
  const { repayYUSD } = params;
  if (collateralUnleverup !== undefined && repayYUSD !== undefined) {
    return { ...collateralUnleverup, repayYUSD };
  }
  if (collateralUnleverup !== undefined) {
    return collateralUnleverup;
  }
  throw new Error("TroveAddCollLeverUpParams: must include at least one non-zero parameter");
};
// @ts-expect-error: TODO
export const _normalizeTroveWithdrawCollUnleverUp = params => {
  const definedEntries = Object.entries(params).filter(valueIsDefined);
  checkAllowedTroveWithdrawalCollUnleverUpKeys(definedEntries);
  // check if we need to check for nonzero entries
  //const nonZeroEntries = definedEntries.map(decimalize);
  return troveWithdrawCollUnleverUpParamsFromEntries(definedEntries);
};

const applyFee = (borrowingRate: Decimalish, debtIncrease: Decimal) =>
  Decimal.ONE.add(borrowingRate).mul(debtIncrease);

const unapplyFee = (borrowingRate: Decimalish, debtIncrease: Decimal) =>
  debtIncrease._divCeil(Decimal.ONE.add(borrowingRate));

const NOMINAL_COLLATERAL_RATIO_PRECISION = Decimal.from(100);
function checkNoCollats(x: any) {
  if (Object.keys(x).length == 0) {
    return x;
  }
}

/**
 * A combination of collateral and debt.
 *
 * @public
 */
export class Trove {
  collaterals: any;
  decimals: Decimal;

  /** Amount of YUSD owed. */
  debt: any;

  /** @internal */
  constructor(
    collaterals = {},
    decimals: Decimal = Decimal.ZERO,
    debt: any = { debt: Decimal.ZERO }
  ) {
    this.decimals = decimals;
    this.collaterals = collaterals;
    this.debt = debt;
  }

  get isEmpty() {
    return Object.keys(this.collaterals).length === 0 && this.debt["debt"].isZero;
  }

  /**
   * Amount of YUSD that must be repaid to close this Trove.
   *
   * @remarks
   * This doesn't include the liquidation reserve, which is refunded in case of normal closure.
   */
  get netDebt(): Decimal {
    if (this.debt["debt"].lt(YUSD_LIQUIDATION_RESERVE)) {
      throw new Error(`netDebt should not be used when debt < ${YUSD_LIQUIDATION_RESERVE}`);
    }
    return this.debt["debt"].sub(YUSD_LIQUIDATION_RESERVE);
  }

  /** @internal */
  // get _nominalCollateralRatio(): Decimal {
  //   return this.collateral.mulDiv(NOMINAL_COLLATERAL_RATIO_PRECISION, this.debt);
  // }

  /** Calculate the Trove's collateralization ratio at a given price. */
  collateralRatio(price: any, ratios: any): Decimal {
    let total = Decimal.ZERO;
    //console.log("this.decimals", this.decimals["0x02823f9B469960Bb3b1de0B3746D4b95B7E35543"].toNumber())
    for (const key in this.collaterals) {
      const usdColl = this.collaterals[key]
        .mul(price[key])
        .mul(ratios[key]) //@ts-expect-error: key type
        .div(10 ** this.decimals[key].toNumber());
      total = total.add(usdColl);
    }
    if (total === Decimal.ZERO) {
      return Decimal.ZERO;
    } else {
      return total.mul(10 ** 18).div(this.debt["debt"]);
    }
  }
  /**
   * Whether the Trove is undercollateralized at a given price.
   *
   * @returns
   * `true` if the Trove's collateralization ratio is less than the
   * {@link MINIMUM_COLLATERAL_RATIO}.
   */
  collateralRatioIsBelowMinimum(price: Decimalish, safetyRatios: any): boolean {
    return this.collateralRatio(price, safetyRatios).lt(MINIMUM_COLLATERAL_RATIO);
  }

  /**
   * Whether the collateralization ratio is less than the {@link CRITICAL_COLLATERAL_RATIO} at a
   * given price.
   *
   * @example
   * Can be used to check whether the Liquity protocol is in recovery mode by using it on the return
   * value of {@link ReadableLiquity.getTotal | getTotal()}. For example:
   *
   * ```typescript
   * const total = await liquity.getTotal();
   * const price = await liquity.getPrice();
   *
   * if (total.collateralRatioIsBelowCritical(price)) {
   *   // Recovery mode is active
   * }
   * ```
   */
  collateralRatioIsBelowCritical(price: Decimalish, recoveryRatios: any): boolean {
    return this.collateralRatio(price, recoveryRatios).lt(CRITICAL_COLLATERAL_RATIO);
  }

  /** Whether the Trove is sufficiently collateralized to be opened during recovery mode. */
  isOpenableInRecoveryMode(price: Decimalish, recoveryRatios: any): boolean {
    return this.collateralRatio(price, recoveryRatios).gte(CRITICAL_COLLATERAL_RATIO);
  }

  /** @internal */
  toString(): string {
    return `{ collateral: ${this.collaterals}, debt: ${this.debt} }`;
  }

  // CHECK IF STRINGIFY IS OK (if collats are out of order for this vs that)
  equals(that: any): boolean {
    return JSON.stringify(this.collaterals) == JSON.stringify(that.collaterals);
  }
  partial_eq(that: any): boolean {
    return JSON.stringify(this.collaterals) == JSON.stringify(that.collaterals);
  }

  add(that: any): Trove {
    const tempCollateralAmounts: any = {};
    for (const key in this.collaterals) {
      if (!(key in that.collaterals)) {
        that.collaterals[key] = Decimal.ZERO;
      }
      tempCollateralAmounts[key] = this.collaterals[key].add(that.collaterals[key]);
    }
    return new Trove(tempCollateralAmounts, this.decimals, {
      debt: this.debt["debt"].add(that.debt["debt"])
    });
  }

  addCollateral(collaterals: any): Trove {
    const tempCollateralAmounts: any = {};
    for (const key in this.collaterals) {
      if (!(key in collaterals)) {
        collaterals[key] = Decimal.ZERO;
      }
      tempCollateralAmounts[key] = this.collaterals[key].add(collaterals[key]);
    }
    return new Trove(tempCollateralAmounts, this.decimals, this.debt);
  }

  addDebt(debt: any): Trove {
    return new Trove(this.collaterals, this.decimals, { debt: this.debt["debt"].add(debt["debt"]) });
  }

  subtract(that: Trove): Trove {
    const tempCollateralAmounts: any = {};
    for (const key in this.collaterals) {
      if (!(key in that.collaterals)) {
        that.collaterals[key] = Decimal.ZERO;
      }
      tempCollateralAmounts[key] = this.collaterals[key].sub(that.collaterals[key]);
      if (tempCollateralAmounts[key].lt(Decimal.ZERO)) {
        tempCollateralAmounts[key] = Decimal.ZERO;
      }
    }
    return new Trove(
      tempCollateralAmounts,
      this.decimals,
      this.debt["debt"].gt(that.debt["debt"])
        ? { debt: this.debt["debt"].sub(that.debt["debt"]) }
        : { debt: Decimal.ZERO }
    );
  }

  subtractCollateral(collaterals: any): Trove {
    const tempCollateralAmounts: any = {};
    for (const key in this.collaterals) {
      if (!(key in collaterals)) {
        collaterals[key] = Decimal.ZERO;
      }
      tempCollateralAmounts[key] = this.collaterals[key].sub(collaterals[key]);
      if (tempCollateralAmounts[key].lt(Decimal.ZERO)) {
        tempCollateralAmounts[key] = Decimal.ZERO;
      }
    }
    return new Trove(tempCollateralAmounts, this.decimals, this.debt);
  }

  subtractDebt(debt: any): Trove {
    return new Trove(
      this.collaterals,
      this.decimals,
      this.debt["debt"].gt(debt["debt"])
        ? { debt: this.debt["debt"].sub(debt["debt"]) }
        : { debt: Decimal.ZERO }
    );
  }

  multiply(multiplier: any): Trove {
    const tempCollateralAmounts: any = {};
    // console.log("multiplier", multiplier)
    // console.log("this.collaterals", this.collaterals)
    for (const key in this.collaterals) {
      // console.log("this.collaterals[key]", this.collaterals[key])
      // console.log("multiplier[key]", multiplier[key])
      // console.log("KEY", key)
      tempCollateralAmounts[key] = this.collaterals[key].mul(multiplier[key]);
    }
    return new Trove(tempCollateralAmounts, this.decimals, this.debt);
  }

  // look into this one
  setCollateral(collateral: Decimalish): Trove {
    return new Trove(collateral, this.decimals, this.debt);
  }
  setDebt(debt: Decimalish): Trove {
    return new Trove(this.collaterals, this.decimals, debt);
  }
  _debtChange({ debt }: Trove, borrowingRate: Decimalish): any {
    return debt["debt"].gt(this.debt["debt"])
      ? { borrowYUSD: { debt: unapplyFee(borrowingRate, debt["debt"].sub(this.debt["debt"])) } }
      : { repayYUSD: { debt: this.debt["debt"].sub(debt["debt"]) } };
  }

  _collateralChange({ collaterals }: any): any {
    const depositCollaterals: any = {};
    const withdrawCollaterals: any = {};
    for (const key in collaterals) {
      if (collaterals[key].gt(this.collaterals[key])) {
        depositCollaterals[key] = collaterals[key].sub(this.collaterals[key]);
      } else {
        withdrawCollaterals[key] = this.collaterals[key].sub(collaterals[key]);
      }
    }
    if (
      Object.keys(depositCollaterals).length != 0 &&
      Object.keys(withdrawCollaterals).length != 0
    ) {
      return { depositCollaterals: depositCollaterals, withdrawCollaterals: withdrawCollaterals };
    } else if (Object.keys(depositCollaterals).length != 0) {
      return { depositCollaterals: depositCollaterals };
    } else {
      return { withdrawCollaterals: withdrawCollaterals };
    }
  }

  /**
   * Calculate the difference between this Trove and another.
   *
   * @param that - The other Trove.
   * @param borrowingRate - Borrowing rate to use when calculating a borrowed amount.
   *
   * @returns
   * An object representing the change, or `undefined` if the Troves are equal.
   */
  whatChanged(that: Trove, borrowingRate = MINIMUM_BORROWING_RATE): any {
    let _a;
    if (this.equals(that)) {
      return undefined;
    }
    if (this.isEmpty) {
      if (that.debt["debt"].lt(YUSD_LIQUIDATION_RESERVE)) {
        return invalidTroveCreation(that, "missingLiquidationReserve");
      }
      return troveCreation({
        decimals: that.decimals,
        depositCollaterals: that.collaterals,
        borrowYUSD: { debt: unapplyFee(borrowingRate, that.netDebt) }
      });
    }
    if (that.isEmpty) {
      return troveClosure(
        this.netDebt.nonZero
          ? { withdrawCollaterals: this.collaterals, repayYUSD: { debt: this.netDebt } }
          : { withdrawCollaterals: this.collaterals }
      );
    }
    // figure out that.collateralAmounts.zero
    return this.equals(that)
      ? troveAdjustment(this._debtChange(that, borrowingRate), that.debt["debt"].zero && "debt")
      : this.debt["debt"].eq(that.debt["debt"])
      ? troveAdjustment(
          this._collateralChange(that),
          checkNoCollats(that.collaterals) && "collateral"
        )
      : troveAdjustment(
          {
            ...this._debtChange(that, borrowingRate),
            ...this._collateralChange(that)
          },
          (_a = that.debt.zero && "debt") !== null && _a !== void 0
            ? _a
            : checkNoCollats(that.collaterals) && "collateral"
        );
  }

  /**
   * Make a new Trove by applying a {@link TroveChange} to this Trove.
   *
   * @param change - The change to apply.
   * @param borrowingRate - Borrowing rate to use when adding a borrowed amount to the Trove's debt.
   */
  apply(change: any, borrowingRate = MINIMUM_BORROWING_RATE): any {
    if (!change) {
      return this;
    }
    switch (change.type) {
      case "invalidCreation":
        if (!this.isEmpty) {
          throw new Error("Can't create onto existing Trove");
        }
        return change.invalidTrove;
      case "creation": {
        if (!this.isEmpty) {
          throw new Error("Can't create onto existing Trove");
        }
        const { depositCollaterals, borrowYUSD, decimals } = change.params;
        // console.log("borrowYUSD['debt']", borrowYUSD['debt'])
        // console.log("borrowingRate", borrowingRate)
        return new Trove(depositCollaterals, decimals, {
          debt: YUSD_LIQUIDATION_RESERVE.add(applyFee(borrowingRate, borrowYUSD["debt"]))
        });
      }
      case "creationLeverUp": {
        if (!this.isEmpty) {
          throw new Error("Can't create onto existing Trove");
        }
        const { depositCollaterals, borrowYUSD, decimals } = change.params;
        // console.log("borrowYUSD['debt']", borrowYUSD['debt'])
        // console.log("borrowingRate", borrowingRate)
        return new Trove(depositCollaterals, decimals, {
          debt: YUSD_LIQUIDATION_RESERVE.add(applyFee(borrowingRate, borrowYUSD["debt"]))
        });
      }
      case "closure":
        if (this.isEmpty) {
          throw new Error("Can't close empty Trove");
        }
        return _emptyTrove;
      case "closureUnleverUp":
        if (this.isEmpty) {
          throw new Error("Can't close empty Trove");
        }
        return _emptyTrove;
      case "adjustment": {
        const {
          setToZero,
          params: { depositCollaterals, withdrawCollaterals, borrowYUSD, repayYUSD }
        } = change;
        const collateralDecrease =
          withdrawCollaterals !== null && withdrawCollaterals !== void 0 ? withdrawCollaterals : {};
        const collateralIncrease =
          depositCollaterals !== null && depositCollaterals !== void 0 ? depositCollaterals : {};
        const debtDecrease =
          repayYUSD !== null && repayYUSD !== void 0 ? repayYUSD : { debt: Decimal.ZERO };
        const debtIncrease = {
          debt: borrowYUSD ? applyFee(borrowingRate, borrowYUSD["debt"]) : Decimal.ZERO
        };
        return setToZero === "collateral"
          ? this.setCollateral({}).addDebt(debtIncrease).subtractDebt(debtDecrease)
          : setToZero === "debt"
          ? this.setDebt({ debt: Decimal.ZERO })
              .addCollateral(collateralIncrease)
              .subtractCollateral(collateralDecrease)
          : this.add(new Trove(collateralIncrease, this.decimals, debtIncrease)).subtract(
              new Trove(collateralDecrease, this.decimals, debtDecrease)
            );
      }
      // TODO
      case "addCollLeverUp": {
        const {
          params: {
            depositCollaterals,
            depositCollateralsLeverages,
            depositCollateralsMaxSlippages,
            borrowYUSD
          }
        } = change;
        const collateralLeveragesIncrease =
          depositCollateralsLeverages !== null && depositCollateralsLeverages !== void 0
            ? depositCollateralsLeverages
            : {};
        const collateralIncrease =
          depositCollaterals !== null && depositCollaterals !== void 0 ? depositCollaterals : {};
        const debtIncrease = {
          debt: borrowYUSD ? applyFee(borrowingRate, borrowYUSD["debt"]) : Decimal.ZERO
        };
        return this.add(new Trove(collateralIncrease, this.decimals, debtIncrease));
      }
      //TODO
      case "withdrawCollUnleverUp": {
        const {
          params: { withdrawCollaterals, withdrawCollateralsMaxSlippages, repayYUSD }
        } = change;
        const collateralDecrease =
          withdrawCollaterals !== null && withdrawCollaterals !== void 0 ? withdrawCollaterals : {};
        const debtDecrease =
          repayYUSD !== null && repayYUSD !== void 0 ? repayYUSD : { debt: Decimal.ZERO };
        return this.subtract(new Trove(collateralDecrease, this.decimals, debtDecrease));
      }
    }
  }

  /**
   * Calculate the result of an {@link TransactableLiquity.openTrove | openTrove()} transaction.
   *
   * @param params - Parameters of the transaction.
   * @param borrowingRate - Borrowing rate to use when calculating the Trove's debt.
   */
  static create(params: any, borrowingRate: any): any {
    return _emptyTrove.apply(troveCreation(_normalizeTroveCreation(params)), borrowingRate);
  }
  /**
   * Calculate the parameters of an {@link TransactableLiquity.openTrove | openTrove()} transaction
   * that will result in the given Trove.
   *
   * @param that - The Trove to recreate.
   * @param borrowingRate - Current borrowing rate.
   */
  static recreate(that: any, borrowingRate: any): any {
    const change = _emptyTrove.whatChanged(that, borrowingRate);
    assert((change === null || change === void 0 ? void 0 : change.type) === "creation");
    return change.params;
  }
  /**
   * Calculate the result of an {@link TransactableLiquity.adjustTrove | adjustTrove()} transaction
   * on this Trove.
   *
   * @param params - Parameters of the transaction.
   * @param borrowingRate - Borrowing rate to use when adding to the Trove's debt.
   */
  adjust(params: any, borrowingRate: any): any {
    return this.apply(troveAdjustment(_normalizeTroveAdjustment(params)), borrowingRate);
  }
  /**
   * Calculate the parameters of an {@link TransactableLiquity.adjustTrove | adjustTrove()}
   * transaction that will change this Trove into the given Trove.
   *
   * @param that - The desired result of the transaction.
   * @param borrowingRate - Current borrowing rate.
   */
  adjustTo(that: any, borrowingRate: any): any {
    const change = this.whatChanged(that, borrowingRate);
    assert((change === null || change === void 0 ? void 0 : change.type) === "adjustment");
    return change.params;
  }
}

/** @internal */
export const _emptyTrove = new Trove();

/**
 * Represents whether a UserTrove is open or not, or why it was closed.
 *
 * @public
 */
export type UserTroveStatus =
  | "nonExistent"
  | "open"
  | "closedByOwner"
  | "closedByLiquidation"
  | "closedByRedemption";

/**
 * A Trove that is associated with a single owner.
 *
 * @remarks
 * The SDK uses the base {@link Trove} class as a generic container of collateral and debt, for
 * example to represent the {@link ReadableLiquity.getTotal | total collateral and debt} locked up
 * in the protocol.
 *
 * The `UserTrove` class extends `Trove` with extra information that's only available for Troves
 * that are associated with a single owner (such as the owner's address, or the Trove's status).
 *
 * @public
 */
export class UserTrove extends Trove {
  /** Address that owns this Trove. */
  readonly ownerAddress: string;
  readonly collaterals: any;
  decimals: any;

  /** Provides more information when the UserTrove is empty. */
  readonly status: UserTroveStatus;

  /** @internal */
  constructor(
    ownerAddress: string,
    status: UserTroveStatus,
    collaterals?: any,
    decimals?: any,
    debt?: Decimal
  ) {
    super(collaterals, decimals, debt);

    this.ownerAddress = ownerAddress;
    this.status = status;
  }

  equals(that: UserTrove): boolean {
    return (
      super.equals(that) && this.ownerAddress === that.ownerAddress && this.status === that.status
    );
  }

  partial_eq(that: UserTrove): boolean {
    return JSON.stringify(this.collaterals) == JSON.stringify(that.collaterals);
  }

  /** @internal */
  toString() {
    return (
      `{ ownerAddress: "${this.ownerAddress}"` +
      `, collateral: ${this.collaterals}` +
      `, debt: ${this.debt}` +
      `, status: "${this.status}" }`
    );
  }
}

/**
 * A Trove in its state after the last direct modification.
 *
 * @remarks
 * The Trove may have received collateral and debt shares from liquidations since then.
 * Use {@link TroveWithPendingRedistribution.applyRedistribution | applyRedistribution()} to
 * calculate the Trove's most up-to-date state.
 *
 * @public
 */
export class TroveWithPendingRedistribution extends UserTrove {
  private readonly stake: any;
  private readonly snapshotOfTotalRedistributed: Trove;

  /** @internal */
  // constructor(
  //   ownerAddress: string,
  //   status: UserTroveStatus,
  //   collateral?: Decimal,
  //   debt?: Decimal,
  //   stake = Decimal.ZERO,
  //   snapshotOfTotalRedistributed = _emptyTrove
  // ) {
  //   super(ownerAddress, status, collateral, debt);

  //   this.stake = stake;
  //   this.snapshotOfTotalRedistributed = snapshotOfTotalRedistributed;
  // }
  constructor(
    ownerAddress: string,
    status: UserTroveStatus,
    collaterals?: any,
    decimals?: any,
    debt?: any,
    stake: any = {},
    snapshotOfTotalRedistributed = exports._emptyTrove
  ) {
    super(ownerAddress, status, collaterals, decimals, debt);
    this.stake = stake;
    this.snapshotOfTotalRedistributed = snapshotOfTotalRedistributed;
  }

  applyRedistribution(totalRedistributed: any): UserTrove {
    // console.log('totalRedistributed', totalRedistributed)
    // console.log('snapshotOfTotalRedistributed', this.snapshotOfTotalRedistributed)
    // console.log('stake', this.stake)
    // const afterRedistribution = this.add(
    //   totalRedistributed.subtract(this.snapshotOfTotalRedistributed).multiply(this.stake)
    // );
    // temporary fix
    return new UserTrove(this.ownerAddress, this.status, this.collaterals, this.decimals, this.debt);
    // return new UserTrove(
    //   this.ownerAddress,
    //   this.status,
    //   {'avax': Decimal.ZERO},
    //   {'debt': Decimal.ZERO}
    // );
  }
  equals(that: any): any {
    return (
      super.equals(that) &&
      JSON.stringify(this.stake) == JSON.stringify(that.stake) &&
      this.snapshotOfTotalRedistributed.equals(that.snapshotOfTotalRedistributed)
    );
  }
}
