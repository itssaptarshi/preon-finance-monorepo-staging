// @ts-nocheck
import React, { useEffect, useState } from "react";
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
import Tooltip from "../../components/Tooltip";
import ConfirmVEStakeModal from "./ConfirmVEStakeModal";
import { Decimal, LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { capitalizeFirstLetter } from "../../Utils/string";
import { adjustValue, newWeeklyAPR, getNum, format, formatWithDecimals } from "../../Utils/number";
import { validateDeposit } from "../../Utils/validation";
import { Form } from "react-final-form";
import { useLiquity } from "../../hooks/LiquityContext";
import { getNewEstimatedWeeklyRewardsAmount } from "./veStakeCard.utils";

export type VEStakeCardProps = {
  disconnected?: boolean;
};

const selector = ({ yetiBalance, veYETIStaked, YETIPrice }: LiquityStoreState) => ({
  yetiBalance,
  veYETIStaked,
  YETIPrice
});

const calculateAPR = (totalStakedYETI: Decimal, totalSYETISupply: Decimal): number => {
  return format(totalSYETISupply) / format(totalStakedYETI);
};

var dataSelector = useLiquitySelector;

const VEStakeCard: React.FC<VEStakeCardProps> = ({ disconnected = false }) => {
  let yetiStake, yetiBalance, yetiStaked: number, yetiAPR: number;
  let userYetiBalance: any;
  let maxStake: string = "";
  let maxStakeLPBoost: string = "";
  let yetiPrice: number;
  let totalProvided: Decimal = Decimal.ZERO;
  let totalYeti: Decimal = Decimal.ZERO;
  let rewardRate: number = 0;
  let accumulationRate: number = 0;
  let AmountStakedUnallocated: number,
    veYetiOnUnallocated: number,
    WeeklyveYetiGrowthUnallocated: number,
    AmountStakedLP: number,
    veYetiOnLp: number,
    WeeklyveYetiGrowthLP: number;
  const { liquity } = useLiquity();
  if (!disconnected) {
    const { yetiBalance, veYETIStaked, YETIPrice } = dataSelector(selector);
    console.log(veYETIStaked);
    // veYETIStaked.
    totalYeti = veYETIStaked.totalYeti;
    maxStake = String(veYETIStaked.yetiStake);
    maxStakeLPBoost = String(veYETIStaked.yetiStakeOnFarm);
    userYetiBalance = format(yetiBalance);
    yetiStaked = format(veYETIStaked.yetiStake);
    yetiPrice = format(YETIPrice);
    accumulationRate = format(veYETIStaked.accumulationRate);
    yetiAPR = 1.125; // calculateAPR(totalStakedYETI, totalSYETISupply);
    AmountStakedUnallocated = format(veYETIStaked.yetiStake);
    veYetiOnUnallocated = formatWithDecimals(veYETIStaked.veYETIGain, 36);
    WeeklyveYetiGrowthUnallocated = AmountStakedUnallocated * 604800 * accumulationRate;
    AmountStakedLP = format(veYETIStaked.yetiStakeOnFarm);
    veYetiOnLp = formatWithDecimals(veYETIStaked.veYetiOnFarm, 36);
    WeeklyveYetiGrowthLP = format(AmountStakedLP * 604800 * accumulationRate);
  } else {
    userYetiBalance = 1000;
    yetiStaked = 0;
    yetiAPR = 1.125;
  }

  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();
  const toast = useToast();

  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");

  const validate = (valueChange: number) => {
    validateDeposit(
      toast,
      mode,
      userYetiBalance,
      fromUnallocated ? yetiStaked : AmountStakedLP,
      valueChange,
      onConfirmOpen
    );
  };

  const [fromUnallocated, setFromUnallocated] = useState(false);

  const [reward, setReward] = useState<Decimal>(Decimal.from(0));
  useEffect(() => {
    liquity.getEstimatedVeYetiRewards(format(totalYeti), 604800).then(num => setReward(num));
  }, [totalYeti]);

  return (
    <>
      <Box layerStyle="card" flex={1}>
        <Text textStyle="title3" mb={2}>
          Stake veYETI{" "}
          {
            <Tooltip>
              veYETI can now be utilized to boost your Curve LP rewards, with more utilities coming
              soon, including getting access to highly anticipated new strategies, and getting
              reduced fees on Yeti Finance. Start accruing to get a head start!{" "}
            </Tooltip>
          }
        </Text>
        <Text textStyle="body1" fontWeight="bold" mb={2}>
          {getNum(format(totalYeti), 2)} YETI Staked.
        </Text>

        <Toggle
          options={[
            { value: "Stake", key: "deposit" },
            { value: "Unstake Unallocated", key: "withdrawUnallocated" },
            { value: "Unstake LP Boost", key: "withdrawLPBoost" }
          ]}
          size="md"
          onChange={v => {
            const m = v.includes("withdraw") ? "withdraw" : "deposit";
            if (v === "withdrawUnallocated") {
              setFromUnallocated(true);
            } else {
              setFromUnallocated(false);
            }

            setMode(m as "deposit" | "withdraw");
          }}
        />
        <Form
          onSubmit={() => {}}
          render={({ values }) => (
            <>
              {!disconnected && (
                <ConfirmVEStakeModal
                  isOpen={isConfirmOpen}
                  onClose={onConfirmClose}
                  mode={mode}
                  amount={values.vestakeInput || "0"}
                  total={adjustValue(mode, yetiStaked, values.vestakeInput)}
                  values={values}
                  name="vestakeInput"
                  fromUnallocated={fromUnallocated}
                />
              )}

              {/* {!disconnected && (
                <Warning
                  isOpen={isConfirmOpen}
                  onClose={onConfirmClose}
                  mode={mode}
                  amount={values.vestakeInput || "0"}
                  total={adjustValue(mode, yetiStaked, values.vestakeInput)}
                />
              )} */}
              <AdjustInput
                mt={4}
                max={
                  mode === "deposit" ? userYetiBalance : fromUnallocated ? maxStake : maxStakeLPBoost
                }
                name="vestakeInput"
                token="YETI"
                showToken
                fillContainer
              />
              {mode === "deposit" ? (
                <Text textStyle="body1" fontWeight="bold" mt={1.5}>
                  Wallet Balance: {getNum(userYetiBalance)} YETI
                </Text>
              ) : (
                <Text textStyle="body1" fontWeight="bold" mt={1.5}>
                  Staked Balance: {fromUnallocated ? getNum(yetiStaked) : getNum(AmountStakedLP)}{" "}
                  YETI
                </Text>
              )}
              <Box>
                <Flex mt={4}>
                  <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                    {"New Staked Amount"}
                  </Text>
                  <Spacer />
                  <CoinAmount
                    token="YETI"
                    amount={adjustValue(
                      mode,
                      mode === "deposit"
                        ? yetiStaked + AmountStakedLP
                        : fromUnallocated
                        ? yetiStaked
                        : AmountStakedLP,
                      values.vestakeInput
                    )}
                    textStyle="subtitle1"
                    color="white"
                  />
                </Flex>
                <Flex mt={4}>
                  <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                    {"New Estimated Weekly veYETI "}
                    <Tooltip>
                      Estimated amount of rewards you will receive in a week based on your deposit
                    </Tooltip>
                  </Text>
                  <Spacer />
                  <CoinAmount
                    token="veYETI"
                    amount={
                      adjustValue(
                        mode,
                        mode === "deposit"
                          ? yetiStaked + AmountStakedLP
                          : fromUnallocated
                          ? yetiStaked
                          : AmountStakedLP,
                        values.vestakeInput
                      ) *
                      accumulationRate *
                      604800
                    }
                    textStyle="subtitle1"
                    color="green.400"
                    noCurrencyConvert={true}
                  />
                </Flex>
                <Flex mt={4}>
                  <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                    {"New Estimated Weekly YETI "}
                    <Tooltip>
                      Estimated amount of rewards you will receive in a week based on your deposit
                    </Tooltip>
                  </Text>
                  <Spacer />
                  <CoinAmount
                    token="YETI"
                    //getNewEstimatedWeeklyRewardsAmount(valueInput:number|undefined, yetiStaked:number, reward:number, isStake:boolean, totalYeti:number): number {
                    amount={getNewEstimatedWeeklyRewardsAmount(
                      +values.vestakeInput,
                      mode === "deposit"
                        ? yetiStaked + AmountStakedLP
                        : fromUnallocated
                        ? yetiStaked
                        : AmountStakedLP,
                      format(reward),
                      mode == "deposit",
                      format(totalYeti)
                    )}
                    textStyle="subtitle1"
                    color="green.400"
                    noCurrencyConvert={true}
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
                    {(((+String(reward) * 52 * 2) / format(totalYeti)) * 100).toFixed(3)}
                    {/* {isNaN(+values.stakeInput) && 
                      (((+String(reward) * 52) / (lpStaked)) * 100).toFixed(3)} */}
                    %
                  </Text>
                </Tag>
              </Flex>

              {/* <Flex mt={4}>
                <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                  {"veYETI Growth Rate "}
                  <Tooltip>Estimated amount of rewards you will receive in a week based on your deposit</Tooltip>
                </Text>
                <Spacer />
                <Tag bgColor="secondary.400">
                  <Text textStyle="subtitle1">{(yetiAPR * 100).toFixed(3)}%</Text>
                </Tag>
              </Flex> */}
              {!disconnected && mode === "withdraw" && fromUnallocated && (
                <Flex mt={8} justify="flex-end">
                  <Button
                    colorScheme="brand"
                    onClick={() => {
                      validate(values.vestakeInput);
                    }}
                  >
                    {"Unstake from Unallocated"}
                  </Button>
                </Flex>
              )}
              {!disconnected && !fromUnallocated && (
                <Flex mt={8} justify="flex-end">
                  <Button
                    colorScheme="brand"
                    onClick={() => {
                      validate(values.vestakeInput);
                    }}
                  >
                    {mode == "deposit" ? "Stake for LP Boost" : "Unstake from LP Boost"}
                  </Button>
                </Flex>
              )}
            </>
          )}
        />
      </Box>
    </>
  );
};

export default VEStakeCard;
// function useLiquity(): { liquity: any; } {
//   throw new Error("Function not implemented.");
// }
