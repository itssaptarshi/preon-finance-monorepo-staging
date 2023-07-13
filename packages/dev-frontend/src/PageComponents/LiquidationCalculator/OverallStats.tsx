// @ts-nocheck
// @ts-nocheck
// @ts-nocheck
import React from "react";
import {
  Flex,
  Tr,
  Td,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  Input,
  Text,
  Box,
  NumberInput,
  NumberInputField
} from "@chakra-ui/react";
import { TokenTable } from "../../components";
import {
  AdjustedCollateral,
  isStableCoin,
  OverallCollateralStats,
  getOverallWeightedValue
} from "./CollateralCalculator";
import { useState } from "react";
import { useEffect } from "react";
import { getNum, format } from "../../Utils/number";
import Tooltip from "../../components/Tooltip";
import { TroveMappings } from "../../../Types";

type Summary = {
  icr: number;
  rsr: number;
  liquidatable: number;
  stable: boolean;
};
type OverallStatsProps = {
  collaterals: AdjustedCollateral[];
  overallTroveStats: OverallCollateralStats;
  setCalculatorState: any;
  debt: number;
  safetyRatios: TroveMappings;
};

const getLiquidatableText = (value: number, stable: boolean) =>
  stable ? (
    <Text>Given the stablecoins' prices remain stable, your trove is not liquidatable.</Text>
  ) : value <= 0 ? (
    <Text>
      Your simulated trove (excluding stablecoins) would have to increase by{" "}
      <Text as="u">{(value * -100).toFixed(3)}%</Text>, or be{" "}
      <Text as="u">{(1 - value).toFixed(3)}x</Text> the RAV, to no longer be liquidatable
    </Text>
  ) : (
    <Text>
      Your simulated trove (excluding stablecoins) would have to decrease by{" "}
      <Text as="u">{(value * 100).toFixed(3)}%</Text>, or be{" "}
      <Text as="u">{(1 - value).toFixed(3)}x</Text> the RAV, to be liquidatable
    </Text>
  );

