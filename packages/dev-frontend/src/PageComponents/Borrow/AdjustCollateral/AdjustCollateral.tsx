// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Box, BoxProps, Text, Tr, Td, Button, Flex, useDisclosure } from "@chakra-ui/react";
import { Icon, TokenTable, AdjustInput, Toggle } from "../../../components";
import AddCollateralTypeModal from "../AddCollateralTypeModal";
import LeverUpModal from "../LeverUpModal";
import { CoinMode, CoinShow, Collateral, TokenData } from "../../../Types";
import tokenData, { tokenDataMappingA } from "../../../TokenData";
import { format, adjustValue, getNum, formatWithDecimals } from "../../../Utils/number";
import { getAmountChanges } from "../../../Utils/validation";
// import { TroveMappings, Decimal } from "@liquity/lib-base";
import { Decimal } from "@liquity/lib-base";
import { useLiquity } from "../../../hooks/LiquityContext";
import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import {
  dec,
  getTroveUnderlyingValueWithLever,
  getTroveVaultValueWithLever
} from "../AdjustTrove/AdjustTrove.utils";
import Tooltip from "../../../components/Tooltip";
import { objectKeys } from "@chakra-ui/utils";
import Trove from "../Trove/Trove";

// TODO fix type def
type AdjustCollateralProps = {
  values: { [key: string]: any };
  borrowMode: "normal" | "lever" | "unlever";
  leverSave: "saved" | "unsaved";
  setLeverSave: React.Dispatch<React.SetStateAction<"saved" | "unsaved">>;
  collateral: TokenData[];
  form: any;
  depositFees: any; //TroveMappings;
  mode: CoinMode;
  setMode: React.Dispatch<React.SetStateAction<CoinMode>>;
} & BoxProps;

export interface CollateralAPYs {
  [key: string]: any;
}

const selector = ({
  trove,
  prices,
  tokenBalances,
  safetyRatios,
  decimals,
  underlyingPerReceiptRatios,
  receiptPerUnderlyingRatios,
  total
}: any | LiquityStoreState) => ({
  trove,
  prices,
  tokenBalances,
  safetyRatios,
  decimals,
  underlyingPerReceiptRatios,
  receiptPerUnderlyingRatios,
  total
});

