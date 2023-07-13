// @ts-nocheck
import { Decimal } from "@liquity/lib-base/dist/src/Decimal";

/**
 * Test whether character is a number or decimal
 */
const IS_NUMBER = new RegExp(/\d/);
const IS_DECIMAL = new RegExp(/\./);
const IS_MINUS = new RegExp(/-/);

export const format = (x: Decimal | number) => {
  if (x) {
    let parsedValue: number = parseFloat(x.toString());
    if (isNaN(parsedValue)) {
      return 0;
    } else {
      return parsedValue;
    }
  }
  return 0;
};

export const formatWithDecimals = (x: Decimal, decimals: number) => {
  if (x) {
    return parseFloat(x.toStringWithDecimals(decimals));
  }
  return 0;
};

export const formatFeeCapped = (x: Decimal | number) => {
  if (x) {
    return Math.min(parseFloat(x.toString()), 0.01);
  }
  return 0;
};

export const formatFeeUncapped = (x: Decimal | number) => {
  if (x) {
    return parseFloat(x.toString());
  }
  return 0;
};

export const limitDecimals = (x: number, precision: number = 5) => {
  return parseFloat(x.toFixed(precision));
};

export const getNum = (n: number, precision: number = 4) => {
  if (n > 999999999999) {
    return (n / 1000000000000).toFixed(precision).toLocaleString() + "T";
  }
  if (n > 999999999) {
    return (n / 1000000000).toFixed(precision).toLocaleString() + "B";
  } else if (n > 999999) {
    return (n / 1000000).toFixed(precision).toLocaleString() + "M";
  } else if (n > 999) {
    return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  } else if (n < 0.0001 && n !== 0) {
    return n.toExponential(5);
  } else {
    return n.toFixed(precision);
  }
};

/**
 * add a string to a number
 */
export const addString = (val: number, string: string): number => {
  if (isNaN(parseFloat(string))) {
    return val;
  }
  return val + parseFloat(string);
};

/**
 * subtract a string from a number
 */
export const subtractString = (val: number, string: string, precision: number = 5): number => {
  if (isNaN(parseFloat(string))) {
    return val;
  }
  return val - parseFloat(string);
};

/**
 * adds or subtracts a string from a number
 */
export const adjustValue = (
  mode: "deposit" | "withdraw",
  initialValue: number,
  valueChange: string
) => {
  if (mode === "deposit") {
    return addString(initialValue, valueChange);
  }
  if (subtractString(initialValue, valueChange) < 0) {
    return 0;
  }
  return subtractString(initialValue, valueChange);
};

/**
 * Calculates Weekly APR given a old and new deposit values
 */
export const newWeeklyAPR = (
  mode: "deposit" | "withdraw",
  initialValue: number,
  valueChange: string,
  apr: number
): number => {
  const newStake = adjustValue(mode, initialValue, valueChange);
  const weeklyRatio = (1 + apr) ** (1 / 52);
  const weeklyRewards = newStake * weeklyRatio - newStake;
  if (weeklyRewards < 0) {
    return 0;
  }
  return weeklyRewards;
};

export const stringToFloat = (string: string): number => {
  if (isNaN(parseFloat(string))) {
    return 0;
  }
  return parseFloat(parseFloat(string).toFixed(4));
};

/**
 * extracts characters that are floats
 */
export const extractFloatChars = (number: string) => {
  let decimalSeen = false;
  let numberSeen = false;
  let minusSeen = false;

  return number
    .split("")
    .filter((char: string) => {
      if (IS_NUMBER.test(char)) {
        numberSeen = true;
        return true;
      }
      if (IS_MINUS.test(char) && !numberSeen && !minusSeen) {
        minusSeen = true;
        return true;
      }
      if (IS_DECIMAL.test(char)) {
        if (decimalSeen) {
          return false;
        } else {
          decimalSeen = true;
          return true;
        }
      }
      return false;
    })
    .join("");
};

export const clamp = (value: number, max?: number, min?: number) => {
  if (min && value < min) {
    return min;
  } else if (max && value > max) {
    return max;
  }
  return value;
};
