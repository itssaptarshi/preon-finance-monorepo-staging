// @ts-nocheck
// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalCloseButton
} from "@chakra-ui/modal";
import {
  HStack,
  Flex,
  Text,
  Button,
  NumberInput,
  NumberInputField,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb
} from "@chakra-ui/react";
import { Icon, AdjustInput, Slippages } from "../../components";
import { adjustValue, format, getNum, addString } from "../../Utils/number";
import tokenData from "../../TokenData";
import { Decimal, LiquityStoreState, Trove, TroveMappings } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { Collateral } from "../../../Types";
import { Form } from "react-final-form";
import {
  calculateVcValue,
  getTempAffectedCollateral,
  calculateTotalYUSDFromLever
} from "./AdjustTrove/AdjustTrove.utils";
import { CoinMode } from "../../../Types";
import { useLiquity } from "../../hooks/LiquityContext";

export type LeverUpModalProps = {
  isOpen: boolean;
  onClose: () => void;
  collateral: Collateral;
  setLeverSave: React.Dispatch<React.SetStateAction<"saved" | "unsaved">>;
  type: "unlever" | "lever" | "normal";
  values: { [key: string]: any };
  //vcInput: TroveMappings;
  depositFees: TroveMappings;
};

const selector = ({
  trove,
  underlyingPrices,
  tokenBalances,
  borrowingRate,
  safetyRatios,
  decimals,
  underlyingPerReceiptRatios,
  receiptPerUnderlyingRatios
}: LiquityStoreState) => ({
  borrowingRate,
  trove,
  underlyingPrices,
  tokenBalances,
  safetyRatios,
  decimals,
  underlyingPerReceiptRatios,
  receiptPerUnderlyingRatios
});

