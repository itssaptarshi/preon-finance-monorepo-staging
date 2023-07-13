// @ts-nocheck
// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Box, Flex, Button, Spacer, Text, useDisclosure } from "@chakra-ui/react";
import CoinAmount from "../../../components/CoinAmount";
import { Decimal, LiquityStoreState, TroveMappings } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { getBalanceInfo } from "./YourBalance.utils";
import { newWeeklyAPR, format } from "../../../Utils/number";
import Tooltip from "../../../components/Tooltip";
import { useLiquity } from "../../../hooks/LiquityContext";
import PoolRewardsModal from "../../Pool/PoolRewardsModal";

const selector = ({ farm }: LiquityStoreState) => ({
  farm
});

const calculateAPR = (totalSYETISupply: Decimal, totalStakedYETI: Decimal): number => {
  return 1.125;
};

const YourFarmBalanceCard: React.FC = () => {
  const { farm } = useLiquitySelector(selector);
  const { liquity } = useLiquity();
  const earned: TroveMappings = { "0x77777777777d4554c39223C354A05825b2E8Faa3": farm.earnedYETI };
  const balanceInfo = getBalanceInfo(
    +String(farm.lpTokenBalance),
    +String(Decimal.from(100).mul(farm.lpTokenBalance.div(farm.totalLPStaked))),
    0,
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
        isOldFarm={true}
      />
      <Box layerStyle="card" flex={1}>
        <Text textStyle="title3" mb={5}>
          Your Curve LP Token Balance
        </Text>
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
                  {percent < 0.001 ? "< " + 0.001 : percent.toFixed(3)}%
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

export default YourFarmBalanceCard;
