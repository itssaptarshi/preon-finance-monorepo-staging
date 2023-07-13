// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Box, Flex, Spacer, Text, useDisclosure, Button } from "@chakra-ui/react";
import CoinAmount from "../../components/CoinAmount";
import { Decimal, LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { newWeeklyAPR, format } from "../../Utils/number";
import Tooltip from "../../components/Tooltip";
import PoolRewardsModal from "../Pool/PoolRewardsModal";
import { getNewEstimatedWeeklyRewardsAmount } from "./veStakeCard.utils";
import { useLiquity } from "../../hooks/LiquityContext";
import { useTransactionFunction } from "../../components/Transaction";

const selector = ({ veYETIStaked }: LiquityStoreState) => ({
  veYETIStaked
});

const VEEmissions: React.FC = () => {
  const { veYETIStaked } = useLiquitySelector(selector);
  const yetiStaked = format(veYETIStaked.yetiStake);
  const yetiStakedOnFarm = format(veYETIStaked.yetiStakeOnFarm);
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

  const [sendTransaction] = useTransactionFunction(
    "claim-pending-YETI",
    liquity.send.getVeYetiStakeReward.bind(liquity.send)
  );

  const {
    isOpen: isPoolRewardsOpen,
    onOpen: onPoolRewardsOpen,
    onClose: onPoolRewardsClose
  } = useDisclosure();

  return (
    <>
      <Flex flex={1} ml={[0, null, 3]} mt={[6, null, 0]}>
        <Box layerStyle="card" flex={1} mt={6}>
          <Text textStyle="title3" mb={5}>
            YETI Emissions <Tooltip>Stakers in veYETI also earn YETI rewards!</Tooltip>
          </Text>
          <Box>
            <Flex mt={4}>
              <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                Weekly YETI Accumulation Rate
              </Text>
              <Spacer />
              <CoinAmount
                token="YETI"
                amount={format(
                  getNewEstimatedWeeklyRewardsAmount(
                    0,
                    yetiStakedOnFarm,
                    format(reward),
                    true,
                    format(totalYeti)
                  )
                )}
                textStyle="subtitle1"
                color="white"
              />
            </Flex>
            <Flex mt={4}>
              <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                Pending YETI Rewards
              </Text>
              <Spacer />
              <CoinAmount
                token="YETI"
                amount={format(yetiEarned)}
                textStyle="subtitle1"
                color="white"
              />
            </Flex>
          </Box>

          {/* <Flex mt={8} justify="flex-end">
              <Button colorScheme="brand">
                Claim Pending YETI
              </Button>
            </Flex> */}
          <Flex justify="flex-end" mt={4}>
            <Button variant="primary" onClick={() => sendTransaction()}>
              Claim Pending YETI
            </Button>
          </Flex>
        </Box>
      </Flex>
    </>
  );
};

export default VEEmissions;
