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
  useToast
} from "@chakra-ui/react";
import { Toggle, AdjustInput, CoinAmount } from "../../components";
import ConfirmDepositModal from "./ConfirmDepositModal";
import { LiquityStoreState, Decimal } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { useLiquity } from "../../hooks/LiquityContext";
import { validateDeposit } from "../../Utils/validation";
import {
  adjustValue,
  newWeeklyAPR,
  format,
  addString,
  subtractString,
  getNum
} from "../../Utils/number";
import { capitalizeFirstLetter } from "../../Utils/string";
import { Form } from "react-final-form";
import Tooltip from "../../components/Tooltip";

export type PoolCardProps = {
  disconnected?: boolean;
};

const selector = ({
  stabilityDeposit,
  yusdBalance,
  yusdInStabilityPool,
  remainingStabilityPoolYETIReward,
  YETIPrice,
  poolRewardRate,
  YUSDPrice
}: LiquityStoreState) => ({
  stabilityDeposit,
  yusdBalance,
  yusdInStabilityPool,
  remainingStabilityPoolYETIReward,
  YETIPrice,
  poolRewardRate,
  YUSDPrice
});

var dataSelector = useLiquitySelector;

const calculateAPR = (
  yusdInStabilityPool: Decimal,
  remainingStabilityPoolYETIReward: Decimal,
  YETIPrice: Decimal
): number => {
  const yearlyHalvingSchedule = 0.5;
  const remainingYetiOneYear = remainingStabilityPoolYETIReward.mul(yearlyHalvingSchedule);
  // remainingYetiOneYear * underlyingPrices of Yeti
  const remainingYetiOneYearInUSD = remainingYetiOneYear.mul(YETIPrice).div(Decimal.ONE);
  const aprPercentage = remainingYetiOneYearInUSD.div(yusdInStabilityPool).mul(100);

  return parseFloat(aprPercentage.toString());
};

