// @ts-nocheck
import { HStack, Button, NumberInput, NumberInputField } from "@chakra-ui/react";
import React from "react";
import { Collateral } from "../Types";

// TODO: Fix types for Collateral
type SlippagesProps = {
  values: { [key: string]: any };
  collateral: Collateral;
};

const Slippages: React.FC<SlippagesProps> = ({ values, collateral }) => {
  const format = (val: string) => val + "%";
  const parse = (val: string) => val.replace("[a-zA-z\s]", "");

  const [customValue, setCustomValue] = React.useState("X");

  const [button1, setButton1] = React.useState(false);
  const [button2, setButton2] = React.useState(false);
  const [button3, setButton3] = React.useState(false);
  const [button4, setButton4] = React.useState(false);

  if (
    !button1 &&
    !button2 &&
    !button3 &&
    !button4 &&
    customValue === "X" &&
    values[collateral.token + "slippage"] != undefined &&
    values[collateral.token + "tempSlippage"] == undefined
  ) {
    // console.log("values[collateral.token+slippage]", values[collateral.token+"slippage"])
    if (values[collateral.token + "slippage"] == 0.01) {
      setButton1(true);
    } else if (values[collateral.token + "slippage"] == 0.02) {
      setButton2(true);
    } else if (values[collateral.token + "slippage"] == 0.03) {
      setButton3(true);
    } else if (values[collateral.token + "slippage"] == 0.05) {
      setButton4(true);
    } else {
      setCustomValue(String(values[collateral.token + "slippage"] * 100));
    }
  }

  if (
    !button1 &&
    !button2 &&
    !button3 &&
    !button4 &&
    customValue === "X" &&
    values[collateral.token + "tempSlippage"] != undefined
  ) {
    // console.log("values[collateral.token+tempSlippage]", values[collateral.token+"tempSlippage"])
    if (values[collateral.token + "tempSlippage"] == 1) {
      setButton1(true);
    } else if (values[collateral.token + "tempSlippage"] == 2) {
      setButton2(true);
    } else if (values[collateral.token + "tempSlippage"] == 3) {
      setButton3(true);
    } else if (values[collateral.token + "tempSlippage"] == 5) {
      setButton4(true);
    } else {
      setCustomValue(String(values[collateral.token + "tempSlippage"]));
    }
  }

  if (
    !button1 &&
    !button2 &&
    !button3 &&
    !button4 &&
    customValue === "X" &&
    values[collateral.token + "slippage"] == undefined &&
    values[collateral.token + "tempSlippage"] == undefined
  ) {
    // console.log("HIT")
    values[collateral.token + "tempSlippage"] = 2;
    setCustomValue(String(values[collateral.token + "tempSlippage"]));
  }

  const buttonOnClick = (
    button: boolean,
    setButtonFunc: React.Dispatch<React.SetStateAction<boolean>>,
    slippage: number
  ) => {
    setButton1(false);
    setButton2(false);
    setButton3(false);
    setButton4(false);
    setCustomValue("0.09");
    setButtonFunc(true);
    values[collateral.token + "tempSlippage"] = slippage;
  };

  const customOnChange = (newValue: string) => {
    setCustomValue(newValue === "0" ? "0" : parse(newValue));
    setButton1(false);
    setButton2(false);
    setButton3(false);
    setButton4(false);
    values[collateral.token + "tempSlippage"] = Number(newValue);
  };

  return (
    <>
      <HStack marginTop={3.5} spacing={2} h="full" marginBottom={5} alignItems="flex-start">
        <Button
          fontWeight={button1 ? "semibold" : "medium"}
          onClick={() => buttonOnClick(button1, setButton1, 1)}
          size="sm"
          fontSize="14px"
          bg="#227CF6"
          border={button1 ? "1px" : "0px"}
          borderColor="white"
          px="1"
          rounded={10}
          variant="primary"
        >
          1%
        </Button>
        <Button
          fontWeight={button2 ? "semibold" : "medium"}
          onClick={() => buttonOnClick(button2, setButton2, 2)}
          size="sm"
          fontSize="14px"
          bg="#227CF6"
          border={button2 ? "1px" : "0px"}
          borderColor="white"
          px="2"
          rounded={10}
          variant="primary"
        >
          2%
        </Button>
        <Button
          fontWeight={button3 ? "semibold" : "medium"}
          onClick={() => buttonOnClick(button3, setButton3, 3)}
          size="sm"
          fontSize="14px"
          bg="#227CF6"
          border={button3 ? "1px" : "0px"}
          borderColor="white"
          px="2"
          rounded={10}
          variant="primary"
        >
          3%
        </Button>
        <Button
          fontWeight={button4 ? "semibold" : "medium"}
          onClick={() => buttonOnClick(button4, setButton4, 5)}
          size="sm"
          fontSize="14px"
          bg="#227CF6"
          border={button4 ? "1px" : "0px"}
          borderColor="white"
          px="2"
          rounded={10}
          variant="primary"
        >
          5%
        </Button>
        <Button
          size="sm"
          fontSize="14px"
          px="2"
          rounded={10}
          margin={0}
          padding={0}
          color="white"
          border={customValue !== "X" && Number(customValue) >= 0.1 ? "1px" : "0px"}
          borderColor="white"
          bg={customValue !== "X" && Number(customValue) >= 0.1 ? "#227CF6" : "#0051bd"}
          variant="primary"
        >
          <NumberInput
            paddingLeft={0}
            marginLeft={0}
            border="none"
            bg="transparent"
            focusBorderColor="transparent"
            w="40px"
            onChange={newValue => customOnChange(newValue)}
            value={customValue === "0.09" ? "X%" : format(customValue)}
            min={0.09}
            max={100}
          >
            <NumberInputField
              fontWeight={customValue !== "X" && Number(customValue) >= 0.1 ? "semibold" : "medium"}
              padding={0}
              marginLeft={0}
              border="none"
              fontSize="14px"
              paddingBottom={0}
              textAlign="center"
              textColor={customValue !== "X" && Number(customValue) >= 0.1 ? "white" : "gray.300"}
            />
          </NumberInput>
        </Button>
      </HStack>
    </>
  );
};

export default Slippages;
