// @ts-nocheck
import React, { useReducer } from "react";
import { Text, TextProps } from "@chakra-ui/react";
import { tokenDataMappingT } from "../TokenData";
import { useLiquitySelector } from "@liquity/lib-react";
import { LiquityStoreState } from "@liquity/lib-base";
import { format, getNum } from "../Utils/number";
import { connectionReducer } from "./WalletConnector";

type CurrencyConverterProps = {
  token: string;
  value: number;
  currency: string;
} & TextProps;

// TODO: FIX TYPES for LiquityStoreState to include underlyingPrices, YETIPrice, YUSDPrice, safetyRatios
const selector = ({ underlyingPrices, YETIPrice, YUSDPrice, safetyRatios }: any) => ({
  underlyingPrices,
  YETIPrice,
  YUSDPrice,
  safetyRatios
});

var dataSelector = useLiquitySelector;

const CurrencyConverterLabel: React.FC<CurrencyConverterProps> = ({
  token,
  value,
  currency,
  ...props
}) => {
  const [connectionState, dispatch] = useReducer(connectionReducer, { type: "inactive" });
  let converter = 1;
  const { safetyRatios } = dataSelector(selector);
  const collateral = tokenDataMappingT[token];
  const { underlyingPrices, YETIPrice, YUSDPrice } = dataSelector(selector);
  if (token !== "veYETI") {
    if (token === "YUSD") {
      converter = format(YUSDPrice);
    } else if (token === "YETI") {
      converter = format(YETIPrice);
    } else {
      converter = format(underlyingPrices[collateral.address]);
    }
  }

  if (currency === "USD") {
    return (
      <Text as="span" textStyle="body3" color="brand.300" whiteSpace="nowrap" {...props}>
        {` ≈ ${value !== 0 && value < 0.001 ? "<" : ""} $${
          value !== 0 && value < 0.001 ? "0.001" : getNum(value * converter, 2)
        }`}
      </Text>
    );
  } else if (currency === "VC") {
    return (
      <Text as="span" textStyle="body3" color="brand.300" whiteSpace="nowrap" {...props}>
        {` ≈ ${getNum(value * converter, 2)}`} RAV
      </Text>
    );
  } else if (currency === "RAV") {
    return (
      <Text as="span" textStyle="body3" color="brand.300" whiteSpace="nowrap" {...props}>
        {` ≈ ${getNum(value * converter * format(safetyRatios[collateral.address]), 2)}`} RAV
      </Text>
    );
  } else if (currency === "YUSDEarned") {
    return (
      <Text as="span" textStyle="body3" color="brand.300" whiteSpace="nowrap" {...props}>
        {` ≈ ${getNum((value * converter) / format(YUSDPrice), 2)}`} YUSD
      </Text>
    );
  } else {
    return (
      <Text as="span" textStyle="body3" color="brand.300" whiteSpace="nowrap" {...props}>
        {` ≈ ${getNum(value * converter, 2)}`} YUSD
      </Text>
    );
  }
};

export default CurrencyConverterLabel;
