// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  Box,
  BoxProps,
  Center,
  Text,
  Flex,
  Tr,
  Td,
  Spacer,
  Button,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  VStack,
  SliderMark
} from "@chakra-ui/react";
import Icon from "../../../components/Icon";
import tokenData from "../../../TokenData";
import { adjustValue, getNum, addString, format } from "../../../Utils/number";
import { CoinMode } from "../../../Types";
import { LiquityStoreState, Decimal } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { Collateral } from "../../../Types";

import {
  getFeesCollateral,
  getAffectedCollateral,
  calculateTotalYUSDFromLever
} from "../AdjustTrove/AdjustTrove.utils";
import { useLiquity } from "../../../hooks/LiquityContext";
import Tooltip from "../../../components/Tooltip";
import { VC_explanation } from "../../../Utils/constants";
import { tokenDataMappingA } from "../../../TokenData";
import { AdjustInput, TokenTable } from "../../../components";

type AdjustBorrowAmountProps = {
  values: { [key: string]: any };
  collateral: Collateral[];
  validateFunc: any;
  borrowFee: string;
  borrowMode: "normal" | "lever" | "unlever";
  leverSave: "saved" | "unsaved";
  depositFees: any; //TroveMappings;
  mode: CoinMode;
  setMode: React.Dispatch<React.SetStateAction<CoinMode>>;
  adjustedCollateral: any[]; // AdjustedTokenData[];
  vcValue: number;
} & BoxProps;

// TODO Fix type def any
const selector = ({
  borrowingRate,
  trove,
  yusdBalance,
  underlyingPrices,
  decimals,
  safetyRatios,
  underlyingPerReceiptRatios,
  receiptPerUnderlyingRatios
}: any | LiquityStoreState) => ({
  yusdBalance,
  trove,
  underlyingPrices,
  borrowingRate,
  decimals,
  safetyRatios,
  underlyingPerReceiptRatios,
  receiptPerUnderlyingRatios
});

