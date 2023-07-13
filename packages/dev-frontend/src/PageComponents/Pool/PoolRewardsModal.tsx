// @ts-nocheck
import React, { useState } from "react";
import {
  Tr,
  Td,
  Flex,
  Text,
  Button,
  VStack,
  Box,
  HStack,
  NumberInput,
  NumberInputField
} from "@chakra-ui/react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay
} from "@chakra-ui/modal";
import { useTransactionFunction } from "../../components/Transaction";
import { TokenTable, CoinAmount, Icon } from "../../components";
import { LiquityStoreState, TroveMappings, Decimal } from "@liquity/lib-base";
import { useLiquity } from "../../hooks/LiquityContext";
import { format, getNum } from "../../Utils/number";
import tokenData, { tokenDataMappingA } from "../../TokenData";

import { useLiquitySelector } from "@liquity/lib-react";

import Tooltip from "../../components/Tooltip";
import { TokenData } from "../../../Types";
import { SendableEthersLiquity } from "@liquity/lib-ethers";
import { useEffect } from "react";
import PoolSwap from "./PoolSwap";

const selector = ({
  stabilityDeposit,
  underlyingPrices,
  underlyingPerReceiptRatios,
  prices
}: LiquityStoreState) => ({
  stabilityDeposit,
  underlyingPrices,
  underlyingPerReceiptRatios,
  prices
});

export type PoolRewardsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  rewards: TroveMappings;
  notStability: boolean;
  mode?: string;
  isOldFarm?: boolean;
};

