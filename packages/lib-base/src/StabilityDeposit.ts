import { Decimal, Decimalish } from "./Decimal";

/**
 * Represents the change between two Stability Deposit states.
 *
 * @public
 */
export type StabilityDepositChange<T> =
  | { depositYUSD: T; withdrawYUSD?: undefined }
  | { depositYUSD?: undefined; withdrawYUSD: T; withdrawAllYUSD: boolean };

/**
 * A Stability Deposit and its accrued gains.
 *
 * @public
 */
export class StabilityDeposit {
  /** Amount of YUSD in the Stability Deposit at the time of the last direct modification. */
  readonly initialYUSD: Decimal;

  /** Amount of YUSD left in the Stability Deposit. */
  readonly currentYUSD: Decimal;

  /** Amount of native currency (e.g. Ether) received in exchange for the used-up YUSD. */
  readonly collateralGain: Decimal;

  /** Amount of YETI rewarded since the last modification of the Stability Deposit. */
  readonly yetiReward: Decimal;

  /**
   * Address of frontend through which this Stability Deposit was made.
   *
   * @remarks
   * If the Stability Deposit was made through a frontend that doesn't tag deposits, this will be
   * the zero-address.
   */

  /** @internal */
  constructor(
    initialYUSD: Decimal,
    currentYUSD: Decimal,
    collateralGain: Decimal,
    yetiReward: Decimal
  ) {
    this.initialYUSD = initialYUSD;
    this.currentYUSD = currentYUSD;
    this.collateralGain = collateralGain;
    this.yetiReward = yetiReward;

    if (this.currentYUSD.gt(this.initialYUSD)) {
      throw new Error("currentYUSD can't be greater than initialYUSD");
    }
  }

  get isEmpty(): boolean {
    return (
      this.initialYUSD.isZero &&
      this.currentYUSD.isZero &&
      this.collateralGain.isZero &&
      this.yetiReward.isZero
    );
  }

  /** @internal */
  toString(): string {
    return (
      `{ initialYUSD: ${this.initialYUSD}` +
      `, currentYUSD: ${this.currentYUSD}` +
      `, collateralGain: ${this.collateralGain}` +
      `, yetiReward: ${this.yetiReward}`
    );
  }

  /**
   * Compare to another instance of `StabilityDeposit`.
   */
  equals(that: StabilityDeposit): boolean {
    return (
      this.initialYUSD.eq(that.initialYUSD) &&
      this.currentYUSD.eq(that.currentYUSD) &&
      JSON.stringify(this.collateralGain) == JSON.stringify(that.collateralGain) &&
      this.yetiReward.eq(that.yetiReward)
    );
  }

  /**
   * Calculate the difference between the `currentYUSD` in this Stability Deposit and `thatYUSD`.
   *
   * @returns An object representing the change, or `undefined` if the deposited amounts are equal.
   */
  whatChanged(thatYUSD: Decimalish): StabilityDepositChange<Decimal> | undefined {
    thatYUSD = Decimal.from(thatYUSD);

    if (thatYUSD.lt(this.currentYUSD)) {
      return { withdrawYUSD: this.currentYUSD.sub(thatYUSD), withdrawAllYUSD: thatYUSD.isZero };
    }
    if (thatYUSD.gt(this.currentYUSD)) {
      return { depositYUSD: thatYUSD.sub(this.currentYUSD) };
    }
  }

  /**
   * Apply a {@link StabilityDepositChange} to this Stability Deposit.
   *
   * @returns The new deposited YUSD amount.
   */
  apply(change: any | undefined): Decimal {
    if (!change) {
      return this.currentYUSD;
    }
    if (change.withdrawYUSD !== undefined) {
      return change.withdrawAllYUSD || this.currentYUSD.lte(change.withdrawYUSD)
        ? Decimal.ZERO
        : this.currentYUSD.sub(change.withdrawYUSD);
    } else {
      return this.currentYUSD.add(change.depositYUSD);
    }
  }
}
