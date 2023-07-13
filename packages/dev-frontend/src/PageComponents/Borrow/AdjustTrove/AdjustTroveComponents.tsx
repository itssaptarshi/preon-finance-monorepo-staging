// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Button,
  Spacer,
  Text,
  Divider,
  BoxProps,
  useDisclosure,
  useToast,
  UseToastOptions
} from "@chakra-ui/react";
import AdjustBorrowAmount from "../AdjustBorrowAmount";
import AdjustCollateral from "../AdjustCollateral";
import ConfirmChangesModal from "../ConfirmChangesModal";
import { TransactionProgressDonut } from "../../../components/Transaction";
// TODO - import { LiquityStoreState, Decimal, TroveMappings } from "@liquity/lib-base";
import { LiquityStoreState, Decimal } from "@liquity/lib-base";
import { TroveMappings } from "../../../Types";
import { useLiquitySelector } from "@liquity/lib-react";
import { useLiquity } from "../../../hooks/LiquityContext";
import tokenData from "../../../TokenData";
import {
  checkCollateral,
  checkBorrow,
  getAffectedCollateral,
  calculateTotalYUSDFromLever,
  calculateVcValue,
  calculateAvcValue
} from "./AdjustTrove.utils";
import { format, formatWithDecimals } from "../../../Utils/number";
import { Form } from "react-final-form";
import { Toggle } from "../../../components";
import { AdjustedTokenData } from "../../../Types";
import { CoinMode } from "../../../Types";
import { FormApi } from "final-form";

type AdjustTroveComponentsProps = {
  borrowMode: "normal" | "lever" | "unlever";
  setBorrowMode: any;
  values: { [key: string]: any };
  form: FormApi<Record<string, any>, Partial<Record<string, any>>>;
};
// TODO fix type defs
const selector = ({
  trove,
  underlyingPrices,
  prices,
  tokenBalances,
  borrowingRate,
  decimals,
  safetyRatios,
  recoveryRatios,
  underlyingPerReceiptRatios,
  receiptPerUnderlyingRatios
}: any | LiquityStoreState) => ({
  borrowingRate,
  trove,
  underlyingPrices,
  prices,
  tokenBalances,
  decimals,
  safetyRatios,
  recoveryRatios,
  underlyingPerReceiptRatios,
  receiptPerUnderlyingRatios
});

var BreakException = {};

