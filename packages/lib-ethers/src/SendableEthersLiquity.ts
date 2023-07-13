/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck: Testing
import {
  CollateralGainTransferDetails,
  Decimalish,
  LiquidationDetails,
  LiquityReceipt,
  RedemptionDetails,
  SendableLiquity,
  SentLiquityTransaction,
  StabilityDepositChangeDetails,
  StabilityPoolGainsWithdrawalDetails,
  TroveAdjustmentDetails,
  TroveAdjustmentParams,
  TroveClosureDetails,
  TroveCreationDetails,
  TroveCreationParams
} from "@liquity/lib-base";

import {
  EthersTransactionOverrides,
  EthersTransactionReceipt,
  EthersTransactionResponse
} from "./types";

import {
  BorrowingOperationOptionalParams,
  PopulatableEthersLiquity,
  PopulatedEthersLiquityTransaction,
  SentEthersLiquityTransaction
} from "./PopulatableEthersLiquity";

const sendTransaction = <T>(tx: PopulatedEthersLiquityTransaction<T>) => tx.send();

/**
 * Ethers-based implementation of {@link @liquity/lib-base#SendableLiquity}.
 *
 * @public
 */
export class SendableEthersLiquity
  implements SendableLiquity<EthersTransactionReceipt, EthersTransactionResponse> {
  private _populate: PopulatableEthersLiquity;

  constructor(populatable: PopulatableEthersLiquity) {
    this._populate = populatable;
  }

  async approveToken(tokenAddress: any, toAddress: any, amount: any, overrides: any): Promise<any> {
    return this._populate
      .approveERC20(tokenAddress, toAddress, amount, overrides)
      .then(sendTransaction);
  }
  async multipleApproveERC20(tokenAddresses: any, toAddresses: any, amounts: any): Promise<any> {
    return this._populate.multipleApproveERC20(tokenAddresses, toAddresses, amounts);
  }
  async mintToken(tokenAddress: any, overrides: any): Promise<any> {
    return this._populate.mintERC20(tokenAddress, overrides).then(sendTransaction);
  }
  async mintTokenNoLimit(tokenAddress: any, amount: any, overrides: any): Promise<any> {
    return this._populate.mintERC20NoLimit(tokenAddress, amount, overrides).then(sendTransaction);
  }
  /** {@inheritDoc @liquity/lib-base#SendableLiquity.openTrove} */
  async openTrove(
    params?: any,
    ICRWithFees?: any,
    maxBorrowingRateOrOptionalParams?: any,
    overrides?: any
  ): Promise<any> {
    return this._populate
      .openTrove(params, ICRWithFees, maxBorrowingRateOrOptionalParams, overrides)
      .then(sendTransaction);
  }
  /** {@inheritDoc @liquity/lib-base#SendableLiquity.openTroveLeverUp} */
  async openTroveLeverUp(
    params: any,
    ICRWithFees: any,
    troveOpen: any,
    maxBorrowingRateOrOptionalParams: any,
    overrides: any
  ): Promise<any> {
    return this._populate
      .openTroveLeverUp(params, ICRWithFees, troveOpen, maxBorrowingRateOrOptionalParams, overrides)
      .then(sendTransaction);
  }
  /** {@inheritDoc @liquity/lib-base#SendableLiquity.closeTrove} */
  // @ts-expect-error: Testing
  closeTrove(overrides) {
    return this._populate.closeTrove(overrides).then(sendTransaction);
  }
  /** {@inheritDoc @liquity/lib-base#SendableLiquity.closeTroveUnleverUp} */
  closeTroveUnleverUp(params: any, overrides: any): any {
    return this._populate.closeTroveUnleverUp(params, overrides).then(sendTransaction);
  }
  /** {@inheritDoc @liquity/lib-base#SendableLiquity.adjustTrove} */
  // @ts-expect-error: Testing
  adjustTrove(
    params: any,
    ICRWithFees: any,
    maxBorrowingRateOrOptionalParams: any,
    overrides: any
  ): any {
    return this._populate
      .adjustTrove(params, ICRWithFees, maxBorrowingRateOrOptionalParams, overrides)
      .then(sendTransaction);
  }
  /** {@inheritDoc @liquity/lib-base#SendableLiquity.addCollLeverUp} */
  addCollLeverUp(
    params: any,
    ICRWithFees: any,
    maxBorrowingRateOrOptionalParams: any,
    overrides: any
  ): any {
    return this._populate
      .addCollLeverUp(params, ICRWithFees, maxBorrowingRateOrOptionalParams, overrides)
      .then(sendTransaction);
  }
  /** {@inheritDoc @liquity/lib-base#SendableLiquity.addCollLeverUp} */
  withdrawCollUnleverUp(
    params: any,
    ICRWithFees: any,
    maxBorrowingRateOrOptionalParams: any,
    overrides: any
  ): any {
    return this._populate
      .withdrawCollUnleverUp(params, ICRWithFees, maxBorrowingRateOrOptionalParams, overrides)
      .then(sendTransaction);
  }
  /** {@inheritDoc @liquity/lib-base#SendableLiquity.depositCollateral} */
  // @ts-expect-error: Testing
  depositCollateral(collaterals: any, ICRWithFees: any, overrides: any): any {
    return this._populate
      .depositCollateral(collaterals, ICRWithFees, overrides)
      .then(sendTransaction);
  }
  /** {@inheritDoc @liquity/lib-base#SendableLiquity.withdrawCollateral} */
  // @ts-expect-error: Testing
  withdrawCollateral(collaterals: any, ICRWithFees: any, overrides: any): any {
    return this._populate
      .withdrawCollateral(collaterals, ICRWithFees, overrides)
      .then(sendTransaction);
  }
  /** {@inheritDoc @liquity/lib-base#SendableLiquity.borrowYUSD} */
  // @ts-expect-error: Testing
  borrowYUSD(amount, ICRWithFees, maxBorrowingRate, overrides: any): any {
    return this._populate
      .borrowYUSD(amount, ICRWithFees, maxBorrowingRate, overrides)
      .then(sendTransaction);
  }
  /** {@inheritDoc @liquity/lib-base#SendableLiquity.repayYUSD} */
  // @ts-expect-error: Testing
  repayYUSD(amount: any, ICRWithFees: any, overrides: any): any {
    return this._populate.repayYUSD(amount, ICRWithFees, overrides).then(sendTransaction);
  }
  /** @internal */
  // @ts-expect-error: Testing
  setPrice(price: any, overrides: any): any {
    return this._populate.setPrice(price, overrides).then(sendTransaction);
  }
  /** {@inheritDoc @liquity/lib-base#SendableLiquity.liquidate} */
  // @ts-expect-error: Testing
  liquidate(address: any, liquidator: any, overrides: any): any {
    return this._populate.liquidate(address, liquidator, overrides).then(sendTransaction);
  }
  depositYUSDInStabilityPool(amount: any, overrides: any): any {
    return this._populate.depositYUSDInStabilityPool(amount, overrides).then(sendTransaction);
  }
  /** {@inheritDoc @liquity/lib-base#SendableLiquity.withdrawYUSDFromStabilityPool} */
  // @ts-expect-error: Testing
  withdrawYUSDFromStabilityPool(amount: any, overrides: any): any {
    return this._populate.withdrawYUSDFromStabilityPool(amount, overrides).then(sendTransaction);
  }
  /** {@inheritDoc @liquity/lib-base#SendableLiquity.withdrawGainsFromStabilityPool} */
  // @ts-expect-error: Testing
  withdrawGainsFromStabilityPool(overrides: any): any {
    return this._populate.withdrawGainsFromStabilityPool(overrides).then(sendTransaction);
  }
  claimRewardsSwap(amount: any, overrides: any): any {
    return this._populate.claimRewardsSwap(amount, overrides).then(sendTransaction);
  }
  stakeLPTokens(amount: any, overrides: any): any {
    return this._populate.stakeLPTokens(amount, overrides).then(sendTransaction);
  }
  withdrawLPTokens(amount: any, overrides: any): any {
    return this._populate.withdrawLPTokens(amount, overrides).then(sendTransaction);
  }
  stakeLPTokensOldFarm(amount: any, overrides: any): any {
    return this._populate.stakeLPTokensOldFarm(amount, overrides).then(sendTransaction);
  }
  withdrawLPTokensOldFarm(amount: any, overrides: any): any {
    return this._populate.withdrawLPTokensOldFarm(amount, overrides).then(sendTransaction);
  }
  getVeYetiStakeReward(overrides: any): any {
    return this._populate.getVeYetiStakeReward(overrides).then(sendTransaction);
  }
  getFarmRewards(overrides: any): any {
    return this._populate.getFarmRewards(overrides).then(sendTransaction);
  }
  getOldFarmRewards(overrides: any): any {
    return this._populate.getOldFarmRewards(overrides).then(sendTransaction);
  }
  updateVEYETI(params: any, overrides: any): any {
    return this._populate.updateVEYETI(params, overrides).then(sendTransaction);
  }
  notifyAllRewarders(overrides: any): any {
    return this._populate.notifyAllRewarders(overrides).then(sendTransaction);
  }
  /** {@inheritDoc @liquity/lib-base#SendableLiquity.transferCollateralGainToTrove} */
  // @ts-expect-error: Testing
  transferCollateralGainToTrove(overrides: any): any {
    return this._populate.transferCollateralGainToTrove(overrides).then(sendTransaction);
  }
  /** {@inheritDoc @liquity/lib-base#SendableLiquity.sendYUSD} */
  // @ts-expect-error: Testing
  sendYUSD(toAddress: any, amount: any, overrides: any): any {
    return this._populate.sendYUSD(toAddress, amount, overrides).then(sendTransaction);
  }
  /** {@inheritDoc @liquity/lib-base#SendableLiquity.sendYETI} */
  sendYETI(toAddress: any, amount: any, overrides: any): any {
    return this._populate.sendYETI(toAddress, amount, overrides).then(sendTransaction);
  }
  /** {@inheritDoc @liquity/lib-base#SendableLiquity.redeemYUSD} */
  // @ts-expect-error: Testing
  redeemYUSD(amount: any, maxRedemptionRate, overrides: any): any {
    return this._populate.redeemYUSD(amount, maxRedemptionRate, overrides).then(sendTransaction);
  }
  /** {@inheritDoc @liquity/lib-base#SendableLiquity.claimCollateralSurplus} */
  // @ts-expect-error: Testing
  claimCollateralSurplus(overrides: any): any {
    return this._populate.claimCollateralSurplus(overrides).then(sendTransaction);
  }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.openTrove} */
  // async openTrove(
  //   params: TroveCreationParams<Decimalish>,
  //   maxBorrowingRateOrOptionalParams?: Decimalish | BorrowingOperationOptionalParams,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<TroveCreationDetails>> {
  //   return this._populate
  //     .openTrove(params, maxBorrowingRateOrOptionalParams, overrides)
  //     .then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.closeTrove} */
  // closeTrove(
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<TroveClosureDetails>> {
  //   return this._populate.closeTrove(overrides).then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.adjustTrove} */
  // adjustTrove(
  //   params: TroveAdjustmentParams<Decimalish>,
  //   maxBorrowingRateOrOptionalParams?: Decimalish | BorrowingOperationOptionalParams,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<TroveAdjustmentDetails>> {
  //   return this._populate
  //     .adjustTrove(params, maxBorrowingRateOrOptionalParams, overrides)
  //     .then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.depositCollateral} */
  // depositCollateral(
  //   amount: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<TroveAdjustmentDetails>> {
  //   return this._populate.depositCollateral(amount, overrides).then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.withdrawCollateral} */
  // withdrawCollateral(
  //   amount: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<TroveAdjustmentDetails>> {
  //   return this._populate.withdrawCollateral(amount, overrides).then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.borrowYUSD} */
  // borrowYUSD(
  //   amount: Decimalish,
  //   maxBorrowingRate?: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<TroveAdjustmentDetails>> {
  //   return this._populate.borrowYUSD(amount, maxBorrowingRate, overrides).then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.repayYUSD} */
  // repayYUSD(
  //   amount: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<TroveAdjustmentDetails>> {
  //   return this._populate.repayYUSD(amount, overrides).then(sendTransaction);
  // }

  // /** @internal */
  // setPrice(
  //   price: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<void>> {
  //   return this._populate.setPrice(price, overrides).then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.liquidate} */
  // liquidate(
  //   address: string | string[],
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<LiquidationDetails>> {
  //   return this._populate.liquidate(address, overrides).then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.liquidateUpTo} */
  // liquidateUpTo(
  //   maximumNumberOfTrovesToLiquidate: number,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<LiquidationDetails>> {
  //   return this._populate
  //     .liquidateUpTo(maximumNumberOfTrovesToLiquidate, overrides)
  //     .then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.depositYUSDInStabilityPool} */
  // depositYUSDInStabilityPool(
  //   amount: Decimalish,
  //   frontendTag?: string,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<StabilityDepositChangeDetails>> {
  //   return this._populate
  //     .depositYUSDInStabilityPool(amount, frontendTag, overrides)
  //     .then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.withdrawYUSDFromStabilityPool} */
  // withdrawYUSDFromStabilityPool(
  //   amount: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<StabilityDepositChangeDetails>> {
  //   return this._populate.withdrawYUSDFromStabilityPool(amount, overrides).then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.withdrawGainsFromStabilityPool} */
  // withdrawGainsFromStabilityPool(
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<StabilityPoolGainsWithdrawalDetails>> {
  //   return this._populate.withdrawGainsFromStabilityPool(overrides).then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.transferCollateralGainToTrove} */
  // transferCollateralGainToTrove(
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<CollateralGainTransferDetails>> {
  //   return this._populate.transferCollateralGainToTrove(overrides).then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.sendYUSD} */
  // sendYUSD(
  //   toAddress: string,
  //   amount: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<void>> {
  //   return this._populate.sendYUSD(toAddress, amount, overrides).then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.sendLQTY} */
  // sendLQTY(
  //   toAddress: string,
  //   amount: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<void>> {
  //   return this._populate.sendLQTY(toAddress, amount, overrides).then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.redeemYUSD} */
  // redeemYUSD(
  //   amount: Decimalish,
  //   maxRedemptionRate?: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<RedemptionDetails>> {
  //   return this._populate.redeemYUSD(amount, maxRedemptionRate, overrides).then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.claimCollateralSurplus} */
  // claimCollateralSurplus(
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<void>> {
  //   return this._populate.claimCollateralSurplus(overrides).then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.stakeLQTY} */
  // stakeLQTY(
  //   amount: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<void>> {
  //   return this._populate.stakeLQTY(amount, overrides).then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.unstakeLQTY} */
  // unstakeLQTY(
  //   amount: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<void>> {
  //   return this._populate.unstakeLQTY(amount, overrides).then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.withdrawGainsFromStaking} */
  // withdrawGainsFromStaking(
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<void>> {
  //   return this._populate.withdrawGainsFromStaking(overrides).then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.registerFrontend} */
  // registerFrontend(
  //   kickbackRate: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<void>> {
  //   return this._populate.registerFrontend(kickbackRate, overrides).then(sendTransaction);
  // }

  // /** @internal */
  // _mintUniToken(
  //   amount: Decimalish,
  //   address?: string,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<void>> {
  //   return this._populate._mintUniToken(amount, address, overrides).then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.approveUniTokens} */
  // approveUniTokens(
  //   allowance?: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<void>> {
  //   return this._populate.approveUniTokens(allowance, overrides).then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.stakeUniTokens} */
  // stakeUniTokens(
  //   amount: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<void>> {
  //   return this._populate.stakeUniTokens(amount, overrides).then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.unstakeUniTokens} */
  // unstakeUniTokens(
  //   amount: Decimalish,
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<void>> {
  //   return this._populate.unstakeUniTokens(amount, overrides).then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.withdrawLQTYRewardFromLiquidityMining} */
  // withdrawLQTYRewardFromLiquidityMining(
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<void>> {
  //   return this._populate.withdrawLQTYRewardFromLiquidityMining(overrides).then(sendTransaction);
  // }

  // /** {@inheritDoc @liquity/lib-base#SendableLiquity.exitLiquidityMining} */
  // exitLiquidityMining(
  //   overrides?: EthersTransactionOverrides
  // ): Promise<SentEthersLiquityTransaction<void>> {
  //   return this._populate.exitLiquidityMining(overrides).then(sendTransaction);
  // }
}