const LeverUpModal: React.FC<LeverUpModalProps> = ({
  isOpen,
  onClose,
  collateral,
  type,
  values,
  setLeverSave,
  //vcInput,
  depositFees
}) => {
  const { liquity } = useLiquity();
  const {
    trove,
    underlyingPrices,
    tokenBalances,
    borrowingRate,
    safetyRatios,
    decimals,
    underlyingPerReceiptRatios,
    receiptPerUnderlyingRatios
  } = useLiquitySelector(selector);
  const [adjustedCollateral, setAdjustedCollateral] = useState(getTempAffectedCollateral(values));
  const [totalYUSDFromLever, setTotalYUSDFromLever] = useState(
    calculateTotalYUSDFromLever(adjustedCollateral, underlyingPrices, values, safetyRatios)
  );

  let troveBalance = +trove.debt["debt"];
  const currToken = tokenData.filter(item => item.token === collateral.token);

  const tokenB: Decimal = trove.collaterals[collateral.address];

  const currAddress = currToken[0]
    ? currToken[0].address
    : "0x0000000000000000000000000000000000000000";
  const [troveBalancePost, setTroveBalancePost] = useState<number>(
    troveBalance + +(values["YUSD"] === undefined ? String(0) : values["YUSD"])
  );

  // const [fees, setFee] = useState<TroveMappings>(depositFees);
  // const getFees = () => {
  //   let tempVCInputs: TroveMappings = {};
  //   let tempVCOutputs: TroveMappings = {};
  //   const tokenLeverage = collateral.token.concat('PostLeverage')
  //   // Make a deep copy of vcInput and change the current collateral amount to post leverage

  //   if (values[tokenLeverage] != null) {
  //     if (values[tokenLeverage] !== 0) {
  //       tempVCInputs[collateral.address] = Decimal.fromWithPrecision(
  //         isNaN(values[tokenLeverage]) || values[tokenLeverage] < 0
  //           ? 0
  //           : values[tokenLeverage], collateral.decimals
  //       );
  //     }
  //   } else {
  //     // To show the fee even for assets which have no adjust
  //     tempVCInputs[collateral.address] = Decimal.fromWithPrecision(1, collateral.decimals);
  //   }
  //   for (var i = 0; i < Object.keys(vcInput).length; i++) {
  //     const key =  Object.keys(vcInput)[i]
  //     if (key !== collateral.address) {
  //       tempVCInputs[key] = vcInput[key]
  //     }
  //   }

  //   liquity.getDepositFee(tempVCInputs, tempVCOutputs).then(fees => {
  //     setFee(fees);
  //   });
  // }

  useEffect(() => {
    if (collateral.token !== undefined) {
      // console.log("values from useeffect", values)
      setAdjustedCollateral(getTempAffectedCollateral(values));
      //onsole.log("adjustedCollateraluseeffect", adjustedCollateral)
      // getFees();
      updateTroveBalance();
    }
  }, [values]);

  const updateTroveBalance = () => {
    // console.log("tempTroveBalancePost",troveBalance)
    let tempTroveBalancePost: number = troveBalance + (values["YUSD"] ? +values["YUSD"] : 0);
    // console.log("tempTroveBalancePost",tempTroveBalancePost)
    if (values["YUSD"] > 0) {
      let YUSDBorrowFee = values["YUSD"] * parseFloat(borrowingRate.toString());
      tempTroveBalancePost = tempTroveBalancePost + YUSDBorrowFee;
    }
    // tempTroveBalancePost = tempTroveBalancePost + parseFloat(fees[collateral.address].toString());

    // If first time borrow add 200 to this value
    let tempTotalYUSDFromLever = calculateTotalYUSDFromLever(
      adjustedCollateral,
      underlyingPrices,
      values,
      safetyRatios
    );
    tempTotalYUSDFromLever = tempTotalYUSDFromLever.add(
      Decimal.from(
        values[collateral.token.concat("tempExpectedYUSD")]
          ? values[collateral.token.concat("tempExpectedYUSD")]
          : 0
      )
    );
    // console.log("tempTotalYUSDFromLever", tempTotalYUSDFromLever.toString())
    setTotalYUSDFromLever(tempTotalYUSDFromLever);

    tempTroveBalancePost = addString(tempTroveBalancePost, tempTotalYUSDFromLever.toString());

    setTroveBalancePost(tempTroveBalancePost);
  };

  const calcLiquidationPrice = () => {
    const vcValue = calculateVcValue(
      "lever",
      adjustedCollateral,
      underlyingPrices,
      values,
      safetyRatios,
      receiptPerUnderlyingRatios
    );
    // console.log("calc", adjustedCollateral)
    // console.log("vcValue", vcValue)
    // console.log("troveBalancePost..", troveBalancePost)
    const icr = +(vcValue / troveBalancePost).toFixed(3);

    const liquidationPrice = (1.1 / icr) * Number(underlyingPrices[currAddress].toString());
    return liquidationPrice.toFixed(3);
  };

  const onSubmit = () => {
    if (
      values[collateral.token + "templeverage"] != undefined ||
      values[collateral.token + "templeverage"] == ""
    ) {
      values[collateral.token + "leverage"] = values[collateral.token + "templeverage"];
      values[collateral.token + "templeverage"] = "-1";
    }

    if (
      values[collateral.token + "tempAmount"] != undefined ||
      values[collateral.token + "tempAmount"] == ""
    ) {
      values[collateral.token] = values[collateral.token + "tempAmount"];
      delete values[collateral.token + "tempAmount"];
      // svalues[collateral.token+"tempAmount"] = "-1"
    }

    if (values[collateral.token + "tempExpectedYUSD"] != undefined) {
      values[collateral.token + "ExpectedYUSD"] = values[collateral.token + "tempExpectedYUSD"];
      delete values[collateral.token + "tempExpectedYUSD"];
    }

    if (values[collateral.token + "tempPostLeverage"] != undefined) {
      values[collateral.token + "PostLeverage"] = values[collateral.token + "tempPostLeverage"];
      delete values[collateral.token + "tempPostLeverage"];
    }

    if (values[collateral.token + "tempNewTotal"] != undefined) {
      values[collateral.token + "NewTotal"] = values[collateral.token + "tempNewTotal"];
      delete values[collateral.token + "tempNewTotal"];
    }

    if (values[collateral.token + "tempSlippage"] != undefined) {
      // console.log('valuessss', values[collateral.token + "tempSlippage"])
      values[collateral.token + "slippage"] = values[collateral.token + "tempSlippage"] / 100;
      delete values[collateral.token + "tempSlippage"];
    }

    setLeverSave("saved");

    // values[collateral.token + "tempExpectedYUSD"] = expectedYUSD
    // values[collateral.token + "tempPostLeverage"] = amountToLeverage > 0 ? amountToLeverage : "0"
    // values[collateral.token + "tempNewTotal"] = amountToLeverage > 0 ? (Number(tokenBalance) + Number(amountToLeverage)) : tokenBalance

    // if (values[])

    onClose();
  };

  const cancel = () => {
    if (values[collateral.token + "templeverage"] != undefined) {
      delete values[collateral.token + "templeverage"];
    }

    if (values[collateral.token + "tempAmount"] != undefined) {
      delete values[collateral.token + "tempAmount"];
    }

    if (values[collateral.token + "tempExpectedYUSD"] != undefined) {
      delete values[collateral.token + "tempExpectedYUSD"];
    }

    if (values[collateral.token + "tempPostLeverage"] != undefined) {
      delete values[collateral.token + "tempPostLeverage"];
    }

    if (values[collateral.token + "tempNewTotal"] != undefined) {
      delete values[collateral.token + "tempNewTotal"];
    }

    if (values[collateral.token + "tempSlippage"] != undefined) {
      delete values[collateral.token + "tempSlippage"];
    }

    onClose();
  };

  const testAmount = Number(values[collateral.token]);

  function Unlever() {
    let currPrice = Number(underlyingPrices[currAddress].toString());
    let amountToLeverage: Decimal =
      values[collateral.token + "tempAmount"] === undefined
        ? Decimal.ZERO
        : Decimal.from(values[collateral.token + "tempAmount"]!); // todo
    let tokenBalance: Decimal = tokenBalances[currAddress];
    let troveBalance: number = collateral.troveBalance;

    if (amountToLeverage!.gt(Decimal.ZERO)) {
      values[collateral.token + "tempExpectedYUSD"] = Number(amountToLeverage) * currPrice;
    } else {
      values[collateral.token + "tempExpectedYUSD"] = 0;
    }
    if (
      amountToLeverage.gt(Decimal.ZERO) &&
      Decimal.from(troveBalance.toString()).gte(amountToLeverage)
    ) {
      values[collateral.token + "tempNewTotal"] = Decimal.from(troveBalance.toString())
        .sub(amountToLeverage)
        .toString();
    } else {
      values[collateral.token + "tempNewTotal"] = troveBalance.toString();
    }
    if (isNaN(Number(tokenBalance))) {
      tokenBalance = Decimal.ZERO;
    }
    // console.log("Unlever Values", values)
    return (
      <>
        <Text textStyle="subtitle1" mb={5}>
          <Text as="span" fontWeight="normal">
            Expected YUSD Repaid:
          </Text>{" "}
          {amountToLeverage.gt(Decimal.ZERO) ? Number(amountToLeverage) * currPrice : "0"} YUSD
        </Text>
        <Text textStyle="body1">
          New Total {collateral.token} in Trove:{" "}
          {amountToLeverage.gt(Decimal.ZERO)
            ? Math.max(troveBalance - Number(amountToLeverage), 0).toFixed(2)
            : Number(troveBalance).toFixed(2)}{" "}
          {collateral.token}
        </Text>
      </>
    );
  }

  function ExpectedLeverage() {
    const [sliderValue, setSliderValue] = useState(1);

    let tokenBalance: Decimal = tokenBalances[currAddress];

    if (isNaN(Number(tokenBalance))) {
      tokenBalance = Decimal.ZERO;
    }

    let amountToLeverage: Decimal =
      values[collateral.token + "tempAmount"] === undefined
        ? Decimal.ZERO
        : Decimal.from(values[collateral.token + "tempAmount"]!);
    // let vcAmountToLeverage: number = +String(values[collateral.token + "tempAmount"]) * currToken[0].safetyRatio * +String(underlyingPrices[currAddress])
    // console.log('vcAmountToLeverage', vcAmountToLeverage)
    // vcInputs[currAddress] = Decimal.from(String(vcAmountToLeverage))
    // let tempVCOutputs: TroveMappings = {};
    // let depositFees: TroveMappings = {};
    // liquity.getDepositFee(vcInputs, tempVCOutputs).then(fees => {
    //   depositFees = fees;
    // });

    let currTokenMaxLeverage = 0;
    if (collateral.token === "DANGER") {
      currTokenMaxLeverage = 1.6;
    } else {
      currTokenMaxLeverage = +getNum(
        Math.round(1.1 / (1.1 - format(safetyRatios[currToken[0].address]))) -
          1 +
          format(safetyRatios[currToken[0].address]) * 0.1,
        2
      );
    }
    if (
      (sliderValue == 1 &&
        values[collateral.token + "leverage"] != undefined &&
        values[collateral.token + "templeverage"] == undefined) ||
      values[collateral.token + "templeverage"] == ""
    ) {
      setSliderValue(Number(values[collateral.token + "leverage"]));
      values[collateral.token + "templeverage"] = values[collateral.token + "leverage"];
    } else if (
      sliderValue == 1 &&
      values[collateral.token + "templeverage"] != undefined &&
      values[collateral.token + "templeverage"] != "" &&
      values[collateral.token + "templeverage"] != 1
    ) {
      setSliderValue(Number(values[collateral.token + "templeverage"]));
    }

    // else if (values[collateral.token+"templeverage"] != undefined && values[collateral.token+"templeverage"] != "-1") {
    //   setSliderValue(Number(values[collateral.token+"templeverage"]))
    // }
    if (sliderValue !== 0) {
      amountToLeverage = amountToLeverage.mul(Decimal.from(sliderValue));
    }

    const tokenPrice = underlyingPrices[currAddress];

    let expectedYUSD: Decimal;
    let vc: Decimal = amountToLeverage.mul(tokenPrice).mul(safetyRatios[currAddress]);

    if (sliderValue > 1) {
      expectedYUSD = vc.div(
        Decimal.from(sliderValue).div(Decimal.from(sliderValue).sub(Decimal.ONE))
      );
    } else {
      expectedYUSD = Decimal.ZERO;
    }

    const currentTroveBalance =
      trove.collaterals && trove.collaterals[collateral.address]
        ? trove.collaterals[collateral.address]
        : Decimal.ZERO;

    values[collateral.token + "tempExpectedYUSD"] = expectedYUSD.toString();
    values[collateral.token + "tempPostLeverage"] = amountToLeverage.gt(Decimal.ZERO)
      ? amountToLeverage.toString()
      : "0";
    values[collateral.token + "tempNewTotal"] = amountToLeverage.gt(Decimal.ZERO)
      ? currentTroveBalance.add(amountToLeverage).toString()
      : currentTroveBalance.toString();

    return (
      <>
        <Flex align="center" justify="space-between" mb={2.5} marginTop={4}>
          <Text textStyle="subtitle1">Expected Leverage</Text>
          <Text textStyle="subtitle1">~{sliderValue}x</Text>
        </Flex>

        <Text textStyle="body2" textAlign="center" mb={5.5} paddingTop={1} paddingBottom={2}>
          The underlyingPrices of the collateral has to decrease approximately by 100.00% for you to
          get flagged for liquidation
        </Text>

        <Slider
          marginTop={1}
          defaultValue={
            values[collateral.token + "templeverage"] == undefined ||
            values[collateral.token + "templeverage"] == ""
              ? 1
              : Number(values[collateral.token + "templeverage"])
          }
          min={1}
          max={currTokenMaxLeverage}
          step={0.01}
          onChange={v => {
            values[collateral.token + "templeverage"] = v;
            setSliderValue(v);
          }}
        >
          <SliderTrack bg="#4B97FF">
            <SliderFilledTrack bg="#227DF7" />
          </SliderTrack>
          <SliderThumb boxSize={3}></SliderThumb>
        </Slider>

        <HStack align="center" justify="space-between">
          <Text textStyle="subtitle1">1x</Text>

          {/* <Text textStyle="body2">
            Liquidation Price ~ ${calcLiquidationPrice()}
          </Text> */}

          <Text textStyle="subtitle1">{currTokenMaxLeverage}x</Text>
        </HStack>

        <Text textStyle="subtitle1" mb={5} marginTop={7}>
          <Text as="span" fontWeight="normal">
            Post-Leverage {collateral.token} Amount:
          </Text>{" "}
          {amountToLeverage.gt(Decimal.ZERO) ? amountToLeverage.toString() : "0"} {collateral.token}
        </Text>

        <Text textStyle="subtitle1" mb={5}>
          <Text as="span" fontWeight="normal">
            New Total {collateral.token} in Trove:
          </Text>{" "}
          {amountToLeverage.gt(Decimal.ZERO)
            ? Number(currentTroveBalance.toString()) + Number(amountToLeverage.toString())
            : currentTroveBalance.toString()}{" "}
          {collateral.token}
        </Text>

        <Text textStyle="subtitle1" mb={5}>
          <Text as="span" fontWeight="normal">
            Expected YUSD Debt:
          </Text>{" "}
          {expectedYUSD.gt(Decimal.ZERO) ? Number(expectedYUSD.toString()).toFixed(4) : "0"}
        </Text>

        {/* <Text textStyle="body1" mb={5}>
            Total Fees (0.5%):{" "}
            <Text as="span" fontWeight="bold">
                0.0012 YUSD
            </Text>
          </Text> */}
      </>
    );
  }
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent>
        {/* <Form
          onSubmit={onSubmit}
          initialValues={[]}
          render={(values) => ( */}
        {/* <> */}
        <ModalHeader fontSize="2xl" pb={2}>
          {type === "lever" ? "Lever Up" : "Deleverage"}
          <ModalCloseButton />
        </ModalHeader>

        <ModalBody>
          <Text textStyle="body2" fontWeight="bold" mb={1.5}>
            Collateral type
          </Text>
          <Flex
            align="center"
            mb={5}
            borderWidth={2}
            borderStyle="solid"
            borderColor="brand.700"
            borderRadius="input"
            py={2}
            px={2.5}
          >
            <Icon iconName={collateral.token} h={6} w={6} />
            <Text textStyle="subtitle2" ml={3.5}>
              {collateral.token}
            </Text>
          </Flex>

          {type === "unlever" && (
            <Text textStyle="body1" mb={5}>
              Total {collateral.token} in Trove: {format(tokenB)} {collateral.token}
            </Text>
          )}

          <Text textStyle="body2" fontWeight="bold" mb={1.5}>
            Amount to {type === "lever" ? "Leverage" : "Deleverage"}
          </Text>
          {type === "lever" && (
            <Text textStyle="body2" mb={1}>
              Balance:{" "}
              {getNum(
                tokenBalances[currAddress] ? Number(tokenBalances[currAddress].toString()) : 0
              )}
            </Text>
          )}
          <AdjustInput
            token={collateral.token}
            name={collateral.token + "tempAmount"}
            mb={4}
            defaultValue={
              values[collateral.token] === undefined ? 0 : Number(values[collateral.token])
            }
            max={
              type === "lever" ? Number(collateral.walletBalance) : Number(collateral.troveBalance)
            }
            // values={checker(values)}
            fillContainer
            showToken
          />

          {/* <HStack spacing={2} h="full" marginBottom={5} alignItems="flex-start">
                <Button size="xsm" fontSize="14px" bg="#227CF6" fontWeight="medium" px="2">0%</Button>
                <Button size="xsm" fontSize="14px" bg="#227CF6" fontWeight="medium" px="1">25%</Button>
                <Button size="xsm" fontSize="14px" bg="#227CF6" fontWeight="medium" px="1">50%</Button>
                <Button size="xsm" fontSize="14px" bg="#227CF6" fontWeight="medium" px="1">75%</Button>
                <Button size="xsm" fontSize="14px" bg="#227CF6" fontWeight="medium" px="1">100%</Button>
              </HStack> */}

          <Text textStyle="subtitle1" mb={2} paddingTop={0}>
            Slippage
          </Text>

          <Slippages values={values} collateral={collateral} />

          {type === "lever" ? (
            <>
              <ExpectedLeverage />
            </>
          ) : (
            <>
              <Unlever />
            </>
          )}
        </ModalBody>

        <ModalFooter justifyContent="flex-start">
          {values[collateral.token + "tempAmount"] ? (
            <Button variant="primary" mr={6} onClick={onSubmit}>
              Save
            </Button>
          ) : (
            <Button variant="primary" mr={6} onClick={onSubmit} isDisabled={true}>
              Save
            </Button>
          )}

          <Button variant="secondary" onClick={cancel}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default LeverUpModal;
