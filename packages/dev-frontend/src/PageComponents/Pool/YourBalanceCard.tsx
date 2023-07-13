// @ts-nocheck
import React from "react";
import { Box, Flex, Button, Spacer, Text, useDisclosure } from "@chakra-ui/react";
import Tooltip from "../../components/Tooltip";
import CoinAmount from "../../components/CoinAmount";
import PoolRewardsModal from "./PoolRewardsModal";
import { LiquityStoreState, Decimal } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { format, getNum } from "../../Utils/number";

const selector = ({ stabilityDeposit, yusdInStabilityPool, poolRewardRate }: LiquityStoreState) => ({
  stabilityDeposit,
  yusdInStabilityPool,
  poolRewardRate
});

const YourBalanceCard: React.FC = () => {
  const { stabilityDeposit, yusdInStabilityPool, poolRewardRate } = useLiquitySelector(selector);

  const poolShare: number = format(stabilityDeposit.currentYUSD.mulDiv(100, yusdInStabilityPool));
  const totalDeposited: number = +stabilityDeposit.currentYUSD;
  const rewardsEarned = +stabilityDeposit.yetiReward;
  const rewards = stabilityDeposit.collateralGain;
  // console.log("rewards pool", rewards);

  // const liquidationGain = stabilityDeposit.collateralGain

  // Pass it util function for calculating daily rewards.
  // const dailyRewards = poolShare.div(100).mul(0).prettify(0);
  const {
    isOpen: isPoolRewardsOpen,
    onOpen: onPoolRewardsOpen,
    onClose: onPoolRewardsClose
  } = useDisclosure();

  return (
    <>
      {/* Your Balance Card Modals */}
      <PoolRewardsModal
        isOpen={isPoolRewardsOpen}
        onClose={onPoolRewardsClose}
        rewards={rewards}
        notStability={false}
      />

      {/* Your Balance Card Modals */}
      <Box layerStyle="card" flex={1}>
        <Text textStyle="title3" mb={5}>
          Your YUSD Balance
        </Text>
        <Box>
          {/* Total Deposited */}
          <Flex direction="row" mb={4}>
            <Text textStyle="subtitle1" fontWeight="normal">
              Total Deposited
            </Text>
            <Spacer />
            <Flex alignItems="center">
              <CoinAmount token="YUSD" amount={totalDeposited} textStyle="subtitle1" color="white" />
            </Flex>
          </Flex>

          {/* Pool Share */}
          <Flex direction="row" mb={4}>
            <Text textStyle="subtitle1" fontWeight="normal">
              Pool Share
            </Text>
            <Spacer />
            <Text textStyle="subtitle1" mr={1}>
              {poolShare.toFixed(5)}%
            </Text>
          </Flex>

          {/* Daily Rewards Estimate 
          <Flex direction="row" mb={4}>
            <Text textStyle="subtitle1" fontWeight="normal">
              Daily Rewards Estimate
            </Text>
            <Spacer />
            <Text textStyle="subtitle1" mr={1}>
              ${rewardsEarned.toFixed(2)}
            </Text>
          </Flex>
          */}

          <Flex direction="row" mb={4}>
            <Text textStyle="subtitle1" fontWeight="normal">
              Estimated Weekly Rewards{" "}
              <Tooltip>
                Estimated amount of rewards you will receive in a week based on your deposit
              </Tooltip>
            </Text>
            <Spacer />
            <CoinAmount
              token="YETI"
              amount={
                !stabilityDeposit.currentYUSD.eq(Decimal.from(0))
                  ? +(
                      (format(poolRewardRate) * 604800 * format(totalDeposited)) /
                      format(yusdInStabilityPool)
                    ).toFixed(3)
                  : 0
              }
              textStyle="subtitle1"
              color="white"
            />
            {/* <Text textStyle="subtitle1" mr={1}>
              {!stabilityDeposit.currentYUSD.eq(Decimal.from(0)) ? (format(poolRewardRate) * 604800 * format(totalDeposited) / format(yusdInStabilityPool)).toFixed(3) : 0} YETI
            </Text> */}
          </Flex>

          {/* Rewards Earned */}
          <Flex direction="row" mb={4}>
            <Text textStyle="subtitle1" fontWeight="normal">
              YETI Rewards Earned
            </Text>
            <Spacer />
            <CoinAmount
              token="YETI"
              amount={format(rewardsEarned)}
              textStyle="subtitle1"
              color="white"
            />
          </Flex>
        </Box>

        {/* Modal Open Buttons */}
        <Flex justify="flex-end">
          <Button variant="primary" onClick={onPoolRewardsOpen}>
            View Rewards
          </Button>
        </Flex>
      </Box>
    </>
  );
};

export default YourBalanceCard;
