// @ts-nocheck
import React from "react";
import { Box, Button, Flex, Text, Progress, Spacer, useDisclosure } from "@chakra-ui/react";
import Icon from "../../../components/Icon";
import { ConnectButton } from "../../../components/WalletConnector";
import ConfirmCloseTroveModal from "../ConfirmCloseTroveModal";
import { calculateHealth, calculateHealthColor, calculateHealthStableTrove } from "./Trove.utils";
import { Decimal, LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import tokenData from "../../../TokenData";
import { TroveMappings } from "../../../Types";
import { getNum, format, formatWithDecimals } from "../../../Utils/number";
import { useEffect } from "react";
import { useState } from "react";
import Tooltip from "../../../components/Tooltip";
import { VC_explanation } from "../../../Utils/constants";
import { useLiquity } from "../../../hooks/LiquityContext";

export type TroveProps = {
  disconnected?: boolean;
  borrowMode: "normal" | "lever" | "unlever" | "close";
  setBorrowMode: any;
};
//  TODO: fix type def
const selector = ({
  trove,
  underlyingPrices,
  tokenBalances,
  icr,
  decimals,
  safetyRatios
}: any | LiquityStoreState) => ({
  trove,
  underlyingPrices,
  tokenBalances,
  icr,
  decimals,
  safetyRatios
});

var dataSelector = useLiquitySelector;

const Trove: React.FC<TroveProps> = ({ disconnected = false, borrowMode, setBorrowMode }) => {
  let trove: any,
    underlyingPrices: TroveMappings,
    tokenBalances: TroveMappings,
    icr: Decimal,
    decimals: TroveMappings,
    safetyRatios: TroveMappings;
  let healthRatio, totalBorrowed;
  const { liquity, account } = useLiquity();
  // const [totalBorrowed, setTotalBorrowed] = useState<number>(0)
  // const [healthRatio, setHealthRatio] = useState<number>(0)
  // var vcValue: number = 0;
  const ratioMapping: TroveMappings = {};
  const [ratios, setRatios] = useState<TroveMappings>(ratioMapping);

  useEffect(() => {
    const newMapping: TroveMappings = {};
    const newMappingUnderlyingPer: TroveMappings = {};
    let interval: any = undefined;
    interval = setInterval(async () => {
      for (let i = 0; i < tokenData.length; i++) {
        let ratio: Decimal;
        if (tokenData[i].underlying != "") {
          let scaleReceiptDecimals = 18 - tokenData[i].underlyingDecimals;
          newMapping[tokenData[i].address] = ( // @ts-expect-error
            await liquity.getUnderlyingPerReceipt(tokenData[i].address)
          ).mul(Decimal.from(10).pow(scaleReceiptDecimals));
        } else {
          // console.log("collateral[i].address", collateral[i].address)
          newMapping[tokenData[i].address] = Decimal.ONE;
        }
      }
      // console.log(ratioMapping)
      setRatios(newMapping);
    }, 1500);

    return () => clearInterval(interval);
  }, [trove]);
  var usdValue: number = 0;
  let vcValue: number = 0;
  //let aicr: number = 0
  let stableUSD: number = 0;
  let stableVC: number = 0;
  if (disconnected) {
    trove = null;
    healthRatio = 0;
    totalBorrowed = 0;
    underlyingPrices = {};
    icr = Decimal.ZERO;
    decimals = {};
    safetyRatios = {};
  } else {
    ({ trove, underlyingPrices, tokenBalances, icr, decimals, safetyRatios } = dataSelector(
      selector
    ));
    // setHealthRatio(+trove.collateralRatio(underlyingPrices, false).toString());
    // setTotalBorrowed(+trove.debt["debt"]);
    healthRatio = format(icr) * 100;
    totalBorrowed = +trove.debt["debt"];
    console.log(trove);
    console.log(tokenData);
    tokenData.map(token => {
      console.log(decimals[token.address]);
      token["troveBalance"] = formatWithDecimals(
        trove.collaterals[token.address],
        decimals[token.address].toNumber()
      );
    });
    tokenData.map(
      token =>
        (token["walletBalance"] = formatWithDecimals(
          tokenBalances[token.underlying == "" ? token.address : token.underlying],
          token.underlyingDecimals
        ))
    );

    tokenData.map(token => {
      const result: Decimal =
        token.underlying != "" && ratios[token.address] != undefined
          ? ratios[token.address]
          : Decimal.from(1);
      const curBal: Decimal = trove.collaterals[token.address];
      let vc: number;
      let usd: number;
      const safetyRatio = format(safetyRatios[token.address]);
      const dec = decimals[token.address].toNumber();
      if (curBal != undefined) {
        vc =
          format(underlyingPrices[token.address]) *
          safetyRatio *
          formatWithDecimals(curBal.mul(result), dec);
        // console.log(token.token +'ddd', vc)
        vcValue += vc;
        usd = format(underlyingPrices[token.address]) * formatWithDecimals(curBal.mul(result), dec);
        usdValue += usd;
      } else {
        vc =
          format(underlyingPrices[token.address]) *
          safetyRatio *
          formatWithDecimals(trove.collaterals[token.address], dec);
        vcValue += vc;

        usd =
          format(underlyingPrices[token.address]) *
          formatWithDecimals(trove.collaterals[token.address], dec);
        usdValue += usd;
      }
      if (token.isStable) {
        stableVC += vc;
        stableUSD += usd;
      }
    });
  }
  // console.log('vcValue', vcValue)

  const {
    isOpen: isCloseTroveOpen,
    onOpen: onCloseTroveOpen,
    onClose: onCloseTroveClose
  } = useDisclosure();

  const troveHealth =
    stableVC * 1.1 > totalBorrowed && stableVC / vcValue > 0.99
      ? calculateHealthStableTrove(healthRatio)
      : calculateHealth(healthRatio);
  // console.log("111", troveHealth)
  if (trove && trove.status !== "open") {
    return (
      <Box layerStyle="base" bg="brand.800" flex={1}>
        <Text textStyle="title2">Trove</Text>
        <Text textStyle="title4" mt={2}>
          Open a Trove below to see your Trove stats!
        </Text>
      </Box>
    );
  }

  return (
    <Box layerStyle="card" flex={1}>
      <Text textStyle="title2">Trove</Text>
      <Flex flex={1} direction={["column", null, "row"]}>
        <Flex direction="column" flex={3} mr={[0, null, 5]}>
          <Text textStyle="body1" mb={3}>
            Trove Statistics
          </Text>

          {/* Collateral and total borrowed */}
          <Flex
            backgroundColor="purple.400"
            align="center"
            py={3}
            pl={2}
            pr={4}
            mb={5}
            borderRadius="2xl"
          >
            <Flex align="center">
              <Icon iconName="MoneyStack" w={12} h={5} />
              <Text textStyle="subtitle3" mx={1}>
                Total Collateral <Tooltip>{VC_explanation}</Tooltip>
              </Text>
            </Flex>
            <Spacer />
            <Text textStyle="subtitle2">
              {getNum(vcValue, 2)} RAV (${getNum(usdValue, 2)})
            </Text>
          </Flex>

          {/* Total borrowed */}
          <Flex
            backgroundColor="green.400"
            align="center"
            py={3}
            pl={2}
            pr={4}
            mb={2}
            borderRadius="2xl"
          >
            <Flex align="center">
              <Icon iconName="Bank" w={12} h={5} />
              <Text textStyle="subtitle3" mx={1}>
                Total Borrowed
              </Text>
            </Flex>
            <Spacer />
            <Text textStyle="subtitle2">{getNum(totalBorrowed)} YUSD</Text>
          </Flex>
        </Flex>

        {/* Trove health */}
        <Flex direction="column" flex={2} mt={[6, null, 0]} ml={[0, null, 5]}>
          <Text textStyle="body1" mb={3}>
            Trove Safety Rating: {troveHealth.toFixed(3)}{" "}
            <Tooltip>
              {" "}
              Score from 0 to 100 that helps trove owners to understand how safe from liquidation
              their trove is. Learn more from docs.{" "}
            </Tooltip>
          </Text>

          <Flex direction="column" mb={3}>
            <Flex gap={2} w="100%" align="center" mt={2} mb={7}>
              <Text textStyle="body3" whiteSpace="nowrap">
                0
              </Text>
              <Progress
                value={troveHealth}
                w="100%"
                colorScheme={calculateHealthColor(troveHealth)}
                bg="brand.900"
                borderRadius="infinity"
              />
              <Text textStyle="body3" whiteSpace="nowrap">
                100
              </Text>
            </Flex>

            <Flex gap={4} mb={1}>
              <Text textStyle="subtitle4" fontSize="2xl">
                Collateral Ratio:{" "}
                {trove ? `${parseFloat(icr.mul(100).toString()).toFixed(3)}%` : "N/A"}
              </Text>
            </Flex>
            {/* <Flex gap={4}>
              <Text textStyle="body1">
                Stable Adjusted Collateral Ratio:{" "}
                {trove ? `${aicr.toFixed(2)}% ` : "N/A"}
                <Tooltip>{"Stable Adjusted Collateral Ratio is Collateral Ratio that gives more weights(1.55) to stable coins in your trove. This ratio should give you a sense of how safe your trove is."}</Tooltip>
              </Text>
            </Flex> */}
          </Flex>
        </Flex>

        <Flex direction="column" flex={1} mt={[6, null, 0]} ml={[0, null, 10]}>
          <Text textStyle="body1" mb={3}>
            Trove Options
          </Text>
          {disconnected ? (
            <ConnectButton w="100%" />
          ) : (
            <>
              <Button w="100%" variant="secondary" onClick={onCloseTroveOpen}>
                Close Trove
              </Button>
              <ConfirmCloseTroveModal isOpen={isCloseTroveOpen} onClose={onCloseTroveClose} />
              {/* {borrowMode === "close" ? (
                <Button w="100%" variant="secondary" onClick={() => setBorrowMode("normal")} mt={4}>
                  Adjust Trove
                </Button>
              ) : (
                <Button w="100%" variant="secondary" onClick={() => setBorrowMode("close")} mt={4}>
                  Close Trove Auto-Sell
                </Button>
              )} */}
            </>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

export default Trove;
