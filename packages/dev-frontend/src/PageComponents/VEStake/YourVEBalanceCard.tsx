// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Box, Flex, Spacer, Text, useDisclosure, Button } from "@chakra-ui/react";
import CoinAmount from "../../components/CoinAmount";
import { Decimal, LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { getBalanceInfo } from "./YourVEBalance.utils";
import { newWeeklyAPR, format, formatWithDecimals } from "../../Utils/number";
import Tooltip from "../../components/Tooltip";
import PoolRewardsModal from "../Pool/PoolRewardsModal";
import { getNewEstimatedWeeklyRewardsAmount } from "./veStakeCard.utils";
import { useLiquity } from "../../hooks/LiquityContext";

const selector = ({ veYETIStaked }: LiquityStoreState) => ({
  veYETIStaked
});

const YourveBalanceCard: React.FC = () => {
  const { veYETIStaked } = useLiquitySelector(selector);
  const yetiStaked = format(veYETIStaked.yetiStake);
  const totalYeti: Decimal = veYETIStaked.totalYeti;
  const yetiEarned: Decimal = veYETIStaked.yetiEarned;
  const { liquity } = useLiquity();

  const [value, setValue] = useState<Record<string, any>>({});
  const [reward, setReward] = useState<Decimal>(Decimal.from(0));

  // Use Effect for getting the rewardEarned from Yeti Emissions.
  useEffect(() => {
    liquity.getEstimatedVeYetiRewards(format(totalYeti), 604800).then(num => setReward(num));
  }, [value.stakeInput, totalYeti]);

  let stakeShare: number;
  if (veYETIStaked.totalUserYeti != undefined && veYETIStaked.totalYeti != undefined) {
    stakeShare = format(veYETIStaked.totalUserYeti.div(veYETIStaked.totalYeti)) * 100;
  } else {
    stakeShare = 0;
  }

  const balanceInfo = getBalanceInfo(
    yetiStaked,
    stakeShare,
    format(yetiEarned),
    format(veYETIStaked.accumulationRate),
    getNewEstimatedWeeklyRewardsAmount(0, yetiStaked, format(reward), true, format(totalYeti)),
    formatWithDecimals(veYETIStaked.veYETIGain, 36)
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
        rewards={{ "0x77777777777d4554c39223C354A05825b2E8Faa3": yetiEarned }}
        notStability={true}
        mode="YETI"
        key="prm"
      />
      <Box layerStyle="card" flex={1}>
        <Text textStyle="title3" mb={5}>
          Your veYETI Balance
        </Text>
        <Box>
          {balanceInfo.map(({ tooltip, value, percent, title }) => (
            <Flex direction="row" mt={4}>
              <Text textStyle="subtitle1" fontWeight="normal">
                {title + " "}
                {tooltip !== undefined && <Tooltip>{tooltip}</Tooltip>}
              </Text>
              <Spacer />
              {percent !== undefined && <Text textStyle="subtitle1">{percent.toFixed(3)}%</Text>}
              {value !== undefined && title === "Total Amount Staked" && (
                <CoinAmount token="YETI" amount={value} textStyle="subtitle1" color="white" />
              )}
              {value !== undefined &&
                title != "Total Amount Staked" &&
                tooltip != undefined &&
                tooltip!.includes("veYETI") && (
                  <CoinAmount
                    token="veYETI"
                    amount={value}
                    textStyle="subtitle1"
                    color="white"
                    noCurrencyConvert={true}
                  />
                )}
              {value !== undefined &&
                (title === "Pending YETI Rewards" ||
                  (tooltip != undefined && !tooltip!.includes("veYETI"))) && (
                  <CoinAmount
                    token="YETI"
                    amount={value!}
                    textStyle="subtitle1"
                    color="white"
                    noCurrencyConvert={true}
                  />
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

export default YourveBalanceCard;