const OverallStats: React.FC<OverallStatsProps> = ({
  collaterals,
  overallTroveStats,
  setCalculatorState,
  debt,
  safetyRatios
}) => {
  const [currentDebt, setCurrentDebt] = useState<{ debt: number; debtString: string }>({
    debt,
    debtString: debt.toFixed(3)
  });
  const [summary, setSummary] = useState<Summary>({
    icr: (overallTroveStats.weightedCollateralValue / currentDebt.debt) * 100,
    rsr: 0,
    liquidatable: 0,
    stable: false
  });

  const handleOverallPriceChange = (val: number) => {
    const newCollaterals = [...collaterals].map(collateral => {
      if (isStableCoin(collateral)) {
        return {
          ...collateral,
          adjustedPrice: collateral.underlyingPrices,
          adjustedPriceString: collateral.underlyingPrices.toString(),
          weightedCollateralValue:
            collateral.troveBalance *
            collateral.underlyingPrices *
            format(safetyRatios[collateral.address])
        };
      }

      const adjPrice = collateral.underlyingPrices + (collateral.underlyingPrices * val) / 100;
      return {
        ...collateral,
        adjustedPrice: adjPrice,
        adjustedPriceString: adjPrice.toString(),
        weightedCollateralValue:
          collateral.troveBalance * adjPrice * format(safetyRatios[collateral.address])
      };
    });

    const weightedCollateral = getOverallWeightedValue(newCollaterals);

    setCalculatorState({
      adjustedCollaterals: newCollaterals,
      overallStats: {
        ...overallTroveStats,
        adjustedPrice: val,
        weightedCollateralValue: weightedCollateral
      }
    });
  };

  useEffect(() => {
    const weightedCollateralValueExcludingStablecoins =
      overallTroveStats.weightedCollateralValue -
      overallTroveStats.weightedStablecoinCollateralValue;
    const currentDebtExcludingStablecoins =
      currentDebt.debt - overallTroveStats.weightedStablecoinCollateralValue / 1.1;
    let liquidatable =
      1 - (currentDebtExcludingStablecoins * 1.1) / weightedCollateralValueExcludingStablecoins;
    setSummary({
      ...summary,
      icr: (overallTroveStats.weightedCollateralValue / currentDebt.debt) * 100,
      liquidatable: liquidatable,
      stable: overallTroveStats.weightedStablecoinCollateralValue > currentDebt.debt
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDebt, overallTroveStats.weightedCollateralValue]);

  return (
    <>
      <Flex>
        <TokenTable headers={["", "", ""]} width={4}>
          <Tr>
            <Td pt={8} pb={2}>
              <Flex align="center" w={44} color="brand.500">
                Scale non-stable collateral prices
              </Flex>
            </Td>
            <Td pt={8} pb={2}>
              <Flex align="center" w={60}>
                <Slider
                  focusThumbOnChange={false}
                  min={overallTroveStats.minAdjustedPrice}
                  max={overallTroveStats.maxAdjustedPrice}
                  step={overallTroveStats.adjustmentStep}
                  value={overallTroveStats.adjustedPrice}
                  onChange={handleOverallPriceChange}
                >
                  <SliderMark value={-100} mt="1" ml="-2.5" fontSize="x-small">
                    0X
                  </SliderMark>
                  <SliderMark value={0} mt="1" ml="-2.5" fontSize="x-small">
                    1X
                  </SliderMark>
                  <SliderMark value={100} mt="1" ml="-2.5" fontSize="x-small">
                    2X
                  </SliderMark>
                  <SliderMark value={300} mt="1" ml="-2.5" fontSize="x-small">
                    4X
                  </SliderMark>
                  <SliderMark value={500} mt="1" ml="-2.5" fontSize="x-small">
                    6X
                  </SliderMark>
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </Flex>
            </Td>
            <Td pt={8} pb={2}>
              <Flex align="center" w={120} color="brand.500">
                Total Risk Adjusted Value (RAV)
              </Flex>
            </Td>
            <Td pt={8} pb={2} pr={0}>
              <Flex align="center" w={36}>
                $ {getNum(overallTroveStats.weightedCollateralValue)}
              </Flex>
            </Td>
          </Tr>
          <Tr>
            <Td pt={8} pb={2}>
              <Flex align="center" color="brand.500">
                Debt
              </Flex>
            </Td>
            <Td pt={8} pb={2}>
              <Flex align="center" w={60} direction="column">
                <Slider
                  focusThumbOnChange={false}
                  min={2000}
                  max={(overallTroveStats.weightedCollateralValue * 1) / 1.1}
                  step={(overallTroveStats.weightedCollateralValue * 1) / 1.1 / 20}
                  value={currentDebt.debt}
                  onChange={val => {
                    setCurrentDebt({ debt: val, debtString: val.toFixed(3).toString() });
                  }}
                >
                  <SliderMark value={2000} mt="1" ml="-2.5" fontSize="x-small">
                    $2000
                  </SliderMark>
                  <SliderMark
                    value={(overallTroveStats.weightedCollateralValue * 1) / 1.1}
                    mt="1"
                    ml="-2.5"
                    fontSize="x-small"
                  >
                    ${getNum((overallTroveStats.weightedCollateralValue * 1) / 1.1)}
                  </SliderMark>
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
                <Text fontSize="small" mt={6}>
                  {"Max debt ≈ 90.9% of RAV "}
                  {
                    <Tooltip>
                      {"This is the opposite of Min ICR: Max LTV = 90.9% = 1 / 110%"}
                    </Tooltip>
                  }
                </Text>
              </Flex>
            </Td>
            <Td pt={8} pb={2}>
              <Flex align="center" w={120} color="brand.500">
                Total YUSD Debt
              </Flex>
            </Td>
            <Td pt={8} pb={2} pr={0}>
              <Flex align="center" w={36}>
                <NumberInput
                  precision={3}
                  value={currentDebt.debtString}
                  onChange={val => {
                    setCurrentDebt({ debt: parseFloat(val), debtString: val.toString() });
                  }}
                >
                  <NumberInputField />
                </NumberInput>
              </Flex>
            </Td>
          </Tr>
          <Tr>
            <Td pt={8} pb={2}>
              <Flex align="center" w={44} color="brand.500">
                Summary
              </Flex>
            </Td>
            <Td pt={8} pb={2}>
              <Flex align="center" w={80}>
                {getLiquidatableText(summary.liquidatable, summary.stable)}
              </Flex>
            </Td>
            <Td pt={8} pb={2}>
              <Flex direction="column" align="flex-start" w={120}>
                <Box>
                  <Flex align="center" w={120} color="brand.500">
                    Individual Collateral Ratio
                  </Flex>
                </Box>
                {/* <Box pt={5}>
                  <Text fontSize="2xl">RSR</Text>
                </Box> */}
              </Flex>
            </Td>
            <Td pt={8} pb={2} pr={0}>
              <Flex direction="column" align="flex-start" w={120}>
                <Box>
                  <Flex align="center" w={120}>
                    {summary.icr.toFixed(3)}%
                  </Flex>
                </Box>
                {/* <Box pt={5}>
                  <Text fontSize="2xl">{summary.rsr.toFixed(3)}%</Text>
                </Box> */}
              </Flex>
            </Td>
          </Tr>
        </TokenTable>
      </Flex>
    </>
  );
};

export default OverallStats;