const AdjustTroveComponents: React.FC<AdjustTroveComponentsProps> = ({
  borrowMode,
  setBorrowMode,
  values,
  form
}) => {
  const {
    trove,
    underlyingPrices,
    prices,
    tokenBalances,
    borrowingRate,
    decimals,
    safetyRatios,
    recoveryRatios,
    underlyingPerReceiptRatios,
    receiptPerUnderlyingRatios
  } = useLiquitySelector(selector);

  const { liquity } = useLiquity();

  const [leverSave, setLeverSave] = useState<"saved" | "unsaved">("unsaved");

  const [isCapExceed, setIsCapExceed] = useState(false);

  const {
    isOpen: isConfirmChangesOpen,
    onOpen: onConfirmChangesOpen,
    onClose: onConfirmChangesClose
  } = useDisclosure();
  const toast = useToast();

  const toastProps: UseToastOptions = {
    status: "error",
    duration: 4000,
    isClosable: true,
    position: "top-right"
  };

  // Shape collateral
  useEffect(() => {
    tokenData.map(
      token =>
        (token["troveBalance"] = formatWithDecimals(
          trove.collaterals[token.address],
          decimals[token.address].toNumber()
        ))
    );
    //TODO
    tokenData.map(
      token =>
        (token["walletBalance"] = formatWithDecimals(
          tokenBalances[token.underlying == "" ? token.address : token.underlying],
          token.underlyingDecimals
        ))
    );
  }, [tokenBalances, trove.collaterals]);

  //TODO move those into utils
  // Validate changes
  const validate = (
    values: { [key: string]: string | number },
    ICR: number,
    troveBalancePost: number
  ) => {
    try {
      // Data Engineering
      let affectedTokens = Object.keys(values).filter(value => !value.includes("mode"));
      const affectedCollateral = tokenData.filter(collateral =>
        affectedTokens.includes(collateral.token)
      );

      // Collateral Error Checks
      let totalYUSDFromLever: Decimal = calculateTotalYUSDFromLever(
        adjustedCollateral,
        underlyingPrices,
        values,
        safetyRatios
      );
      let [changes, collateralApproved, message, description] = checkCollateral(
        affectedCollateral,
        values,
        receiptPerUnderlyingRatios
      );
      if (!collateralApproved) {
        toast({
          title: message,
          description: description,
          ...toastProps
        });
        throw BreakException;
      }

      if (troveBalancePost < 2000 && trove.status == "open") {
        toast({
          title: "Invalid Action",
          description:
            "You are paying back more YUSD than minimum debt required to keep trove open (2000 YUSD). Please reduce debt repayment amount or close trove.",
          ...toastProps
        });
        throw BreakException;
      } else if (troveBalancePost < 2000) {
        toast({
          title: "Invalid Action",
          description: "You must borrow at least 2000 YUSD in order to open a Trove.",
          ...toastProps
        });
        throw BreakException;
      }

      if (!changes && values["YUSD"] === 0) {
        toast({
          title: "Invalid Action",
          description: "Please make some changes to your trove before confirming changes",
          ...toastProps
        });
        throw BreakException;
      }
      // console.log(values);
      let borrowApproved;
      [borrowApproved, message, description] = checkBorrow(
        values,
        totalYUSDFromLever,
        trove.debt["debt"],
        ICR
      );
      if (!borrowApproved) {
        toast({
          title: message,
          description: description,
          ...toastProps
        });
        throw BreakException;
      }

      if ((changes || values["YUSD"] !== 0) && borrowApproved && collateralApproved) {
        onConfirmChangesOpen();
      }
    } catch (e) {
      if (e !== BreakException) throw e;
    }
  };

  const leverOptions = [
    { key: "normal", value: "Normal" },
    { key: "lever", value: "Leverage" }
  ];

  if (trove.status === "open") {
    leverOptions.push({ key: "unlever", value: "Deleverage" });
  }

  /**
   * Set and update fees
   */
  // TODO: right now we can get the fee for all collaterals, but this could be optimized by filtering the list for collaterals that user added and collaterals that have balance
  const collateral = tokenData.filter(token => values[token.token + "mode"] !== undefined);
  const fees: TroveMappings = {};
  // console.log("AC", ratios)
  collateral.map(token => (fees[token.address] = Decimal.ZERO));
  const [depositFees, setFees] = useState<TroveMappings>(fees);
  //let amountInForLeverage: TroveMappings = {};
  const getFees = () => {
    let amountsIn: TroveMappings = {};
    let amountsOut: TroveMappings = {};

    if (Object.keys(values).length !== 0) {
      for (let i = 0; i < collateral.length; i++) {
        const token = collateral[i].token;
        const address = collateral[i].address;
        const dec = collateral[i].underlyingDecimals;
        const valuesWithFee: number =
          collateral[i].additionalFee !== undefined && mode[token] === "deposit"
            ? values[token] * (1 - collateral[i].additionalFee!)
            : values[token];
        if (values[token] != null) {
          if (values[token] !== 0) {
            const amount = Decimal.fromWithPrecision(
              isNaN(valuesWithFee) || valuesWithFee < 0
                ? 0
                : +valuesWithFee * format(receiptPerUnderlyingRatios[address]),
              dec
            );
            if (values[token + "mode"] === "deposit") {
              amountsIn[address] = amount;
            } else {
              amountsOut[address] = amount;
              // To show the fee even for assets which have no adjust
              amountsIn[address] = Decimal.fromWithPrecision(1, dec).div(1e6);
            }
          }
        } else {
          // To show the fee even for assets which have no adjust
          amountsIn[address] = Decimal.fromWithPrecision(1, dec).div(1e6);
        }
      }
      //amountInForLeverage = amountsIn;

      liquity // @ts-expect-error
        .getDepositFee(amountsIn, amountsOut) // @ts-expect-error
        .then(fees => {
          setFees(fees);
          setIsCapExceed(false);
        }) // @ts-expect-error
        .catch(e => {
          const eMSG = e.data.message;
          if (eMSG === "execution reverted: Collateral input exceeds cap") {
            setIsCapExceed(false);
          }
        });
    }
  };

  /**
   * set and update adjustedCollateral
   */

  const coins: CoinMode = {};
  tokenData.map(coin => {
    coins[coin.token] = coin.isDeprecated == true ? "withdraw" : "deposit";
  });
  if (values["YUSDmode"] !== undefined) {
    coins["YUSD"] = values["YUSDmode"];
  } else {
    coins["YUSD"] = "deposit";
  }
  if (borrowMode !== "unlever") {
    coins["YUSD"] = "deposit";
  } else {
    coins["YUSD"] = "withdraw";
  }
  const [mode, setMode] = useState<CoinMode>(coins);
  const [adjustedCollateral, setAdjustedCollateral] = useState(getAffectedCollateral(values));
  /**
   * set vcValue
   */
  const [vcValue, setVcValue] = useState(
    calculateVcValue(
      borrowMode,
      adjustedCollateral,
      prices,
      values,
      safetyRatios,
      receiptPerUnderlyingRatios
    )
  );

  const [avcValue, setAvcValue] = useState(
    calculateAvcValue(
      borrowMode,
      adjustedCollateral,
      prices,
      values,
      recoveryRatios,
      receiptPerUnderlyingRatios
    )
  );

  useEffect(() => {
    setAdjustedCollateral(getAffectedCollateral(values));
    getFees();
    setVcValue(
      calculateVcValue(
        borrowMode,
        adjustedCollateral,
        prices,
        values,
        safetyRatios,
        receiptPerUnderlyingRatios
      )
    );
    setAvcValue(
      calculateAvcValue(
        borrowMode,
        adjustedCollateral,
        prices,
        values,
        recoveryRatios,
        receiptPerUnderlyingRatios
      )
    );
  }, [values]);
  return (
    <>
      <Flex justify="space-between" align="center" mb={2} px={6}>
        <Text color="white" textStyle="title2">
          {trove.status !== "open" ? "Create" : "Adjust"} Trove
        </Text>
        {/* <Toggle
                options={leverOptions}
                size="md"
                onChange={v => {
                  setBorrowMode(v as "normal" | "lever" | "unlever");
                  form.reset();
                }}
              /> */}
      </Flex>
      <ConfirmChangesModal
        isOpen={isConfirmChangesOpen}
        onClose={onConfirmChangesClose}
        values={values}
        collateral={adjustedCollateral}
        borrowMode={borrowMode}
        depositFees={depositFees}
        currVcValue={vcValue}
        avcValue={avcValue}
      />
      <AdjustCollateral
        values={values}
        collateral={tokenData}
        form={form}
        borrowMode={borrowMode}
        leverSave={leverSave}
        setLeverSave={setLeverSave}
        depositFees={depositFees}
        mode={mode}
        setMode={setMode}
      />
      <Box my={5} px={6}>
        <Divider />
      </Box>
      <AdjustBorrowAmount
        values={values}
        collateral={tokenData}
        validateFunc={validate}
        borrowFee={(+borrowingRate.mul(100)).toFixed(3)}
        leverSave={leverSave}
        borrowMode={borrowMode}
        depositFees={depositFees}
        adjustedCollateral={adjustedCollateral}
        mode={mode}
        setMode={setMode}
        vcValue={vcValue}
      />

      {/* <Flex align="center" mt={4} mx={6}>
              <Text textStyle="body2">YUSD Borrow Fee: {(+borrowingRate.mul(100)).toFixed(3)}%</Text>
              <Spacer />
              <Button variant="primary" onClick={() => validate(values)}>
                Confirm Changes
              </Button>
            </Flex> */}
      {isCapExceed ? (
        <Flex
          align="center"
          bg={"yellow.500"}
          py={3}
          px={5}
          position="fixed"
          bottom={4}
          right={4}
          overflow="hidden"
          borderRadius="xl"
          maxW="90%"
        >
          <Box mr={3} w={10} h={10}>
            <TransactionProgressDonut state={"failed"} />
          </Box>
          <Box>
            <Flex>
              <Text textStyle="subtitle1">Collateral input exceeds cap</Text>
            </Flex>
          </Box>
        </Flex>
      ) : null}
    </>
  );
};

export default AdjustTroveComponents;