const AdjustCollateral: React.FC<AdjustCollateralProps> = ({
  values,
  collateral,
  form,
  borrowMode,
  setLeverSave,
  leverSave,
  depositFees,
  mode,
  setMode,
  ...props
}) => {
  const {
    trove,
    prices,
    tokenBalances,
    safetyRatios,
    decimals,
    underlyingPerReceiptRatios,
    receiptPerUnderlyingRatios,
    total
  } = useLiquitySelector(selector);
  const {
    isOpen: isAddCollateralTypeOpen,
    onOpen: onAddCollateralTypeOpen,
    onClose: onAddCollateralTypeClose
  } = useDisclosure();
  const { isOpen: isLeverUpOpen, onOpen: onLeverUpOpen, onClose: onLeverUpClose } = useDisclosure();

  const [leveredToken, setLeveredToken] = useState<Collateral>({} as Collateral);

  // Coin Display Config State
  const coinShow: CoinShow = {};
  collateral.forEach(coin => {
    if (coin.troveBalance === 0) {
      coinShow[coin.token] = false;
    } else {
      coinShow[coin.token] = true;
    }
  });
  const [show, setShow] = useState<CoinShow>(coinShow);
  let availableCollateral = collateral.filter(coin => !show[coin.token]);
  const currentCollateral = collateral.filter(coin => show[coin.token]);

  const openLeverUp = (token: Collateral) => {
    setLeveredToken(token);
    onLeverUpOpen();
    setLeverSave("unsaved");
  };

  const checker = (values: { [key: string]: any }) => {
    Object.keys(values).map(key => {
      if (!key.includes("mode")) {
        const value = values[key];
        try {
          Decimal.from(values[key]);
          values[key] = value;
        } catch (err) {
          delete values[key];
        }
      }
    });

    return values;
  };

  const [APYs, setAPYs] = useState<CollateralAPYs>({} as CollateralAPYs);

  useEffect(() => {
    const cc = tokenData.filter(coin => show[coin.token]);
    const fetchData = async () => {
      const tempAPYs: CollateralAPYs = {};
      for (var i = 0; i < Object.keys(cc).length; i++) {
        const token = cc[i].token;
        let url = `https://api.yeti.finance/v1/Collaterals/${token}/APY`;
        if (token === "WETH-WAVAX JLP") {
          url = "https://api.yeti.finance/v1/Collaterals/WETHWAVAXJLP/APY";
        } else if (token === "AVAX-USDC JLP") {
          url = "https://api.yeti.finance/v1/Collaterals/AVAXUSDCJLP/APY";
        }
        try {
          fetch(url, { method: "GET", mode: "cors" })
            .then(function (response) {
              if (response.ok) {
                return response.json();
              }
              const err = new Error("No live API for " + token);
              throw err;
            })
            .then(function (result) {
              if (result !== undefined) {
                tempAPYs[token] = result;
              }
            })
            .catch(e => {
              console.log(e);
            });
        } catch (error) {
          console.log("error", error);
        }
      }
      setAPYs(tempAPYs);
    };
    fetchData();
  }, [show]);

  const showLeverModal = (item: Collateral) => {
    return (
      <Td pt={8} pb={2} pl={2}>
        {borrowMode === "normal" ? (
          <Button variant="orange" isDisabled>
            Lever Up
          </Button>
        ) : borrowMode === "lever" &&
          item.walletBalance === 0 &&
          isNaN(values[item.token + "leverage"]) ? (
          <Button variant="orange" onClick={() => openLeverUp(item)} isDisabled>
            Lever Up
          </Button>
        ) : borrowMode === "lever" &&
          item.walletBalance !== 0 &&
          isNaN(values[item.token + "slippage"]) ? (
          <Button variant="orange" onClick={() => openLeverUp(item)}>
            Lever Up
          </Button>
        ) : borrowMode === "unlever" &&
          item.troveBalance !== 0 &&
          isNaN(values[item.token + "slippage"]) ? (
          <Button variant="orange" onClick={() => openLeverUp(item)}>
            Deleverage
          </Button>
        ) : !isNaN(values[item.token + "leverage"]) && values[item.token + "leverage"] != 1 ? (
          <Button variant="orange" onClick={() => openLeverUp(item)}>
            {values[item.token + "leverage"]}x Leverage
          </Button>
        ) : borrowMode === "lever" && !isNaN(values[item.token + "slippage"]) ? (
          <Button variant="orange" onClick={() => openLeverUp(item)}>
            No Leverage
          </Button>
        ) : (
          <Button variant="orange" onClick={() => openLeverUp(item)}>
            Deleveraged
          </Button>
        )}
      </Td>
    );
  };

  useEffect(() => {
    availableCollateral = collateral.filter(coin => !show[coin.token]);
  }, [values, collateral]);

  // useEffect(() => {
  //   for (var i = 0; i < collateral.length; i++) {
  //     const coin = collateral[i];
  //     if (borrowMode === "unlever") {
  //       coins[coin.token] = "withdraw";
  //     } else if (borrowMode === "lever") {
  //       coins[coin.token] = "deposit";
  //     }
  //   }
  //   setMode(coins);
  // }, [ borrowMode]);

  // console.log("ratioMapping", underlyingPerReceiptRatios)
  // console.log("collateral", collateral)
  const newFormat = (x: Decimal | number) => {
    if (x) {
      return Math.min(parseFloat(x.toString()), 0.01);
    }
    return 0;
  };
  const getMax = (item: TokenData) => {
    return mode[item.token] === "deposit"
      ? tokenBalances[item.isVault ? item.underlying : item.address].toStringWithDecimals(
          item.underlyingDecimals
        )
      : trove.collaterals[item.address] === undefined && mode[item.token] === "withdraw"
      ? (0).toString()
      : format(
          trove.collaterals[item.address]
            .mul(10 ** (18 - item.underlyingDecimals))
            .div(receiptPerUnderlyingRatios[item.address])
        );
  };
  return (
    <>
      <AddCollateralTypeModal
        isOpen={isAddCollateralTypeOpen}
        onClose={onAddCollateralTypeClose}
        show={show}
        setShow={setShow}
        availableCollateral={availableCollateral}
        borrowMode={borrowMode}
      />
      <LeverUpModal
        isOpen={isLeverUpOpen}
        onClose={onLeverUpClose}
        collateral={leveredToken}
        type={borrowMode}
        values={values}
        setLeverSave={setLeverSave}
        depositFees={depositFees}
      />
      <Box {...props}>
        <Text textStyle="title4" color="white" px={6}>
          {trove.status === "open" ? "Adjust" : "Add"} Collateral
        </Text>
        {Object.values(show).some(_ => _) ? (
          <TokenTable
            headers={
              borrowMode !== "normal"
                ? [
                    "Token",
                    "Safety Ratio",
                    "Deposit Fee",
                    "APY",
                    "Actions",
                    "Adjusted Trove Amount",
                    "Lever Up"
                  ]
                : ["Token", "Safety Ratio", "Deposit Fee", "APY", "Actions", "Adjusted Trove Amount"]
            }
            tooltips={
              borrowMode !== "normal"
                ? [
                    "Name",
                    "Weighting for risk adjusted value",
                    "Deposit fees on deposited collaterals value are added to your YUSD debt amount.",
                    "Estimated Annual Percentage Yield, including auto-compounding fees. Currently updated daily for AAVE tokens. (live update coming in the next 2 days)",
                    "Deposit to add collateral to your trove. Withdraw to remove.",
                    "Final amount of the collateral after adjustments",
                    "Lever Up"
                  ]
                : [
                    "Name",
                    "Weighting for risk adjusted value",
                    "Deposit fees on deposited collaterals value are added to your YUSD debt amount.",
                    "Estimated Annual Percentage Yield, including auto-compounding fees. Currently updated daily for AAVE tokens. (live update coming in the next 2 days)",
                    "Deposit to add collateral to your trove. Withdraw to remove.",
                    "Final amount of the collateral after adjustments"
                  ]
            }
            width={borrowMode !== "normal" ? 7 : 6}
            borrow
          >
            <>
              {currentCollateral
                .filter(token => {
                  if (borrowMode === "unlever") {
                    if (token.troveBalance === 0) {
                      return false;
                    } else {
                      return true;
                    }
                  }
                  return true;
                })
                .map(item => (
                  <Tr key={item.token}>
                    <Td pt={8} pb={2}>
                      <Flex align="center" w={28}>
                        <Icon iconName={item.token} h={5} w={5} />
                        <Text ml={3} whiteSpace="pre-wrap">
                          {item.token + " "}
                          {
                            <Tooltip>
                              {item.tokenTooltip !== "" && item.tokenTooltip} $
                              {getNum(
                                format(total.collaterals[item.address].mul(prices[item.address])),
                                2
                              )}{" "}
                              System Deposits
                            </Tooltip>
                          }
                        </Text>
                      </Flex>
                    </Td>
                    <Td pt={8} pb={2} pl={2}>
                      {format(safetyRatios[item.address]).toFixed(3)}{" "}
                      <Tooltip>
                        {"Effective Minimum Collateral Ratio: " +
                          ((1.1 / format(safetyRatios[item.address])) * 100).toFixed(2) +
                          "%"}
                      </Tooltip>
                    </Td>
                    <Td pt={8} pb={2} pl={2}>
                      <Text whiteSpace="nowrap">
                        {(newFormat(depositFees[item.address]) * 100).toFixed(3)}%{" "}
                        {item.feeTooltip !== "" && <Tooltip>{item.feeTooltip}</Tooltip>}
                      </Text>
                    </Td>

                    <Td pt={8} pb={2} pl={2}>
                      <Text whiteSpace="nowrap">
                        {(APYs[item.token] === undefined || APYs[item.token] === null) &&
                        item.apr !== undefined
                          ? item.apr.toFixed(2) + "%"
                          : APYs[item.token] !== 0
                          ? (APYs[item.token] * 100).toFixed(2) + "%"
                          : "N/A"}
                      </Text>
                    </Td>
                    <Td pt={2} pb={2} pl={2}>
                      <Flex direction="column">
                        <Text textStyle="body2" fontWeight="bold" mb={1}>
                          Balance: {getNum(item.walletBalance)}
                        </Text>
                        <AdjustInput
                          name={item.token}
                          iconStatus={mode}
                          setIconStatus={setMode}
                          token={item.token}
                          id="testId"
                          max={getMax(item)}
                          min={0}
                          inputWidth={12}
                          size="sm"
                          showIcons
                          values={checker(values)}
                          borrowMode={borrowMode}
                          isDeprecated={item.isDeprecated != undefined ? item.isDeprecated : false}
                        />
                      </Flex>
                    </Td>
                    <Td pt={8} pb={2} pl={2}>
                      {getNum(
                        getTroveUnderlyingValueWithLever(
                          mode[item.token],
                          item,
                          values,
                          borrowMode,
                          underlyingPerReceiptRatios[item.address]
                        )
                      )}
                    </Td>
                    {borrowMode !== "normal" ? showLeverModal(item) : <></>}
                  </Tr>
                ))}
            </>
            <Tr key="total-usd">
              <Td pt={4} pb={0} />
              <Td pt={4} pb={0} />
              <Td pt={4} pb={0} />
              <Td pt={4} pb={0} />
              <Td pt={4} pb={0}>
                <Text textStyle="subtitle2" textAlign="right">
                  Trove Collateral Dollar Value:
                </Text>
              </Td>
              <Td pt={4} pb={0} pl={2}>
                $
                {getNum(
                  currentCollateral
                    .map(
                      item =>
                        getTroveVaultValueWithLever(
                          mode[item.token],
                          item,
                          values,
                          borrowMode,
                          receiptPerUnderlyingRatios[item.address]
                        ) * format(prices[item.address])
                    )
                    .reduce((a, b) => a + b, 0)
                )}
              </Td>
            </Tr>
          </TokenTable>
        ) : (
          <Text textStyle="body1" px={6} my={4}>
            Add some collateral to start creating your trove!
          </Text>
        )}
        <Button
          colorScheme="brand"
          variant="primary"
          _active={{ bg: "transparent" }}
          mt={2}
          mx={6}
          leftIcon={<Icon iconName="BlueAddIcon" />}
          onClick={onAddCollateralTypeOpen}
        >
          Add Collateral Type
        </Button>
        <Button
          colorScheme="brand"
          variant="primary"
          _active={{ bg: "transparent" }}
          mt={2}
          onClick={form.reset}
        >
          Clear All
        </Button>
      </Box>
    </>
  );
};

export default AdjustCollateral;
