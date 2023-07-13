// @ts-nocheck
import React, { useState } from "react";
import {
  NumberInput,
  NumberInputField,
  Input,
  Button,
  Text,
  Flex,
  Tooltip,
  Box,
  BoxProps,
  useStyleConfig
} from "@chakra-ui/react";
import { Field } from "react-final-form";
import Icon from "./Icon";
import CurrencyConverter from "./CurrencyConverterLabel";
import { extractFloatChars, clamp } from "../Utils/number";
import { useMyTransactionState } from "./Transaction";
import { CoinMode } from "../Types";
import { Decimal, LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

type AdjustInputProps = {
  token: string;
  values?: { [key: string]: any };
  showToken?: boolean;
  showIcons?: boolean;
  disabled?: boolean;
  name: string;
  defaultValue?: number;
  max?: number | string;
  min?: number;
  step?: number;
  precision?: number;
  size?: string | undefined;
  variant?: string;
  fillContainer?: boolean;
  inputWidth?: number;
  iconStatus?: any;
  setIconStatus?: any;
  isYUSDDebt?: any;
  id?: any;
  borrowMode?: "normal" | "lever" | "unlever";
  noCurrencyConvert?: boolean;
  transactionId?: string;
  isDeprecated?: boolean;
} & BoxProps;

const selector = ({ trove }: LiquityStoreState) => ({
  trove
});

/**
 * Completely stateless AdjustInput component to use with React Final Form.
 */
const AdjustInput: React.FC<AdjustInputProps> = ({
  token,
  disabled,
  name,
  precision = 2,
  defaultValue,
  max,
  min = 0,
  step,
  size = "md",
  variant,
  fillContainer,
  showToken = false,
  showIcons = false,
  inputWidth = "auto",
  iconStatus,
  setIconStatus,
  isYUSDDebt = false,
  values,
  id,
  borrowMode = "normal",
  noCurrencyConvert = false,
  transactionId,
  isDeprecated,
  ...props
}) => {
  const { trove } = useLiquitySelector(selector);
  const [currencyType, setCurrencyType] = useState<string>("USD");
  const styleProps = useStyleConfig("AdjustInput") as Record<string, Record<string, string>>;
  const { input: inputStyle, inputGroup, decoratorContainer, adjustIcons } = styleProps;

  const toggle = (mode: "deposit" | "withdraw") => {
    const temp: CoinMode = {};
    temp[token] = mode;

    setIconStatus({ ...iconStatus, ...temp });
  };

  const getFormattedValue = (value: string) => {
    if (/^[0-9.]*$/.test(value)) {
      if (max != undefined && value != "") {
        const decimalInput: Decimal = Decimal.from(value);
        const decimalMax: Decimal = Decimal.from(max);
        if (decimalInput.gte(decimalMax)) {
          return decimalMax.toString();
        }
      }

      return value;
    }
    return "";
  };

  const maxCheck = (value: string, input: any) => {
    if (/^[0-9.]*$/.test(value)) {
      if (max != undefined && value != "") {
        const decimalInput: Decimal = Decimal.from(value);
        const decimalMax: Decimal = Decimal.from(max);
        if (decimalInput.gte(decimalMax)) {
          input.onChange(decimalMax.toString()!);
          return decimalMax.toString();
        }
      }

      return value;
    }
    return "";
  };

  // const handleCollateralChange = (rawInput:number, maxVal:number) => {
  //   return const originalTotalPrice = calculatorState.adjustedCollaterals.reduce(
  //     (underlyingPrices, collateralItem) => underlyingPrices + collateralItem.underlyingPrices,
  //     0
  //   );
  // }

  const getNumberValue = (value: any) => {
    const val = getFormattedValue(value);
    return val.length === 0 ? 0 : parseFloat(val);
  };

  const myTransactionState = useMyTransactionState(transactionId ? transactionId : "");

  return (
    <Flex align="center" {...props} width={fillContainer ? "100%" : "auto"}>
      {showIcons && (
        <Flex mr={1.5} direction="column">
          <Tooltip
            label={
              isYUSDDebt
                ? "Deposit YUSD"
                : isDeprecated
                ? "This collateral has been deprecated. You can only withdraw."
                : borrowMode === "unlever"
                ? "You cannot deposit during unlever mode"
                : "Deposit"
            }
            placement="left"
          >
            <Text
              textStyle="subtitle3"
              bg={iconStatus[token] === "deposit" ? "green.500" : "transparent"}
              color={iconStatus[token] === "deposit" ? "white" : "brand.600"}
              borderWidth="1px"
              borderStyle="solid"
              borderColor={iconStatus[token] === "deposit" ? "green.500" : "brand.600"}
              borderRadius="full"
              cursor="pointer"
              align="center"
              px={2}
              mb={0.5}
              onClick={
                borrowMode !== "unlever" && !isDeprecated ? () => toggle("deposit") : () => {}
              }
            >
              {isYUSDDebt ? "Borrow" : "Deposit"}
            </Text>
            {/* <Icon
              iconName={iconStatus[token] === "deposit" ? "FilledAddIcon" : "AddIcon"}
              onClick={() => toggle("deposit")}
              cursor="pointer"
              w={5}
              h={5}
              mb={0.5}
            /> */}
          </Tooltip>
          <Tooltip
            label={
              isYUSDDebt
                ? "Pay Back YUSD"
                : borrowMode === "lever"
                ? "You cannot withdraw during lever mode"
                : "Withdraw"
            }
            placement="left"
          >
            <Text
              textStyle="subtitle3"
              bg={iconStatus[token] === "withdraw" ? "red.500" : "transparent"}
              color={iconStatus[token] === "withdraw" ? "white" : "brand.600"}
              borderWidth="1px"
              borderStyle="solid"
              borderColor={iconStatus[token] === "withdraw" ? "red.500" : "brand.600"}
              borderRadius="full"
              cursor="pointer"
              align="center"
              px={2}
              mt={0.5}
              onClick={
                borrowMode !== "lever" && trove.status === "open"
                  ? () => toggle("withdraw")
                  : () => {}
              }
            >
              {isYUSDDebt ? "Repay" : "Withdraw"}
            </Text>
            {/* <Icon
              iconName={iconStatus[token] === "withdraw" ? "FilledMinusIcon" : "MinusIcon"}
              onClick={() => toggle("withdraw")}
              cursor="pointer"
              w={5}
              h={5}
              mt={0.5}
            /> */}
          </Tooltip>
          <Field
            name={name + "mode"}
            initialValue={iconStatus[token]}
            render={({ input }) => <Input {...input} value={iconStatus[token]} display="none" />}
          />
        </Flex>
      )}
      <Box {...inputGroup} h="100%" w={fillContainer ? "100%" : "auto"}>
        {showToken && <Icon iconName={token} ml={2.5} h={6} w={6} />}
        <Field
          name={name}
          initialValue={defaultValue ? String(defaultValue) : undefined}
          render={({ input }) => (
            <>
              {myTransactionState.type === "confirmed" ? input.onChange(undefined) : null}
              <NumberInput
                {...input}
                {...inputStyle}
                minW={inputWidth}
                errorBorderColor="transparent"
                w="100%"
                min={min}
                keepWithinRange={true}
                clampValueOnBlur={true}
                value={
                  values === undefined
                    ? maxCheck(input.value, input)
                    : values[name] == undefined
                    ? defaultValue != undefined
                      ? defaultValue
                      : maxCheck(input.value, input)
                    : maxCheck(values[name], input)
                }
                defaultValue={defaultValue}
                // pattern={"[0-9]*(.[0-9]+)?"}
              >
                <NumberInputField
                  w="100%"
                  border="none"
                  placeholder="0.00000"
                  pl={1.5}
                  pr={0}
                  _focus={{ border: "none" }}
                />
              </NumberInput>
              <Box {...decoratorContainer} px={size === "sm" ? 1.5 : 2.5} py={2.5}>
                {!noCurrencyConvert && (
                  <CurrencyConverter
                    value={
                      values == undefined
                        ? getNumberValue(input.value)
                        : values[name] == undefined
                        ? defaultValue != undefined
                          ? defaultValue
                          : getNumberValue(input.value)
                        : values[name]
                    }
                    token={token}
                    currency={currencyType}
                    textAlign="right"
                    fontWeight="bold"
                    w={16}
                    onClick={() => {
                      token !== "YUSD" && currencyType === "USD"
                        ? setCurrencyType("RAV")
                        : setCurrencyType("USD");
                    }}
                    style={{ cursor: "pointer" }}
                  />
                )}
                {max !== undefined && (
                  <Button
                    colorScheme="brand"
                    size="xs"
                    ml={2.5}
                    //pointerEvents={isAtMax ? "none" : "initial"}
                    opacity={"1"}
                    onClick={() => {
                      input.onChange(max!);
                    }}
                  >
                    Max
                  </Button>
                )}
              </Box>
            </>
          )}
        />
      </Box>
    </Flex>
  );
};

export default AdjustInput;