const AdjustBorrowAmount: React.FC<AdjustBorrowAmountProps> = ({
  values,
  collateral,
  validateFunc,
  borrowFee,
  borrowMode,
  leverSave,
  depositFees,
  adjustedCollateral,
  mode,
  setMode,
  vcValue,
  ...props
}) => {
  const {
    yusdBalance,
    trove,
    underlyingPrices,
    borrowingRate,
    decimals,
    safetyRatios,
    underlyingPerReceiptRatios,
    receiptPerUnderlyingRatios
  } = useLiquitySelector(selector);
  const [changes, setChanges] = useState<boolean>(false);

  const walletBalance = +yusdBalance;
  let troveBalance = +trove.debt["debt"];
  // console.log("111", troveBalance)
  let borrowMessage = "Final amount of borrowed YUSD after adjustments.";
  const [troveBalancePost, setTroveBalancePost] = useState<number>(troveBalance);
  // const calculateMaxDebt = () => {
  //   let tempTroveBalancePost = 0;
  //   if (mode["YUSD"] === "deposit" && values["YUSD"] > 0) {
  //     let YUSDBorrowFee = values["YUSD"] * parseFloat(borrowingRate.toString());
  //     tempTroveBalancePost = tempTroveBalancePost + YUSDBorrowFee;
  //   }
  //   let x = getFeesCollateral(getAffectedCollateral(values), underlyingPrices, depositFees, values);
  //   tempTroveBalancePost = tempTroveBalancePost + x;
  //   // If first time borrow add 200 to this value
  //   if (trove && trove.status !== "open") {
  //     borrowMessage = borrowMessage.concat(
  //       " 200 YUSD is added here for Gas compensation in the case of liquidations. " +
  //         "It will be returned when the trove is closed."
  //     );
  //     tempTroveBalancePost = addString(tempTroveBalancePost, "200");
  //   }
  //   const tempTotalYUSDFromLever = calculateTotalYUSDFromLever(
  //     getAffectedCollateral(values),
  //     underlyingPrices,
  //     values
  //   );
  //   if (tempTotalYUSDFromLever && borrowMode === "lever") {
  //     let YUSDBorrowFee = +String(tempTotalYUSDFromLever) * parseFloat(borrowingRate.toString());
  //     // console.log('YUSDBorrowFee', YUSDBorrowFee)
  //     tempTroveBalancePost = tempTroveBalancePost + YUSDBorrowFee;
  //   }
  //   setTotalYUSDFromLever(tempTotalYUSDFromLever);
  //   if (borrowMode === "lever") {
  //     tempTroveBalancePost = addString(tempTroveBalancePost, tempTotalYUSDFromLever.toString());
  //   } else if (borrowMode === "unlever") {
  //     tempTroveBalancePost = tempTroveBalancePost;
  //     // console.log("tempTroveBalancePost", tempTroveBalancePost)
  //   }
  //   console.log('1', (((vcValue * 100) / 110)))
  //   console.log('2', tempTroveBalancePost)
  //   console.log('3', adjustValue(mode["YUSD"], troveBalance, values["YUSD"]))
  //   console.log('parseFloat(borrowingRate.toString()))', (((vcValue) / 1.1 * (1- parseFloat(borrowingRate.toString())))))

  //   tempTroveBalancePost = ((((vcValue) / 1.1)) - adjustValue(mode["YUSD"], troveBalance, values["YUSD"]) - adjustValue(mode["YUSD"], troveBalance, values["YUSD"]) * parseFloat(borrowingRate.toString()))/(1+parseFloat(borrowingRate.toString()))

  //   console.log('tempTroveBalancePost', tempTroveBalancePost)
  //   // console.log('troveBalancePost', troveBalancePost)
  // };
  const updateTroveBalance = () => {
    let tempTroveBalancePost = adjustValue(mode["YUSD"], troveBalance, values["YUSD"]);
    if (mode["YUSD"] === "deposit" && values["YUSD"] > 0) {
      let YUSDBorrowFee = values["YUSD"] * parseFloat(borrowingRate.toString());
      tempTroveBalancePost = tempTroveBalancePost + YUSDBorrowFee;
    }
    const feesCollateral = getFeesCollateral(
      getAffectedCollateral(values),
      underlyingPrices,
      depositFees,
      values,
      safetyRatios
    );
    // const feesCollateral = getFeesCollateral(getAffectedCollateral(values), prices, depositFees, values, safetyRatios, underlyingPerReceiptRatios);
    tempTroveBalancePost = tempTroveBalancePost + feesCollateral;
    // If first time borrow add 200 to this value
    if (trove && trove.status !== "open") {
      borrowMessage = borrowMessage.concat(
        " 200 YUSD is added here for Gas compensation in the case of liquidations. " +
          "It will be returned when the trove is closed."
      );
      tempTroveBalancePost = addString(tempTroveBalancePost, "200");
    }
    const tempTotalYUSDFromLever = calculateTotalYUSDFromLever(
      adjustedCollateral,
      underlyingPrices,
      values,
      safetyRatios
    );
    if (tempTotalYUSDFromLever && borrowMode === "lever") {
      let YUSDBorrowFee = +String(tempTotalYUSDFromLever) * parseFloat(borrowingRate.toString());
      // console.log('YUSDBorrowFee', YUSDBorrowFee)
      tempTroveBalancePost = tempTroveBalancePost + YUSDBorrowFee;
    }
    setTotalYUSDFromLever(tempTotalYUSDFromLever);
    if (borrowMode === "lever") {
      tempTroveBalancePost = addString(tempTroveBalancePost, tempTotalYUSDFromLever.toString());
    } else if (borrowMode === "unlever") {
      tempTroveBalancePost = tempTroveBalancePost;
      // console.log("tempTroveBalancePost", tempTroveBalancePost)
    }
    setTroveBalancePost(tempTroveBalancePost);
    setSliderValue(tempTroveBalancePost - troveBalancePost);
    // console.log('troveBalancePost', troveBalancePost)
  };

  const [totalYUSDFromLever, setTotalYUSDFromLever] = useState(
    calculateTotalYUSDFromLever(adjustedCollateral, underlyingPrices, values, safetyRatios)
  );
  // update troveBalancePost(fees)
  useEffect(() => {
    // calculateMaxDebt();
    updateTroveBalance();
  }, [values, leverSave]);

  // useEffect(() => {
  //   if (borrowMode !== "unlever") {
  //     coins["YUSD"] = "deposit";
  //   } else {
  //     coins["YUSD"] = "withdraw";
  //   }
  //   setMode(coins);
  // }, [borrowMode]);
  useEffect(() => {
    let changed = false;
    Object.keys(values).map(collateral => {
      if (!collateral.includes("mode") && values[collateral] != 0) {
        setChanges(true);
        changed = true;
      }
    });
    if (!changed) {
      setChanges(false);
    }
  }, [values, leverSave]);

  const getMaxBorrow = () => {
    const maxAmount = vcValue / 1.1 - troveBalancePost; // TODO : Rounding error?
    if (maxAmount < 0) {
      return 0;
    }
    return maxAmount;
  };
  // console.log("VC VALUE:", vcValue);
  // console.log('vcValue', vcValue)
  // console.log('troveBalancePost', troveBalancePost)

  const [sliderValue, setSliderValue] = useState(0);
  // console.log('sliderValue', sliderValue)
  const tableHeaderLeverage =
    borrowMode === "unlever" ? "YUSD From Deleverage" : "New Borrow Amount from Leverage";
  const tableTooltipLeverage =
    borrowMode === "unlever"
      ? "Total YUSD Received in your wallet by auto-selling collateral from your trove. This can be used automatically to repay your debt in the box to the right"
      : "Total YUSD being borrowed from Leverage. For each collateral based on the leverage, a certain amount of YUSD is taken out as debt in total";
  return (
    <>
      <Box {...props}>
        <Text textStyle="title4" px={6} mb={1}>
          Adjust Borrow Amount
        </Text>

        <TokenTable
          headers={
            borrowMode !== "normal"
              ? [
                  "Token",
                  "Wallet Balance",
                  "Borrow Amount",
                  tableHeaderLeverage,
                  "Actions",
                  "New Total Borrow Amount"
                ]
              : ["Token", "Wallet Balance", "Borrow Amount", "Actions", "New Borrow Amount"]
          }
          tooltips={
            borrowMode !== "normal"
              ? [
                  "Name",
                  "Amount of YUSD in wallet",
                  "Amount of YUSD being borrowed",
                  tableTooltipLeverage,
                  "Borrow increases your trove debt. Repay reduces it",
                  borrowMessage
                ]
              : [
                  "Name",
                  "Amount of YUSD in wallet",
                  "Amount of YUSD being borrowed",
                  "Borrow increases your trove debt. Repay reduces it",
                  borrowMessage
                ]
          }
          width={borrowMode !== "normal" ? 6 : 5}
        >
          <Tr>
            <Td pt={3} whiteSpace="nowrap">
              <Flex align="center" w={28}>
                <Icon iconName="YUSD" h={6} w={6} />
                <Text ml={3} whiteSpace="nowrap">
                  YUSD
                </Text>
              </Flex>
            </Td>
            <Td pt={3}>
              <Center bg="brand.500" borderRadius="infinity" px={2.5} py={1}>
                <Text color="white" textStyle="inherit">
                  {getNum(walletBalance)}
                </Text>
              </Center>
            </Td>
            <Td pt={3}>{getNum(troveBalance)}</Td>
            {borrowMode !== "normal" ? (
              <Td pt={3}>{getNum(Number(totalYUSDFromLever.toString()))}</Td>
            ) : (
              <></>
            )}
            <Td pt={3}>
              <Flex direction="column">
                {borrowMode === "unlever" && (
                  <Text textStyle="body2" fontWeight="bold" mb={1}>
                    Balance: {getNum(walletBalance + Number(totalYUSDFromLever.toString()))}
                  </Text>
                )}
                <AdjustInput
                  name="YUSD"
                  iconStatus={mode}
                  setIconStatus={setMode}
                  token="YUSD"
                  max={undefined}
                  // max={mode["YUSD"] === "deposit" ? getMaxBorrow() : troveBalance}
                  min={0}
                  precision={5}
                  inputWidth={12}
                  size="sm"
                  showIcons
                  isYUSDDebt={true}
                  borrowMode={borrowMode}
                />
                {/* <Slider defaultValue={0} min={0} max={(((vcValue * 100) / 110))} step={1} w="275px" onChange={(val) => setSliderValue(val)} mt={4} ml={20}>
                <SliderMark
                  textStyle="subtitle2"
                  value={sliderValue}
                  fontWeight="bold"
                  textAlign='center'
                  color='white'
                  mt='-9'
                  ml='-5'
                  w='12'
                  >
                    
                  </SliderMark>
                  <SliderTrack bg='#4B97FF'>
                    <SliderFilledTrack bg='#227DF7' />
                  </SliderTrack>
                  <SliderThumb boxSize={3}>
                  </SliderThumb>
                </Slider> */}
              </Flex>
            </Td>
            <Td pt={3}>{getNum(troveBalancePost)}</Td>
          </Tr>
        </TokenTable>
        <Flex py={2.5} px={5} mx={6} w="20rem" ml={0}></Flex>

        <Flex mt={4}>
          <Spacer />
          <Flex
            backgroundColor="purple.400"
            align="center"
            justify="center"
            borderRadius="full"
            py={2.5}
            px={5}
            mx={6}
            w="20rem"
          >
            <Text textStyle="subtitle3" textAlign="center">
              {changes && "New"} Risk Adjusted Value:
            </Text>
            <Spacer />
            <Text textStyle="subtitle3" textAlign="center">
              {isNaN(vcValue) ? 0 : getNum(vcValue)} <Tooltip>{VC_explanation}</Tooltip>
            </Text>
          </Flex>
          <Flex
            backgroundColor="green.400"
            align="center"
            justify="center"
            borderRadius="full"
            py={2.5}
            px={5}
            mx={6}
            w="20rem"
            ml={0}
          >
            <Text textStyle="subtitle3">{changes && "New"} Collateral Ratio:</Text>
            <Spacer />
            <Text textStyle="subtitle3">
              {isNaN((vcValue * 100) / troveBalancePost)
                ? 0
                : ((vcValue * 100) / troveBalancePost).toFixed(3)}
              % <Tooltip>Ratio between Trove RAV and YUSD Debt</Tooltip>
            </Text>
          </Flex>
        </Flex>
      </Box>
      <Flex align="center" mt={4} mx={6}>
        <Text textStyle="body2">YUSD Borrow Fee: {borrowFee}%</Text>
        <Spacer />
        <Button
          variant="primary"
          onClick={() =>
            validateFunc(values, ((vcValue * 100) / troveBalancePost).toFixed(3), troveBalancePost)
          }
        >
          Confirm Changes
        </Button>
      </Flex>
    </>
  );
};

export default AdjustBorrowAmount;
