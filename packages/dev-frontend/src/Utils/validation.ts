import { Collateral, TroveMappings } from "../Types";
import { format } from "./number";
import { Decimal } from "@liquity/lib-base";
import { tokenDataMappingA } from "../TokenData";

const toastProps = {
  status: "error",
  duration: 4000,
  isClosable: true,
  position: "top-right"
};

export const validateDeposit = (
  toast: any,
  mode: "deposit" | "withdraw",
  balance: number,
  deposit: number,
  valueChange: number,
  successFunction: any
) => {
  // console.log(valueChange);
  if (valueChange === undefined) {
    toast({
      title: "Invalid Deposit",
      description: "Please enter a deposit or withdrawal value.",
      ...toastProps
    });
  } else if (valueChange == 0) {
    toast({
      title: "Invalid Deposit",
      description: "Please enter a value greater than 0.",
      ...toastProps
    });
  } else if (mode === "withdraw" && valueChange > deposit) {
    toast({
      title: "Invalid Deposit",
      description: "You cannot withdraw more than your current deposit.",
      ...toastProps
    });
  } else if (mode === "deposit" && valueChange > balance) {
    toast({
      title: "Invalid Deposit",
      description: "You cannot deposit more than your current balance.",
      ...toastProps
    });
  } else {
    successFunction();
  }
};

export const validateRedeem = (
  toast: any,
  balance: number,
  deposit: number,
  valueChange: number,
  successFunction: any
) => {
  // console.log(valueChange);
  if (valueChange === undefined) {
    toast({
      title: "Invalid Redeem Amount",
      description: "Please enter the amount of YUSD you would like to redeem.",
      ...toastProps
    });
  } else if (valueChange == 0) {
    toast({
      title: "Invalid Redeem Amount",
      description: "Please enter a value greater than 0.",
      ...toastProps
    });
  } else if (valueChange > balance) {
    toast({
      title: "Invalid Redeem Amount",
      description: "You cannot redeem more than your current YUSD balance.",
      ...toastProps
    });
  } else {
    successFunction();
  }
};

export const validateAutoSell = (toast: any, expectYUSD: number) => {
  // console.log(valueChange);
  if (expectYUSD < 11) {
    toast({
      title: "Not enough to preform auto-compound",
      description:
        "In order to preform auto-compound, you need to have at least 1 YUSD worth of claimable collaterals.",
      ...toastProps
    });
    return false;
  }
  return true;
};

const dec = (val: string, scale: any) => {
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

export const getAmountChanges = (
  collateral: Collateral[],
  values: { [key: string]: any },
  decimals: TroveMappings,
  ratios: TroveMappings
) => {
  let tempVCInputs: TroveMappings = {};
  let tempVCOutputs: TroveMappings = {};
  const depositedCollateral = collateral.filter(
    ({ token }) => values[token + "mode"] === "deposit" && values[token]
  );
  const withdrawnCollateral = collateral.filter(
    ({ token }) => values[token + "mode"] === "withdraw" && values[token]
  );
  // console.log('dddd', collateral, values, price);
  depositedCollateral.map(
    ({ address, token }) =>
      (tempVCInputs[address] = Decimal.fromWithPrecision(
        !isNaN(parseFloat(values[token]))
          ? ratios[address] !== undefined
            ? values[token] * format(ratios[address])
            : values[token]
          : 0,
        18 - tokenDataMappingA[address].underlyingDecimals
      ))
  );
  withdrawnCollateral.map(
    ({ address, token }) =>
      (tempVCOutputs[address] = Decimal.fromWithPrecision(
        !isNaN(parseFloat(values[token])) ? values[token] : 0,
        18 - tokenDataMappingA[address].underlyingDecimals
      ))
  );

  return [tempVCInputs, tempVCOutputs];
};