const PoolCard: React.FC<PoolCardProps> = ({ disconnected = false }) => {
  let yetiAPR: number,
    userBalance: any,
    poolDeposit: number,
    yetiPrice: number,
    totalYUSDDeposits: number,
    rewardRate: number;
  const { liquity } = useLiquity();
  const { stabilityDeposit, YUSDPrice } = dataSelector(selector);
  const [userYUSDBalance, setUserYUSDBalance] = useState<Number>(0);
  const { yusdBalance, poolRewardRate } = dataSelector(selector);
  if (disconnected) {
    userBalance = 1000;
    poolDeposit = 0;
    yetiAPR = 0;
    totalYUSDDeposits = 0;
  } else {
    const { yusdInStabilityPool, remainingStabilityPoolYETIReward, YETIPrice } = dataSelector(
      selector
    );
    userBalance = userYUSDBalance;
    poolDeposit = format(stabilityDeposit.currentYUSD);
    yetiPrice = format(YETIPrice);
    totalYUSDDeposits = format(yusdInStabilityPool);
    yetiAPR = calculateAPR(yusdInStabilityPool, remainingStabilityPoolYETIReward, YETIPrice);
    rewardRate = format(poolRewardRate);
  }

  const [value, setValue] = useState<any>({});
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();
  const toast = useToast();

  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");

  const validate = (valueChange: number) => {
    validateDeposit(toast, mode, userBalance, poolDeposit, valueChange, onConfirmOpen);
  };

  const notNegative = (mode: "deposit" | "withdraw", initialValue: number, valueChange: string) => {
    if (mode === "deposit") {
      return addString(initialValue, valueChange);
    }
    const ans = subtractString(initialValue, valueChange);
    if (ans > 0) {
      return ans;
    }
    return 0;
  };
  const getFormattedValue = (value: string) => {
    if (/^[0-9.]*$/.test(value)) {
      return value;
    }
    return "";
  };
  // console.log(value);
  const [reward, setReward] = useState<Decimal>(Decimal.from(0));
  const [weeklyReward, setWeeklyReward] = useState<Decimal>(Decimal.from(0));
  const [weeklyRewardWithdraw, setWeeklyRewardWithdraw] = useState<Decimal>(Decimal.from(0));
  useEffect(() => {
    liquity.getEstimatedYETIPoolRewards(totalYUSDDeposits, 604800).then(num => setReward(num));
    if (yusdBalance) {
      setUserYUSDBalance(format(yusdBalance));
    }
  }, [value.input, yusdBalance]);

  // useEffect(() => {
  //   if (!isNaN(value.input)) {
  //     liquity
  //     .getEstimatedYETIPoolRewards(value.input + poolDeposit, 604800)
  //     .then(num => setWeeklyReward(num));
  //   } else if (!isNaN(value.input) && +value.input <= poolDeposit && mode == "withdraw") {
  //     liquity
  //       .getEstimatedFarmRewards(poolDeposit - +value.stakeInput, 604800)
  //       .then(num => setWeeklyRewardWithdraw(num));
  //   }
  //   if (yusdBalance) {
  //     setUserYUSDBalance(format(yusdBalance));
  //   }
  // }, [value.input, yusdBalance, mode]);
  return (
    <Box layerStyle="card" flex={1}>
      <Text textStyle="title3" mb={2}>
        Stability Pool{" "}
        {
          <Tooltip>
            You will accrue YETI for staking YUSD in the Stability Pool. In case of liquidations, a
            portion of YUSD from the Stability Pool will be used to offset debt for a portion of the
            collateral as reward. When liquidations occur, your YUSD amount staked will decrease
            slightly but you will then have claimable collateral which you can take as reward. The
            claimable collateral is typically ~10% greater in value than your decrease in YUSD in the
            Stability Pool.
          </Tooltip>
        }
      </Text>

      <Text textStyle="body1" fontWeight="bold" mb={2}>
        ${getNum(totalYUSDDeposits * format(YUSDPrice), 2)} Staked in Stability Pool
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
              <ConfirmDepositModal
                isOpen={isConfirmOpen}
                onClose={onConfirmClose}
                mode={mode}
                amount={values.input || 0}
                total={adjustValue(mode, poolDeposit, values.input)}
                values={values}
                name="input"
              />
            )}
            <AdjustInput
              mt={4}
              max={mode === "deposit" ? userBalance : poolDeposit}
              name="input"
              token="YUSD"
              showToken
              fillContainer
            />
            {mode === "deposit" ? (
              <Text textStyle="body1" fontWeight="bold" mt={1.5}>
                Wallet Balance: {getNum(userBalance)} YUSD
              </Text>
            ) : (
              <Text textStyle="body1" fontWeight="bold" mt={1.5}>
                Pool Balance: {getNum(poolDeposit)} YUSD
              </Text>
            )}
            <Box>
              <Flex mt={4}>
                <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                  New Total Deposit
                </Text>
                <Spacer />
                <CoinAmount
                  token="YUSD"
                  amount={adjustValue(mode, poolDeposit, values.input)}
                  textStyle="subtitle1"
                  color="white"
                />
              </Flex>
              <Flex mt={4}>
                <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                  New Estimated Weekly Rewards
                </Text>
                <Spacer />
                {/* <CoinAmount
                  token="YETI"
                  amount={newWeeklyAPR(mode, poolDeposit, values.input, yetiAPR)}
                  textStyle="subtitle1"
                  color="green.400"
                /> */}
                <CoinAmount
                  token="YETI"
                  amount={
                    !+values.input || +value.input > poolDeposit
                      ? 0
                      : mode == "withdraw"
                      ? (rewardRate * 604800 * (poolDeposit - +value.input)) /
                        (totalYUSDDeposits - +value.input)
                      : (rewardRate * 604800 * (poolDeposit + +value.input)) /
                        (totalYUSDDeposits + +value.input)
                  }
                  textStyle="subtitle1"
                  color="green.400"
                />
              </Flex>
            </Box>

            <Divider color="brand.600" mt={4} />

            {/* Yeti Reward APR */}
            <Flex mt={4}>
              <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                YETI Reward APR
              </Text>
              <Spacer />
              <Tag bgColor="secondary.400">
                <Text textStyle="subtitle1" mr={[5, 0]}>
                  {/* {console.log("outputs", +String(reward), yetiPrice, totalYUSDDeposits)}
                  {console.log("apr", ((((+String(reward) * 52) * yetiPrice) / totalYUSDDeposits) * 100).toFixed(3))} */}
                  {(((+String(reward) * 52 * yetiPrice) / totalYUSDDeposits) * 100).toFixed(3)}%
                </Text>
              </Tag>
            </Flex>

            {/* Deposit or Withdraw Button */}
            {!disconnected && (
              <Flex mt={4} justify="flex-end">
                <Button colorScheme="brand" onClick={() => validate(values.input)}>
                  {mode == "deposit" ? "Stake" : "Unstake"}
                </Button>
              </Flex>
            )}
          </>
        )}
      />
    </Box>
  );
};

export default PoolCard;
