// @ts-nocheck
// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Button,
  Spacer,
  Text,
  useDisclosure,
  Collapse,
  IconButton
} from "@chakra-ui/react";
import { Icon, CoinAmount } from "../../../components";
import { Decimal, LiquityStoreState, TroveMappings } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { getBalanceInfo, getBalanceInfoCollapsed } from "./YourBalance.utils";
import { newWeeklyAPR, format, formatWithDecimals, getNum } from "../../../Utils/number";
import Tooltip from "../../../components/Tooltip";
import { useLiquity } from "../../../hooks/LiquityContext";
import PoolRewardsModal from "../../Pool/PoolRewardsModal";
import { FarmPoolRewardsInfo, calculateFarmPoolRewards } from "../FarmUtils";

const selector = ({ boostedFarm, YETIPrice, veYETIStaked }: LiquityStoreState) => ({
  boostedFarm,
  YETIPrice,
  veYETIStaked
});

const YourBoostFarmBalanceCard: React.FC = () => {
  const { boostedFarm, YETIPrice, veYETIStaked } = useLiquitySelector(selector);

  const earned: TroveMappings = {
    "0x77777777777d4554c39223C354A05825b2E8Faa3": boostedFarm.earnedYETI
  };

  const farmPoolRewardInfo = calculateFarmPoolRewards(veYETIStaked, format(YETIPrice), boostedFarm);

  let AppliedVeYeti: number;

  if (format(veYETIStaked.yetiStakeOnFarm) === 0 || format(veYETIStaked.boostFactor) === 0) {
    AppliedVeYeti = 0;
  } else {
    AppliedVeYeti =
      (Math.pow(format(veYETIStaked.boostFactor), 2) /
        format(boostedFarm.lpTokenBalance) /
        10 ** 18) *
      10 ** 22;
  }
  const balanceInfo = getBalanceInfo(
    //staked
    format(boostedFarm.lpTokenBalance),
    //lpShare
    farmPoolRewardInfo.userBoostedRewardShare * 100,
    //weeklyRewards,
    !boostedFarm.lpTokenBalance.eq(Decimal.from(0))
      ? (format(boostedFarm.rewardRate) * 604800 * format(boostedFarm.lpTokenBalance)) /
          format(boostedFarm.totalLPStaked)
      : 0,
    //baseWeeklyrewards
    farmPoolRewardInfo.userAnnualBaseReward / 52.143,
    //boostWeeklyReards
    farmPoolRewardInfo.userAnnualBoostedReward / 52.143,
    //accveYeti
    AppliedVeYeti,
    //stake share
    format(boostedFarm.lpTokenBalance.div(boostedFarm.totalLPStaked)) * 100,
    !isNaN(+Object.values(earned)[0]) ? format(+Object.values(earned)[0]) : 0
  );

  const {
    isOpen: isPoolRewardsOpen,
    onOpen: onPoolRewardsOpen,
    onClose: onPoolRewardsClose
  } = useDisclosure();

  return (
    <>
      <PoolRewardsModal
        isOpen={isPoolRewardsOpen}
        onClose={onPoolRewardsClose}
        rewards={earned}
        notStability={true}
        mode="LP"
        key="prm"
      />
      <Box layerStyle="card" flex={1}>
        <Flex>
          <Text textStyle="title3" mb={5}>
            Your Curve LP Token Balance
          </Text>
        </Flex>
        <Box>
          {balanceInfo.map(({ tooltip, value, percent, title }) => (
            <Flex direction="row" mt={4}>
              <Text textStyle="subtitle1" fontWeight="normal">
                {title + " "}
                {tooltip !== undefined && <Tooltip>{tooltip}</Tooltip>}
              </Text>
              <Spacer />
              {percent !== undefined && (
                <Text textStyle="subtitle1">
                  {format(boostedFarm.lpTokenBalance) !== 0 && percent < 0.001
                    ? "< " + 0.001
                    : percent.toFixed(3)}
                  %{" "}
                  {format(boostedFarm.lpTokenBalance) !== 0 && percent < 0.001 ? (
                    <Tooltip>{getNum(percent, 8)}</Tooltip>
                  ) : null}
                </Text>
              )}
              {title === "Total Amount Staked" && value !== undefined ? (
                <CoinAmount
                  token="Curve LP Tokens"
                  amount={value}
                  textStyle="subtitle1"
                  color="white"
                  noCurrencyConvert={true}
                />
              ) : title === "Accumulated veYETI on LP" ? (
                value !== undefined && (
                  <CoinAmount
                    token="veYETI"
                    amount={value}
                    textStyle="subtitle1"
                    color="white"
                    noCurrencyConvert={true}
                  />
                )
              ) : (
                value !== undefined && (
                  <CoinAmount token="YETI" amount={value} textStyle="subtitle1" color="white" />
                )
              )}
            </Flex>
          ))}
        </Box>
        <Flex justify="flex-end" mt={4}>
          <Button variant="primary" onClick={onPoolRewardsOpen}>
            View Rewards
          </Button>
        </Flex>
      </Box>
    </>
  );
};

export default YourBoostFarmBalanceCard;
