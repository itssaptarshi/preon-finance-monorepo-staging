// @ts-nocheck
// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Divider,
  Flex,
  Spacer,
  Tag,
  Text,
  useDisclosure,
  useToast,
  UseToastOptions
} from "@chakra-ui/react";
import { Toggle, AdjustInput, CoinAmount } from "../../components";
import Tooltip from "../../components/Tooltip";
import ConfirmStakeModal from "./ConfirmStakeModal";
import { Decimal, LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { adjustValue, newWeeklyAPR, getNum, format } from "../../Utils/number";
import { validateDeposit } from "../../Utils/validation";
import { Form } from "react-final-form";
import { useLiquity } from "../../hooks/LiquityContext";
import { TransactionProgressDonut } from "../../components/Transaction";

export type FarmCardProps = {
  disconnected?: boolean;
};

const selector = ({ farm, lpTokenBalance, YETIPrice }: LiquityStoreState) => ({
  farm,
  lpTokenBalance,
  YETIPrice
});

var dataSelector = useLiquitySelector;

const FarmCard: React.FC<FarmCardProps> = ({ disconnected = false }) => {
  let lpStaked: number,
    yetiAPR: number,
    yetiPrice: number,
    totalLPStaked: number,
    rewardRate: number;
  const { farm } = dataSelector(selector);
  const { lpTokenBalance, YETIPrice } = dataSelector(selector);

  const { liquity } = useLiquity();
  if (!disconnected) {
    yetiPrice = format(YETIPrice);
    lpStaked = format(farm.lpTokenBalance);
    totalLPStaked = format(farm.totalLPStaked);
    rewardRate = 0;
  } else {
    totalLPStaked = 0;
    lpStaked = 0;
  }

  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();

  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");

  const validate = (valueChange: number) => {
    validateDeposit(toast, mode, format(lpTokenBalance), lpStaked, valueChange, onConfirmOpen);
  };

  const [value, setValue] = useState<Record<string, any>>({});
  const [reward, setReward] = useState<Decimal>(Decimal.from(0));

  const [showError, setShowError] = useState<boolean>(false);
  // const [weeklyReward, setWeeklyReward] = useState<Decimal>(Decimal.from(0));
  // const [weeklyRewardWithdraw, setWeeklyRewardWithdraw] = useState<Decimal>(Decimal.from(0));
  // // if (reward.eq(Decimal.from))
  // useEffect(() => {
  //   if (!isNaN(value.stakeInput) && mode == "deposit") {
  //     liquity
  //       .getEstimatedFarmRewards(+value.stakeInput + lpStaked, 604800)
  //       .then(num => setWeeklyReward(num));
  //   } else if (!isNaN(value.stakeInput) && +value.stakeInput <= lpStaked && mode == "withdraw") {
  //     console.log('mode', mode)
  //     liquity
  //       .getEstimatedFarmRewards(lpStaked - +value.stakeInput, 604800)
  //       .then(num => setWeeklyRewardWithdraw(num));
  //     console.log('hit', weeklyReward)
  //   }
  // }, [value.stakeInput, lpTokenBalance, totalLPStaked, mode]);

  // useEffect(() => {
  //   liquity
  //       .getEstimatedFarmRewards(totalLPStaked, 604800)
  //       .then(num => setReward(num));
  // }, [value.stakeInput, lpTokenBalance, totalLPStaked]);

  useEffect(() => {
    if (!isConfirmOpen) {
      setShowError(false);
    } else if (mode === "deposit") {
      setShowError(true);
    }
  }, [isConfirmOpen]);

  const toastProps: UseToastOptions = {
    status: "error",
    duration: 4000,
    isClosable: true,
    position: "top-right"
  };
  const toast = useToast();

  const onSubmit = (values: any): void => {
    if (mode !== "deposit") {
      validate(values.stakeInput);
    } else {
      toast({
        title: "Error",
        description:
          "Emissions on this LP Farm have been turned off. Please stake in new Curve LP Farm for YETI reward emissions.",
        ...toastProps
      });
    }
  };

  return (
    <>
      <Box layerStyle="card" flex={1}>
        <Text textStyle="title3" mb={2}>
          Old Curve LP Farm{" "}
          <Tooltip>
            Emissions on this farm will be off as of May 9th. Unstake your LP and transfer to the new
            farm above, which includes boosted yields based on veYETI
          </Tooltip>
        </Text>
        <Text textStyle="body1" fontWeight="bold" mb={2}>
          ${getNum(format(farm.totalLPStaked), 2)} Staked in Old Curve LP Farm
        </Text>
        <Toggle
          options={[
            { value: "Stake", key: "deposit" },
            { value: "Unstake", key: "withdraw" }
          ]}
          size="md"
          onChange={v => setMode(v as "deposit" | "withdraw")}
        />
        <Form
          onSubmit={() => {}}
          render={({ values }) => (
            <>
              {setValue(values)}
              {!disconnected && (
                <ConfirmStakeModal
                  isOpen={isConfirmOpen}
                  onClose={onConfirmClose}
                  mode={mode}
                  amount={values.stakeInput || "0"}
                  total={adjustValue(mode, lpStaked, values.stakeInput)}
                  values={values}
                  name="stakeInput"
                  isOldFarm={true}
                />
              )}

              <AdjustInput
                mt={4}
                max={mode === "deposit" ? format(lpTokenBalance) : lpStaked}
                name="stakeInput"
                token="CLP"
                showToken
                fillContainer
                noCurrencyConvert={true}
              />
              {mode === "deposit" ? (
                <Text textStyle="body1" fontWeight="bold" mt={1.5}>
                  Wallet Balance: {getNum(format(lpTokenBalance), 4)} Curve LP Tokens
                </Text>
              ) : (
                <Text textStyle="body1" fontWeight="bold" mt={1.5}>
                  Staked Balance: {getNum(lpStaked)} Curve LP Tokens
                </Text>
              )}
              <Box>
                <Flex mt={4}>
                  <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                    {"New Staked Amount"}
                  </Text>
                  <Spacer />
                  <CoinAmount
                    token="Curve LP Tokens"
                    amount={adjustValue(mode, lpStaked, values.stakeInput)}
                    textStyle="subtitle1"
                    color="white"
                    noCurrencyConvert={true}
                  />
                </Flex>
                <Flex mt={4}>
                  <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                    {"New Estimated Weekly Rewards "}
                  </Text>
                  <Spacer />
                  <CoinAmount
                    token="YETI"
                    amount={
                      !+values.stakeInput && lpStaked === 0
                        ? 0
                        : (rewardRate * 604800 * adjustValue(mode, lpStaked, values.stakeInput)) /
                          adjustValue(mode, totalLPStaked, values.stakeInput)
                    }
                    textStyle="subtitle1"
                    color="green.400"
                  />
                </Flex>
              </Box>
              <Divider color="brand.600" mt={4} />

              <Flex mt={4}>
                <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                  {"YETI Reward APR "}
                </Text>
                <Spacer />

                <Tag bgColor="secondary.400">
                  {/* {console.log("outputs2", +String(reward), yetiPrice, totalLPStaked)} */}
                  <Text textStyle="subtitle1">
                    {(((+String(reward) * 52 * 2 * yetiPrice) / totalLPStaked) * 100).toFixed(3)}
                    {/* {isNaN(+values.stakeInput) && 
                      (((+String(reward) * 52) / (lpStaked)) * 100).toFixed(3)} */}
                    %
                  </Text>
                </Tag>
              </Flex>
              {!disconnected && (
                <Flex mt={4} justify="flex-end">
                  <Button colorScheme="brand" onClick={() => onSubmit(values)}>
                    {mode == "deposit" ? "Stake" : "Unstake"}
                  </Button>
                </Flex>
              )}
            </>
          )}
        />
      </Box>
      {showError ? (
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
              <Text textStyle="subtitle1">
                Old Farm no longer has YETI emission. Check out the Boosted LP Farm!
              </Text>
            </Flex>
          </Box>
        </Flex>
      ) : null}
    </>
  );
};

export default FarmCard;
