// @ts-nocheck
// import { TroveMappings, Decimal } from "@liquity/lib-base";
import { TroveMappings } from "../../../Types";
import { Decimal } from "@liquity/lib-base";
import { TokenData, AdjustedTokenData, Collateral, CoinMode } from "../../../Types";
import tokenData, { tokenDataMappingA } from "../../../TokenData";
import { tokenDataMappingT } from "../../../TokenData";
import {
  addString,
  subtractString,
  format,
  adjustValue,
  formatWithDecimals
} from "../../../Utils/number";
import { useLiquity } from "../../../hooks/LiquityContext";
import { BlockPolledLiquityStore, EthersLiquityWithStore } from "@liquity/lib-ethers";

type formValues = { [key: string]: any };

export const checkCollateral = (
  affectedCollateral: TokenData[],
  values: formValues,
  receiptPerUnderlyingRatios: any // TroveMappings
) => {
  let message = "";
  let description = "";
  let changes = false;
  let collateralCount = 0;
  let collateralApproved = false;

  affectedCollateral.map(collateral => {
    const { token, walletBalance, troveBalance } = collateral;
    const mode = values[token + "mode"];
    const change = parseFloat(values[token]);

    // Make sure some changes have been made
    if (change !== 0) {
      changes = true;
    }
    // console.log(change)
    // console.log(troveBalance * (ratios !== undefined? Number(ratios[collateral.address].toString()) : 1))
    if (
      mode === "withdraw" &&
      change >
        troveBalance /
          format(
            receiptPerUnderlyingRatios[collateral.address].div(
              10 ** (18 - tokenDataMappingT[token].underlyingDecimals)
            )
          )
    ) {
      message = `${token}: Invalid Withdraw`;
      description = "You cannot withdraw more than your current deposit.";
    } else if (mode === "deposit" && change > walletBalance) {
      message = `${token}: Invalid Deposit`;
      description = `You cannot deposit more than your current ${token} balance.`;
    } else {
      collateralCount += 1;
    }
    return token;
  });

  if (collateralCount === affectedCollateral.length) {
    collateralApproved = true;
  }

  return [changes, collateralApproved, message, description];
};

export const checkBorrow = (
  values: formValues,
  totalYUSDFromLever: Decimal,
  debt: Decimal,
  ICR: number
) => {
  let newTotalBorrow =
    values["YUSDmode"] === "deposit"
      ? addString(format(debt), values["YUSD"])
      : subtractString(format(debt), values["YUSD"]);
  // todo check if yusd from lever deposit or withdraw
  newTotalBorrow = newTotalBorrow + Number(totalYUSDFromLever.toString());
  const minBorrow = 1800;
  // TODO: The "Debt" passed in should actually also include the sum of all fees
  // which are going to be paid, on the collateral, and also depending on the amount borrowed the fee for
  // that as well.
  // This is how we do it in the solidity tests:
  // static async getNetBorrowingAmount(contracts, debtWithFee) {
  //   const borrowingRate = await contracts.troveManager.getBorrowingRateWithDecay()

  //   // console.log("Numerator", (this.toBN(debtWithFee).mul(MoneyValues._1e18BN)).toString());
  //   let value = this.toBN(debtWithFee).mul(MoneyValues._1e18BN).div(MoneyValues._1e18BN.add(borrowingRate))
  //   if (value.eq(this.toBN("1791044776119402985074")) ) {
  //     value = this.toBN("1791044776119402985075") // Off by one in min case
  //   }
  //   return value
  // }
  // Realistically it is like 1791.something with the fee of 0.5%.
  let message = "";
  let description = "";
  let borrowApproved = false;
  if (values["YUSDmode"] === "deposit" && newTotalBorrow < minBorrow) {
    message = "YUSD: Invalid Borrow";
    description = `You must borrow at least ${2000} YUSD`;
  } else if (ICR < 110) {
    message = "YUSD: Invalid Borrow";
    description = `Your new total YUSD borrow would make your collateral ratio ${ICR}%, which is below the minimum threshold of 110%.`;
  } else {
    borrowApproved = true;
  }

  return [borrowApproved, message, description];
};

