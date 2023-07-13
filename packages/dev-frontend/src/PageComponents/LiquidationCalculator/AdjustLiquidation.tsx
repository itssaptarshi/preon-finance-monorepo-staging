// @ts-nocheck
// @ts-nocheck
import { Box } from "@chakra-ui/react";
import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import React from "react";
import tokenData from "../../TokenData";
import { format, formatWithDecimals } from "../../Utils/number";
import CollateralCalculator from "./CollateralCalculator";

const selector = ({
  trove,
  underlyingPrices,
  tokenBalances,
  borrowingRate,
  decimals
}: LiquityStoreState) => ({
  borrowingRate,
  trove,
  underlyingPrices,
  tokenBalances,
  decimals
});

const AdjustLiquidation: React.FC = () => {
  const { trove, tokenBalances, decimals } = useLiquitySelector(selector);

  // Shape collateral
  tokenData.map(
    token =>
      (token["troveBalance"] = formatWithDecimals(
        trove.collaterals[token.address],
        decimals[token.address].toNumber()
      ))
  );
  tokenData.map(
    token =>
      (token["walletBalance"] = formatWithDecimals(
        tokenBalances[token.underlying == "" ? token.address : token.underlying],
        token.underlyingDecimals
      ))
  );
  return (
    <Box layerStyle="card" flex={1} px={2}>
      <CollateralCalculator collateral={tokenData} />
    </Box>
  );
};

export default AdjustLiquidation;
