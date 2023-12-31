<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-ethers](./lib-ethers.md) &gt; [PopulatableEthersLiquity](./lib-ethers.populatableethersliquity.md)

## PopulatableEthersLiquity class

<b>Signature:</b>

```typescript
export declare class PopulatableEthersLiquity implements PopulatableLiquity<EthersTransactionReceipt, EthersTransactionResponse, EthersPopulatedTransaction> 
```
<b>Implements:</b> [PopulatableLiquity](./lib-base.populatableliquity.md)<!-- -->&lt;[EthersTransactionReceipt](./lib-ethers.etherstransactionreceipt.md)<!-- -->, [EthersTransactionResponse](./lib-ethers.etherstransactionresponse.md)<!-- -->, [EthersPopulatedTransaction](./lib-ethers.etherspopulatedtransaction.md)<!-- -->&gt;

## Constructors

|  Constructor | Modifiers | Description |
|  --- | --- | --- |
|  [(constructor)(readable)](./lib-ethers.populatableethersliquity._constructor_.md) |  | Constructs a new instance of the <code>PopulatableEthersLiquity</code> class |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [\_extractStabilityPoolGainsWithdrawalDetails(logs)](./lib-ethers.populatableethersliquity._extractstabilitypoolgainswithdrawaldetails.md) |  |  |
|  [\_findHints(trove, ICR)](./lib-ethers.populatableethersliquity._findhints.md) |  |  |
|  [\_findHintsForNominalCollateralRatio(nominalCollateralRatio)](./lib-ethers.populatableethersliquity._findhintsfornominalcollateralratio.md) |  |  |
|  [\_findRedemptionHints(amount)](./lib-ethers.populatableethersliquity._findredemptionhints.md) |  |  |
|  [\_wrapCollateralGainTransfer(rawPopulatedTransaction)](./lib-ethers.populatableethersliquity._wrapcollateralgaintransfer.md) |  |  |
|  [\_wrapLiquidation(rawPopulatedTransaction, decimals)](./lib-ethers.populatableethersliquity._wrapliquidation.md) |  |  |
|  [\_wrapSimpleTransaction(rawPopulatedTransaction)](./lib-ethers.populatableethersliquity._wrapsimpletransaction.md) |  |  |
|  [\_wrapStabilityDepositTopup(change, rawPopulatedTransaction)](./lib-ethers.populatableethersliquity._wrapstabilitydeposittopup.md) |  |  |
|  [\_wrapStabilityDepositWithdrawal(rawPopulatedTransaction)](./lib-ethers.populatableethersliquity._wrapstabilitydepositwithdrawal.md) |  |  |
|  [\_wrapStabilityPoolGainsWithdrawal(rawPopulatedTransaction)](./lib-ethers.populatableethersliquity._wrapstabilitypoolgainswithdrawal.md) |  |  |
|  [\_wrapTroveChangeWithFees(params, rawPopulatedTransaction, gasHeadroom)](./lib-ethers.populatableethersliquity._wraptrovechangewithfees.md) |  |  |
|  [\_wrapTroveClosure(rawPopulatedTransaction)](./lib-ethers.populatableethersliquity._wraptroveclosure.md) |  |  |
|  [\_wrapTroveClosureUnleverUp(rawPopulatedTransaction)](./lib-ethers.populatableethersliquity._wraptroveclosureunleverup.md) |  |  |
|  [addCollLeverUp(params, ICRWithFees, maxBorrowingRateOrOptionalParams, overrides)](./lib-ethers.populatableethersliquity.addcollleverup.md) |  |  |
|  [adjustTrove(params, ICRWithFees, maxBorrowingRateOrOptionalParams, overrides)](./lib-ethers.populatableethersliquity.adjusttrove.md) |  | Adjust existing Trove by changing its collateral, debt, or both. |
|  [approveERC20(tokenAddress, toAddress, amount, overrides)](./lib-ethers.populatableethersliquity.approveerc20.md) |  |  |
|  [borrowYUSD(amount, ICRWithFees, maxBorrowingRate, overrides)](./lib-ethers.populatableethersliquity.borrowyusd.md) |  | Adjust existing Trove by borrowing more YUSD. |
|  [claimCollateralSurplus(overrides)](./lib-ethers.populatableethersliquity.claimcollateralsurplus.md) |  | Claim leftover collateral after a liquidation or redemption. |
|  [claimRewardsSwap(amount, overrides)](./lib-ethers.populatableethersliquity.claimrewardsswap.md) |  | Withdraw YUSD from Stability Deposit. |
|  [closeTrove(overrides)](./lib-ethers.populatableethersliquity.closetrove.md) |  | Close existing Trove by repaying all debt and withdrawing all collateral. |
|  [closeTroveUnleverUp(params, overrides)](./lib-ethers.populatableethersliquity.closetroveunleverup.md) |  |  |
|  [depositCollateral(amount, ICRWithFees, overrides)](./lib-ethers.populatableethersliquity.depositcollateral.md) |  | Adjust existing Trove by depositing more collateral. |
|  [depositYUSDInStabilityPool(amount, overrides)](./lib-ethers.populatableethersliquity.deposityusdinstabilitypool.md) |  | Make a new Stability Deposit, or top up existing one. |
|  [getFarmRewards(overrides)](./lib-ethers.populatableethersliquity.getfarmrewards.md) |  |  |
|  [getMaxRedeemFee(amount)](./lib-ethers.populatableethersliquity.getmaxredeemfee.md) |  |  |
|  [getOldFarmRewards(overrides)](./lib-ethers.populatableethersliquity.getoldfarmrewards.md) |  |  |
|  [getVeYetiStakeReward(overrides)](./lib-ethers.populatableethersliquity.getveyetistakereward.md) |  |  |
|  [liquidate(address, liquidator, overrides)](./lib-ethers.populatableethersliquity.liquidate.md) |  | Liquidate one or more undercollateralized Troves. |
|  [mintERC20(tokenAddress, overrides)](./lib-ethers.populatableethersliquity.minterc20.md) |  |  |
|  [mintERC20NoLimit(tokenAddress, amount, overrides)](./lib-ethers.populatableethersliquity.minterc20nolimit.md) |  |  |
|  [multipleApproveERC20(tokenAddresses, toAddresses, amounts)](./lib-ethers.populatableethersliquity.multipleapproveerc20.md) |  |  |
|  [notifyAllRewarders(overrides)](./lib-ethers.populatableethersliquity.notifyallrewarders.md) |  |  |
|  [openTrove(params, ICRWithFees, maxBorrowingRateOrOptionalParams, overrides)](./lib-ethers.populatableethersliquity.opentrove.md) |  | Open a new Trove by depositing collateral and borrowing YUSD. |
|  [openTroveLeverUp(params, ICRWithFees, troveOpen, maxBorrowingRateOrOptionalParams, overrides)](./lib-ethers.populatableethersliquity.opentroveleverup.md) |  |  |
|  [redeemYUSD(amount, maxRedemptionRate, overrides)](./lib-ethers.populatableethersliquity.redeemyusd.md) |  | Redeem YUSD to native currency (e.g. Ether) at face value. |
|  [repayYUSD(amount, ICRWithFees, overrides)](./lib-ethers.populatableethersliquity.repayyusd.md) |  | Adjust existing Trove by repaying some of its debt. |
|  [sendYETI(toAddress, amount, overrides)](./lib-ethers.populatableethersliquity.sendyeti.md) |  |  |
|  [sendYUSD(toAddress, amount, overrides)](./lib-ethers.populatableethersliquity.sendyusd.md) |  | Send YUSD tokens to an address. |
|  [stakeLPTokens(amount, overrides)](./lib-ethers.populatableethersliquity.stakelptokens.md) |  |  |
|  [stakeLPTokensOldFarm(amount, overrides)](./lib-ethers.populatableethersliquity.stakelptokensoldfarm.md) |  |  |
|  [transferCollateralGainToTrove(overrides)](./lib-ethers.populatableethersliquity.transfercollateralgaintotrove.md) |  | Transfer [collateral gain](./lib-base.stabilitydeposit.collateralgain.md) from Stability Deposit to Trove. |
|  [updateVEYETI(params, overrides)](./lib-ethers.populatableethersliquity.updateveyeti.md) |  |  |
|  [withdrawCollateral(amount, ICRWithFees, overrides)](./lib-ethers.populatableethersliquity.withdrawcollateral.md) |  | Adjust existing Trove by withdrawing some of its collateral. |
|  [withdrawCollUnleverUp(params, ICRWithFees, maxBorrowingRateOrOptionalParams, overrides)](./lib-ethers.populatableethersliquity.withdrawcollunleverup.md) |  |  |
|  [withdrawGainsFromStabilityPool(overrides)](./lib-ethers.populatableethersliquity.withdrawgainsfromstabilitypool.md) |  | Withdraw [collateral gain](./lib-base.stabilitydeposit.collateralgain.md) and  from Stability Deposit. |
|  [withdrawLPTokens(amount, overrides)](./lib-ethers.populatableethersliquity.withdrawlptokens.md) |  |  |
|  [withdrawLPTokensOldFarm(amount, overrides)](./lib-ethers.populatableethersliquity.withdrawlptokensoldfarm.md) |  |  |
|  [withdrawYUSDFromStabilityPool(amount, overrides)](./lib-ethers.populatableethersliquity.withdrawyusdfromstabilitypool.md) |  | Withdraw YUSD from Stability Deposit. |

