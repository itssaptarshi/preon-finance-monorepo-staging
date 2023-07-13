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
  SimpleGrid,
  Collapse,
  IconButton
} from "@chakra-ui/react";
import { Toggle, AdjustInput, CoinAmount, Icon } from "../../components";
import Tooltip from "../../components/Tooltip";
import ConfirmStakeModal from "./ConfirmStakeModal";
import BoosterCalculatorModal from "./BoosterCalculatorModal";
import { Decimal, Farm, LiquityStoreState, veYETIStake } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { adjustValue, newWeeklyAPR, getNum, format, formatWithDecimals } from "../../Utils/number";
import { validateDeposit } from "../../Utils/validation";
import { Form } from "react-final-form";
import { useLiquity } from "../../hooks/LiquityContext";
import veYETI from "../../components/Icon/library/veYETI";
import { FarmPoolRewardsInfo, calculateFarmPoolRewards } from "./FarmUtils";

export type BoostFarmCardProps = {
  disconnected?: boolean;
};

const selector = ({ boostedFarm, lpTokenBalance, YETIPrice, veYETIStaked }: LiquityStoreState) => ({
  boostedFarm,
  lpTokenBalance,
  YETIPrice,
  veYETIStaked
});

var dataSelector = useLiquitySelector;

const BoostFarmCard: React.FC<BoostFarmCardProps> = ({ disconnected = false }) => {
  let lpStaked: number, totalLPStaked: number, rewardRate: number;
  const { boostedFarm, veYETIStaked } = dataSelector(selector);
  const { lpTokenBalance, YETIPrice } = dataSelector(selector);
  const [value, setValue] = useState<Record<string, any>>({});

  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();
  const {
    isOpen: isCalculatorOpen,
    onOpen: onCalculatorOpen,
    onClose: onCalculatorClose
  } = useDisclosure();
  const toast = useToast();

  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");

  let farmPoolRewardInfo: FarmPoolRewardsInfo = {
    userBaseRewardShare: 0,
    baseAPR: 0,
    userAnnualBaseReward: 0,
    userBoostedRewardShare: 0,
    boostedAPR: 0,
    userAnnualBoostedReward: 0
  };

  if (!disconnected) {
    const yetiPrice = format(YETIPrice);
    lpStaked = format(boostedFarm.lpTokenBalance);
    totalLPStaked = format(boostedFarm.totalLPStaked);
    rewardRate = format(boostedFarm.rewardRate);
    const adjustAmount =
      value["stakeInput"] !== undefined && mode === "withdraw"
        ? -Number(value["stakeInput"])
        : value["stakeInput"] !== undefined && mode === "deposit"
        ? +value["stakeInput"]
        : undefined;
    farmPoolRewardInfo = calculateFarmPoolRewards(
      veYETIStaked,
      yetiPrice,
      boostedFarm,
      adjustAmount
    );
  } else {
    totalLPStaked = 0;
    lpStaked = 0;
  }

  const validate = (valueChange: number) => {
    validateDeposit(toast, mode, format(lpTokenBalance), lpStaked, valueChange, onConfirmOpen);
  };

  const [show, setShow] = React.useState(true);
  const handleToggle = () => setShow(!show);
  return (
    <>
      <Box layerStyle="card" flex={1}>
        <Flex>
          <Text textStyle="title3" mb={2}>
            New Curve LP Farm{" "}
            <Tooltip>
              New Curve LP Farm will provide boosted yields based on veYETI balances.
            </Tooltip>
          </Text>
          {show ? (
            <IconButton
              aria-label="Expand Stake LP"
              size={"sm"}
              ml={3}
              onClick={handleToggle}
              colorScheme="brand"
              isRound={true}
              icon={<Icon style={{ transform: "rotate(180deg)" }} iconName="CollapseIcon" />}
            />
          ) : (
            <IconButton
              aria-label="Expand Stake LP"
              size={"sm"}
              ml={3}
              onClick={handleToggle}
              colorScheme="brand"
              isRound={true}
              icon={<Icon iconName="CollapseIcon" />}
            />
          )}
        </Flex>
        <Text textStyle="body1" fontWeight="bold" mb={2}>
          ${getNum(format(boostedFarm.totalLPStaked), 2)} Staked in New Curve LP Farm
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
                />
              )}
              {!disconnected && (
                <BoosterCalculatorModal isOpen={isCalculatorOpen} onClose={onCalculatorClose} />
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
                  Wallet Balance: {getNum(format(lpTokenBalance))} Curve LP Tokens
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
                  <Text textStyle="subtitle1" fontWeight="normal" color="brand.300" mr={3}>
                    {"New Total Estimated Weekly Rewards "}
                  </Text>
                  <Spacer />
                  <CoinAmount
                    token="YETI"
                    amount={
                      farmPoolRewardInfo !== undefined
                        ? farmPoolRewardInfo.userAnnualBaseReward / 52.143 +
                          farmPoolRewardInfo.userAnnualBoostedReward / 52.143
                        : 0
                    }
                    textStyle="subtitle1"
                    color="green.400"
                  />
                </Flex>
                <Divider color="brand.600" mt={4} />
                <Flex mt={4}>
                  <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                    {"Total YETI Reward APR "}
                    <Tooltip>Your APR with base and boosted YETI rewards</Tooltip>
                  </Text>

                  <Spacer />

                  <Tag bgColor="secondary.400">
                    <Text textStyle="subtitle1">
                      {getNum(farmPoolRewardInfo.baseAPR + farmPoolRewardInfo.boostedAPR, 3)}%
                    </Text>
                  </Tag>
                </Flex>
                <Flex mt={4}>
                  <Button
                    colorScheme="brand"
                    onClick={() => {
                      onCalculatorOpen();
                    }}
                  >
                    <Text textStyle="subtitle1" fontWeight="normal">
                      Booster Calculator <Icon iconName="calculator" />
                    </Text>
                  </Button>
                </Flex>
                <Collapse in={show}>
                  <>
                    <SimpleGrid columns={3} mb={1} spacingX="30px" spacingY="10px" mt={5}>
                      <Spacer />
                      <Text textStyle="subtitle1" fontWeight="bold">
                        Base
                      </Text>
                      <Text textStyle="subtitle1" fontWeight="bold">
                        Boosted
                      </Text>
                      <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                        New Weekly Est.
                      </Text>
                      <CoinAmount
                        token="YETI"
                        amount={farmPoolRewardInfo.userAnnualBaseReward / 52.143}
                        textStyle="subtitle1"
                        color="white"
                      />
                      <CoinAmount
                        token="YETI"
                        amount={farmPoolRewardInfo.userAnnualBoostedReward / 52.143}
                        textStyle="subtitle1"
                        color="green.400"
                      />
                      <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                        YETI Reward APR
                      </Text>
                      <Text textStyle="subtitle1">
                        {/* {(((+String(reward) * 52) * 2 * yetiPrice) / totalLPStaked * 100).toFixed(3)} */}
                        {getNum(farmPoolRewardInfo.baseAPR, 3)}
                        {/* {isNaN(+values.stakeInput) && 
                            (((+String(reward) * 52) / (lpStaked)) * 100).toFixed(3)} */}
                        %
                      </Text>
                      <Text textStyle="subtitle1" color="green.400">
                        {farmPoolRewardInfo.boostedAPR > 0 && farmPoolRewardInfo.boostedAPR < 0.001
                          ? "< 0.001"
                          : getNum(farmPoolRewardInfo.boostedAPR, 3)}
                        %
                      </Text>
                    </SimpleGrid>
                  </>
                </Collapse>
              </Box>
              {!disconnected && (
                <Flex mt={4} justify="flex-end">
                  <Button colorScheme="brand" onClick={() => validate(values.stakeInput)}>
                    {mode == "deposit" ? "Stake" : "Unstake"}
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

export default BoostFarmCard;
