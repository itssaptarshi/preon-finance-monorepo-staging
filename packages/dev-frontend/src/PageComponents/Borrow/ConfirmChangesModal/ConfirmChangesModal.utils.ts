import { tokenDataMappingA } from "../../../TokenData";
import { TroveMappings, Collateral } from "../../../Types";
import { adjustValue, format, formatFeeUncapped, formatWithDecimals } from "../../../Utils/number";
import { Decimal } from "@liquity/lib-base";

type ChangedCollateral = {
  address: string;
  token: string;
  mode: string;
  // total = troveBalance (in vault token amount) +/- change
  total: number;
  // change in vault token amount
  change: number;
  fee: number | undefined;
  feePercentage: number;
  yusdFromLever: number;
  changeWithoutLever: number;
  leverage: number;
  underlying: string;
};

type UnchangedCollateral = {
  address: string;
  // total = troveBalance (in vault token amount) +/- change
  token: string;
  total: number;
  underlying: string;
};

export const sumArrVc = (
  arr: ChangedCollateral[],
  term: "change" | "total",
  prices: TroveMappings,
  safetyRatios: TroveMappings,
  ratios: TroveMappings
) => {
  return arr
    .map(collateral =>
      formatWithDecimals(
        Decimal.from(collateral[term])
          .mul(ratios[collateral.address])
          .mul(prices[collateral.address])
          .mul(safetyRatios[collateral.address]),
        18 + (18 - tokenDataMappingA[collateral.address].underlyingDecimals)
      )
    )
    .reduce((a, b) => a + b, 0);
};

export const sumUnchangedVc = (
  arr: UnchangedCollateral[],
  price: TroveMappings,
  safetyRatios: TroveMappings,
  ratios?: TroveMappings
) => {
  return arr
    .map(
      collateral =>
        collateral.total *
        (ratios != undefined && ratios[collateral.address] != undefined
          ? format(ratios[collateral.address])
          : 1) *
        format(price[collateral.address]) *
        format(safetyRatios[collateral.address])
    )
    .reduce((a, b) => a + b, 0);
};

export const sumArrAVc = (
  arr: ChangedCollateral[],
  term: "change" | "total",
  price: TroveMappings,
  recoveryRatios: TroveMappings,
  ratios?: TroveMappings
) => {
  return arr
    .map(
      collateral =>
        collateral[term] *
        format(price[collateral.address]) *
        format(recoveryRatios[collateral.address])
    )
    .reduce((a, b) => a + b, 0);
};

export const sumUnchangedAVc = (
  arr: UnchangedCollateral[],
  price: TroveMappings,
  recoveryRatios: TroveMappings,
  ratios?: TroveMappings
) => {
  return arr
    .map(
      collateral =>
        collateral.total *
        (collateral.underlying != "" &&
        ratios != undefined &&
        ratios[collateral.address] != undefined
          ? Number(ratios[collateral.address].toString())
          : 1) *
        format(price[collateral.address]) *
        format(recoveryRatios[collateral.address])
    )
    .reduce((a, b) => a + b, 0);
};

export const getChangedCollateral = (
  collateral: Collateral[],
  values: { [key: string]: any },
  fees: TroveMappings,
  underlyingPerReceiptRatio: TroveMappings
): ChangedCollateral[] => {
  const changedCollateral = collateral.filter(
    ({ token }) => values[token] && parseFloat(values[token]) !== 0
  );

  const changedCollateralData = changedCollateral.map(
    ({ address, token, troveBalance, underlying, underlyingDecimals, additionalFee }) => {
      let changeWithoutLever = values[token];
      if (additionalFee != undefined) {
        changeWithoutLever = changeWithoutLever * (1 - additionalFee);
      }
      const mode = values[token + "mode"];

      let fee = undefined;

      const yusdFromLever = Number(
        values[token + "ExpectedLUSD"] ? values[token + "ExpectedLUSD"] : "0"
      );
      const changeFromLever = Number(
        values[token + "PostLeverage"] ? values[token + "PostLeverage"] : "0"
      );
      const leverage = Number(values[token + "leverage"] ? values[token + "leverage"] : "0");

      const change = leverage != 0 ? changeWithoutLever * leverage : changeWithoutLever;
      if (mode === "deposit") {
        fee = formatFeeUncapped(change * formatFeeUncapped(fees[address]));
      }

      const total = adjustValue(
        mode,
        troveBalance * 10 ** (18 - underlyingDecimals) * format(underlyingPerReceiptRatio[address]),
        change
      );

      return {
        address: address,
        token: token,
        mode: mode,
        total: total,
        change: change,
        fee: fee,
        feePercentage: formatFeeUncapped(fees[address]),
        yusdFromLever: yusdFromLever,
        changeWithoutLever: changeWithoutLever,
        leverage: leverage,
        underlying: underlying
      };
    }
  );

  return changedCollateralData;
};

export const calculateTotalLUSDFromLever = (changedCollateral: ChangedCollateral[]) => {
  let totalLUSDFromLever = 0;
  changedCollateral.map(collateral => {
    const { yusdFromLever } = collateral;
    if (yusdFromLever) {
      totalLUSDFromLever = totalLUSDFromLever + yusdFromLever;
    }
  });
  return totalLUSDFromLever;
};

export const getUnchangedCollateral = (
  whitelistedCollateral: Collateral[],
  values: { [key: string]: any }
): UnchangedCollateral[] => {
  const unchangedCollateral = whitelistedCollateral.filter(
    collateral =>
      collateral.troveBalance > 0 && (!values[collateral.token] || values[collateral.token] == 0)
  );

  const unchangedCollateralData = unchangedCollateral.map(
    ({ address, token, troveBalance, underlying }) => ({
      address: address,
      token: token,
      total: troveBalance,
      underlying: underlying
    })
  );

  return unchangedCollateralData;
};