const PoolRewardsModal: React.FC<PoolRewardsModalProps> = ({
  isOpen,
  onClose,
  rewards,
  notStability,
  mode,
  isOldFarm
}) => {
  const { liquity, account } = useLiquity();

  const [sendTransaction] = useTransactionFunction(
    "stability-deposit",
    liquity.send.withdrawGainsFromStabilityPool.bind(liquity.send)
  );

  const [sendTransaction2] = useTransactionFunction(
    "lpFarm",
    liquity.send.getFarmRewards.bind(liquity.send)
  );

  const [getOldLPFarmRewards] = useTransactionFunction(
    "OldLpFarm",
    liquity.send.getOldFarmRewards.bind(liquity.send)
  );

  const [sendTransaction3] = useTransactionFunction(
    "yetiFarm",
    liquity.send.getVeYetiStakeReward.bind(liquity.send)
  );

  var dataSelector = useLiquitySelector;
  const { stabilityDeposit, underlyingPrices, underlyingPerReceiptRatios, prices } = dataSelector(
    selector
  );
  let rewardTokens: TokenData[] = [];
  let claimableCollaterals: TokenData[] = [];
  if (!notStability) {
    claimableCollaterals = tokenData.filter(({ address }) =>
      rewards[address] == undefined ? Decimal.from(0) : !rewards[address].eq(Decimal.from(0))
    );
    if (stabilityDeposit.yetiReward.gt(Decimal.from(0))) {
      rewardTokens[Object.keys(rewards).length + 1] = {
        address: "0x",
        token: "YETI",
        troveBalance: 0,
        walletBalance: format(stabilityDeposit.yetiReward),
        isStable: false,
        apr: 0,
        isVault: false,
        underlying: "",
        underlyingDecimals: 18,
        tokenTooltip: "",
        feeTooltip: ""
      };
    }
  } else {
    if (format(Object.values(rewards)[0]) > 0) {
      rewardTokens = [
        {
          address: "0x",
          token: "YETI",
          troveBalance: 0,
          walletBalance: format(Object.values(rewards)[0]),
          isStable: false,
          apr: 0,
          isVault: false,
          underlying: "",
          underlyingDecimals: 18,
          tokenTooltip: "",
          feeTooltip: ""
        }
      ];
    }
  }

  const onSubmit = (): void => {
    if (mode === "LP") {
      if (isOldFarm) {
        getOldLPFarmRewards();
      } else {
        sendTransaction2();
      }
    } else if (mode === "YETI") {
      sendTransaction3();
    } else {
      sendTransaction();
    }
    onClose();
  };

  const autoCompound = (customValue: string, slippage: number): number => {
    if (customValue === "X" || customValue === "0.4999") {
      return slippage / 100;
    } else {
      return +customValue / 100;
    }
  };

  const dollarValue = (): number => {
    let dollarAmount: number = 0;
    let converter: number = 1;
    rewardTokens.map(({ address, token, walletBalance }) => {
      if (format(rewards[address]) !== 0 && token !== "YETI") {
        converter = format(prices[address]);
        dollarAmount += converter * format(rewards[address]);
      }
    });
    return dollarAmount;
  };

  const formatSlippage = (val: string) => val + "%";
  const parse = (val: string) => val.replace("[a-zA-zs]", "");
  const [customValue, setCustomValue] = useState<string>("X");
  const [slippage, setSlippage] = useState<number>(2);
  const [button1, setButton1] = React.useState(false);
  const [button2, setButton2] = React.useState(false);
  const [button3, setButton3] = React.useState(false);
  const [button4, setButton4] = React.useState(false);

  if (!button1 && !button2 && !button3 && !button4 && customValue === "X") {
    if (slippage == 1) {
      setButton1(true);
    } else if (slippage == 2) {
      setButton2(true);
    } else if (slippage == 3) {
      setButton3(true);
    } else if (slippage == 5) {
      setButton4(true);
    } else {
      setCustomValue(String(slippage));
    }
  }

  const buttonOnClick = (
    button: boolean,
    setButtonFunc: React.Dispatch<React.SetStateAction<boolean>>,
    slippageInput: number
  ) => {
    setButton1(false);
    setButton2(false);
    setButton3(false);
    setButton4(false);
    setCustomValue("X");
    setButtonFunc(true);
    setSlippage(slippageInput);
  };

  const customOnChange = (newValue: string) => {
    setCustomValue(newValue === "0" ? "0" : parse(newValue));
    setButton1(false);
    setButton2(false);
    setButton3(false);
    setButton4(false);
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="2xl" pb={1}>
          <Text mr={1.5}>
            {!notStability ? "Stability Pool Rewards" : "Claim YETI Rewards"}{" "}
            {!notStability && (
              <Tooltip>
                Obtain collateral rewards from liquidations, and YETI rewards all the time
              </Tooltip>
            )}
          </Text>
        </ModalHeader>

        <ModalBody px={0}>
          {rewardTokens.length !== 0 ? (
            <>
              <Text textStyle="body1" fontSize="lg" pt={4} px={6}>
                Rewards:
              </Text>
              <TokenTable headers={["token", "amount"]} width={5}>
                <>
                  {rewardTokens.map(({ token, address, walletBalance }) => {
                    return (
                      (format(rewards[address]) !== 0 || token === "YETI") && (
                        <Tr key={token}>
                          <Td pb={0} pt={4}>
                            <Flex align="center">
                              <Icon iconName={token} h={5} w={5} />
                              <Text ml={3}>{token}</Text>
                            </Flex>
                          </Td>
                          {[...new Array(3)].map(_ => (
                            <Td pb={0} pt={4} />
                          ))}
                          <Td pb={0} pt={4}>
                            <CoinAmount
                              token={token}
                              amount={
                                token === "YETI"
                                  ? format(walletBalance)
                                  : rewards[address] === undefined
                                  ? 0
                                  : format(
                                      rewards[address]
                                        .mul(underlyingPerReceiptRatios[address])
                                        .mul(
                                          10 ** (18 - tokenDataMappingA[address].underlyingDecimals)
                                        )
                                    )
                              }
                            />
                          </Td>
                        </Tr>
                      )
                    );
                  })}
                </>
              </TokenTable>
            </>
          ) : (
            <Text textStyle="body1" fontSize="lg" pt={4} px={6}>
              No Rewards to Claim
            </Text>
          )}
          {!notStability ? (
            claimableCollaterals.length !== 0 ? (
              <TokenTable headers={["token", "amount"]} width={5}>
                <>
                  {claimableCollaterals.map(({ token, address, walletBalance }) => {
                    return (
                      format(rewards[address]) !== 0 && (
                        <Tr key={token}>
                          <Td pb={0} pt={4}>
                            <Flex align="center">
                              <Icon iconName={token} h={5} w={5} />
                              <Text ml={3}>{token}</Text>
                            </Flex>
                          </Td>
                          {[...new Array(3)].map(_ => (
                            <Td pb={0} pt={4} />
                          ))}
                          <Td pb={0} pt={4}>
                            <CoinAmount
                              token={token}
                              amount={
                                rewards[address] === undefined
                                  ? 0
                                  : format(
                                      rewards[address]
                                        .mul(underlyingPerReceiptRatios[address])
                                        .mul(
                                          10 ** (18 - tokenDataMappingA[address].underlyingDecimals)
                                        )
                                    )
                              }
                            />
                          </Td>
                        </Tr>
                      )
                    );
                  })}
                  {!notStability && dollarValue() !== 0 && (
                    <Tr key={"total"}>
                      <Td pb={0} pt={4}>
                        <Flex align="center">
                          <Icon iconName={"YUSD"} h={5} w={5} />
                          <Text ml={3}>Claimable Collaterals Total Value</Text>
                        </Flex>
                      </Td>
                      {[...new Array(3)].map(_ => (
                        <Td pb={0} pt={4} />
                      ))}
                      <Td pb={0} pt={4}>
                        <CoinAmount token={"YUSD"} amount={dollarValue()} />
                      </Td>
                    </Tr>
                  )}
                </>
              </TokenTable>
            ) : (
              <Text textStyle="body1" fontSize="lg" pt={4} px={6}>
                No Claimable Collaterals
              </Text>
            )
          ) : null}
        </ModalBody>
        {/* {console.log('rewardTokens', rewardTokens)} */}
        <ModalFooter justifyContent={"flex-start"} mt={2}>
          <VStack align="stretch" spacing={6}>
            {/* {rewardTokens.length !== 0 && rewardTokens[0].token !== "YETI" && !notStability && (
              <HStack>
                <PoolSwap
                  slippage={autoCompound(customValue, slippage)}
                  dollarTotal={dollarValue()}
                  close={onClose}
                />
                <Flex direction="column">
                  <Text textStyle="body2" fontWeight="bold">
                    Slippage:{" "}
                    <Tooltip>
                      Specify the maximum slippage (at least 0.5%) you would like to allow for
                      swapping earned collateral back for YUSD.
                    </Tooltip>
                    <HStack
                      marginTop={0.5}
                      spacing={2}
                      h="full"
                      marginBottom={5}
                      alignItems="flex-start"
                    >
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
                        border={customValue !== "X" && Number(customValue) >= 0.499 ? "1px" : "0px"}
                        borderColor="white"
                        bg={
                          customValue !== "X" && Number(customValue) >= 0.499 ? "#227CF6" : "#0051bd"
                        }
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
                          value={customValue === "0.499" ? "X%" : formatSlippage(customValue)}
                          min={0.499}
                          max={100}
                        >
                          <NumberInputField
                            fontWeight={
                              customValue !== "X" && Number(customValue) >= 1 ? "semibold" : "medium"
                            }
                            padding={0}
                            marginLeft={0}
                            border="none"
                            fontSize="14px"
                            paddingBottom={0}
                            textAlign="center"
                            textColor={
                              customValue !== "X" && Number(customValue) >= 1 ? "white" : "gray.300"
                            }
                          />
                        </NumberInput>
                      </Button>
                    </HStack>
                  </Text>
                </Flex>
              </HStack> */}
            {/* )} */}

            {/* {rewardTokens.length !== 0 && rewardTokens[0].token !== "YETI" && !notStability && (
              <Text> Min YUSD Expect to Receive: {getNum(dollarValue() * (1 - autoCompound(customValue, slippage)))}</Text>
            )} */}
            <Box>
              {mode !== "YETI" && mode !== "LP" ? (
                <Button variant="primary" mr={6} onClick={onSubmit}>
                  Claim All Rewards{" "}
                  {
                    <Flex ml={1}>
                      <Tooltip>Claim all YETI and collateral rewards.</Tooltip>
                    </Flex>
                  }
                </Button>
              ) : (
                <Button variant="primary" mr={6} onClick={onSubmit}>
                  Claim YETI{" "}
                </Button>
              )}
              <Button variant="secondary" onClick={onClose}>
                {rewardTokens.length === 0 ? "Close" : "Cancel"}
              </Button>
            </Box>
          </VStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default PoolRewardsModal;
