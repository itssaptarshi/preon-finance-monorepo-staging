// @ts-nocheck
import React from "react";
import { Flex, Text, TextProps as ChakraTextProps } from "@chakra-ui/react";
import Icon from "./Icon";
import CurrencyConverter from "./CurrencyConverterLabel";
import { getNum } from "../Utils/number";

export interface CoinAmountProps extends Omit<ChakraTextProps, "css"> {
  icon?: boolean;
  token: string;
  currency?: string;
  safetyRatio?: number;
  amount: number;
  usd?: number;
  textStyle?: string;
  noCurrencyConvert?: boolean;
}

const CoinAmount: React.FC<CoinAmountProps> = ({
  icon = false,
  token,
  currency,
  safetyRatio,
  amount,
  usd,
  textStyle = "body2",
  noCurrencyConvert = false,
  ...textProps
}) => {
  if (!safetyRatio) {
    safetyRatio = 1;
  }
  if (currency) {
    return (
      <Flex>
        {icon && <Icon iconName={token} h={5} w={5} mr={3} />}
        <Text textStyle={textStyle} color="brand.300" textAlign={["right", "left"]} {...textProps}>
          {getNum(Number(amount), 3) + " " + token}
          <CurrencyConverter token={token} value={amount * safetyRatio} currency={currency} />
        </Text>
      </Flex>
    );
  } else {
    return (
      <Flex>
        {icon && <Icon iconName={token} h={5} w={5} mr={3} />}

        <Text textStyle={textStyle} color="brand.300" textAlign={["right", "left"]} {...textProps}>
          {(amount !== 0 && amount < 0.001 ? "< 0.001" : getNum(amount, 3)) + " " + token}
          {!noCurrencyConvert && <CurrencyConverter token={token} value={amount} currency={"USD"} />}
        </Text>
      </Flex>
    );
  }
};
export default CoinAmount;