export const getAffectedCollateral = (values: formValues): AdjustedTokenData[] => {
  let tokens: TokenData[] = [];
  Object.keys(values).map(key => {
    if (key.includes("mode") && key.slice(0, -4) != "YUSD") {
      tokens.push(tokenDataMappingT[key.slice(0, -4)]);
    }
  });
  if (tokens.length == 0) {
    return JSON.parse(JSON.stringify(tokenData));
  }

  const tokenDataChanges: AdjustedTokenData[] = JSON.parse(JSON.stringify(tokens));
  tokenDataChanges.map(token => {
    const change = values[token.token] ? parseFloat(String(values[token.token])) : 0;

    token["mode"] =
      values[token.token + "mode"] != undefined ? values[token.token + "mode"] : "deposit";

    const changeWithAdditionalFee: number =
      token.additionalFee !== undefined && token["mode"] === "deposit"
        ? change * (1 - token.additionalFee)
        : change;
    token["change"] = changeWithAdditionalFee;

    token["yusdFromLever"] = values[token.token + "ExpectedYUSD"]
      ? values[token.token + "ExpectedYUSD"]
      : "0";
    token["changeFromLever"] = values[token.token + "PostLeverage"]
      ? values[token.token + "PostLeverage"]
      : "0";
  });
  // console.log('tokenDataChanges', tokenDataChanges)
  return tokenDataChanges;
};
export const getTempAffectedCollateral = (values: formValues): AdjustedTokenData[] => {
  // console.log("utils", values)
  const tokenDataChanges: AdjustedTokenData[] = JSON.parse(JSON.stringify(tokenData));
  tokenDataChanges.map(token => {
    // console.log(values[token.token.concat("tempExpectedYUSD")])
    const change = values[token.token] ? parseFloat(String(values[token.token])) : 0;
    token["mode"] = values[token.token] ? String(values[token.token + "mode"]) : "deposit";
    token["change"] = change;
    token["yusdFromLever"] = values[token.token + "tempExpectedYUSD"]
      ? values[token.token + "tempExpectedYUSD"]
      : "0";
    token["changeFromLever"] = values[token.token + "tempPostLeverage"]
      ? values[token.token + "tempPostLeverage"]
      : "0";
  });
  // console.log("utils", tokenDataChanges)
  return tokenDataChanges;
};
// TODO fix type defs
export const calculateVcValue = (
  borrowMode: "lever" | "unlever" | "normal",
  collaterals: AdjustedTokenData[],
  prices: any, //TroveMappings,
  values: Record<string, any>,
  safetyRatios: any, //TroveMappings,
  receiptPerUnderlyingRatios: any //TroveMappings
) => {
  let totalVirtualCoinValue = 0;
  collaterals.forEach(collateral => {
    const address = collateral.address;
    const mode = values[collateral.token + "mode"];
    totalVirtualCoinValue +=
      getTroveVaultValueWithLever(
        mode,
        collateral,
        values,
        borrowMode,
        receiptPerUnderlyingRatios[address]
      ) * format(prices[address].mul(safetyRatios[address]));
  });
  return totalVirtualCoinValue;
};

// TODO fix type defs
export const calculateAvcValue = (
  borrowMode: "lever" | "unlever" | "normal",
  affectedCollateral: AdjustedTokenData[],
  prices: any, // TroveMappings,
  values: any,
  recoveryRatios: any, //TroveMappings,
  receiptPerUnderlyingRatios: any //TroveMappings
) => {
  let totalVirtualCoinValue = 0;
  affectedCollateral.map(collateral => {
    const address = collateral.address;
    const mode = values[collateral.token + "mode"];
    totalVirtualCoinValue +=
      getTroveVaultValueWithLever(
        mode,
        collateral,
        values,
        borrowMode,
        receiptPerUnderlyingRatios[address]
      ) * format(prices[address].mul(recoveryRatios[address]));
  });
  return totalVirtualCoinValue;
};

// TODO fix type defs
export const calculateTotalYUSDFromLever = (
  affectedCollateral: AdjustedTokenData[],
  underlyingPrices: any, //TroveMappings,
  values: any,
  safetyRatios: any //TroveMappings
): Decimal => {
  let totalYUSDFromLever: Decimal = Decimal.ZERO;
  if (affectedCollateral.length === 0) {
    return totalYUSDFromLever;
  }
  // console.log('affectedCollateral', affectedCollateral)
  if (affectedCollateral[0].mode === "withdraw") {
    // console.log('hit 2')
    affectedCollateral.map(collateral => {
      const { yusdFromLever } = collateral;
      if (yusdFromLever != undefined && +yusdFromLever != 0) {
        collateral["yusdFromLever"] = String(
          Decimal.from(collateral.change).mul(underlyingPrices[collateral.address])
        );
        totalYUSDFromLever = totalYUSDFromLever.add(Decimal.from(collateral["yusdFromLever"]));
      }
      return totalYUSDFromLever;
    });
  } else {
    // console.log('hit 3')
    affectedCollateral.map(collateral => {
      const { yusdFromLever } = collateral;
      // console.log('yusd inside', yusdFromLever)
      if (yusdFromLever != undefined && +yusdFromLever != 0) {
        if (!isNaN(values[collateral.token + "leverage"])) {
          collateral["yusdFromLever"] = String(
            Decimal.from(collateral.change)
              .mul(Decimal.from(values[collateral.token + "leverage"]))
              .mul(underlyingPrices[collateral.address])
              .mul(safetyRatios[collateral.address])
              .div(
                Decimal.from(values[collateral.token + "leverage"]).div(
                  Decimal.from(values[collateral.token + "leverage"]).sub(Decimal.ONE)
                )
              )
          );
        } else if (!isNaN(values[collateral.token.concat("templeverage")])) {
          const tempLeverage = values[collateral.token.concat("templeverage")];
          // console.log("temp", tempLeverage)
          collateral["yusdFromLever"] = String(
            Decimal.from(collateral.change)
              .mul(Decimal.from(tempLeverage))
              .mul(underlyingPrices[collateral.address])
              .mul(safetyRatios[collateral.address])
              .div(Decimal.from(tempLeverage).div(Decimal.from(tempLeverage).sub(Decimal.ONE)))
          );
        }

        totalYUSDFromLever = totalYUSDFromLever.add(Decimal.from(collateral["yusdFromLever"]));
      }
    });
  }
  // console.log('totalYUSDFromLever', totalYUSDFromLever)
  return totalYUSDFromLever;
};

// get trove value of a collateral in underlying
export const getTroveUnderlyingValueWithLever = (
  mode: "deposit" | "withdraw",
  item: AdjustedTokenData | TokenData,
  values: any,
  borrowMode: "lever" | "unlever" | "normal",
  underlyingPerReceiptRatio: Decimal
): number => {
  // when a user is not in leverage mode
  let amountToAdjust: string = "";
  if (borrowMode === "normal" || borrowMode === "unlever") {
    amountToAdjust = values[item.token];
    //TODO needs to account for slippage
  } else if (isNaN(values[item.token + "slippage"])) {
    amountToAdjust = values[item.token];
  } else {
    amountToAdjust = String(+values[item.token] * values[item.token + "leverage"]);
  }
  const additionalFee =
    item.additionalFee !== undefined && mode === "deposit" ? item.additionalFee : 0;
  amountToAdjust = (+amountToAdjust * (1 - additionalFee)).toString();
  return adjustValue(
    mode,
    item.troveBalance * 10 ** (18 - item.underlyingDecimals) * format(underlyingPerReceiptRatio),
    amountToAdjust
  );
};

// get trove value of a collateral in vault
export const getTroveVaultValueWithLever = (
  mode: "deposit" | "withdraw",
  item: AdjustedTokenData | TokenData,
  values: any,
  borrowMode: "lever" | "unlever" | "normal",
  receiptPerUnderlyingRatio: Decimal
): number => {
  // when a user is not in leverage mode
  let amountToAdjust: string = "";
  if (borrowMode === "normal" || borrowMode === "unlever") {
    amountToAdjust = values[item.token];
    //TODO needs to account for slippage
  } else if (isNaN(values[item.token + "slippage"])) {
    amountToAdjust = values[item.token];
  } else {
    amountToAdjust = String(+values[item.token] * values[item.token + "leverage"]);
  }
  const additionalFee =
    item.additionalFee !== undefined && mode === "deposit" ? item.additionalFee : 0;
  amountToAdjust = (+amountToAdjust * (1 - additionalFee)).toString();
  return adjustValue(
    mode,
    item.troveBalance,
    (
      +amountToAdjust * format(receiptPerUnderlyingRatio.div(10 ** (18 - item.underlyingDecimals)))
    ).toString()
  );
};

export const getFeesCollateral = (
  affectedCollateral: AdjustedTokenData[],
  underlyingPrices: TroveMappings,
  depositFees: TroveMappings,
  values: any,
  safetyRatios: TroveMappings
) => {
  let totalFee = 0;
  // console.log('adjusted collat in fees', affectedCollateral)
  affectedCollateral.map(collateral => {
    const { address, change, mode, additionalFee } = collateral;
    if (mode === "withdraw") {
      return 0;
    }
    const additionalFeeRate = additionalFee !== undefined ? additionalFee : 0;
    let changeCheck = !isNaN(values[collateral.token + "leverage"])
      ? change * values[collateral.token + "leverage"]
      : change;

    changeCheck *= 1 - additionalFeeRate;

    const depositFeeRate = depositFees[address] === undefined ? 0 : format(depositFees[address]);

    const vc = changeCheck * format(underlyingPrices[address]) * format(safetyRatios[address]);

    totalFee += vc * depositFeeRate;
  });
  return totalFee;
};

export const dec = (val: string, scale: any) => {
  let zerosCount = 0;

  if (scale == "ether") {
    zerosCount = 18;
  } else if (scale == "finney") zerosCount = 15;
  else {
    zerosCount = scale;
  }

  const strVal = val.toString();
  const strZeros = "0".repeat(zerosCount);

  return strVal.concat(strZeros);
};
