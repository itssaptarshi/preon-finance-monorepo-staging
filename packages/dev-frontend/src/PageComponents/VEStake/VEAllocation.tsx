// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Box, Flex, SimpleGrid, Text, useDisclosure, Divider } from "@chakra-ui/react";
import CoinAmount from "../../components/CoinAmount";
import { Decimal, LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { newWeeklyAPR, format, getNum, formatWithDecimals } from "../../Utils/number";
import Tooltip from "../../components/Tooltip";
import PoolRewardsModal from "../Pool/PoolRewardsModal";
import { getNewEstimatedWeeklyRewardsAmount } from "./veStakeCard.utils";
import { useLiquity } from "../../hooks/LiquityContext";

const selector = ({ veYETIStaked, boostedFarm }: LiquityStoreState) => ({
  veYETIStaked,
  boostedFarm
});

const VEAllocation: React.FC = () => {
  const { veYETIStaked, boostedFarm } = useLiquitySelector(selector);
  const totalYeti: Decimal = veYETIStaked.totalYeti;
  const { liquity } = useLiquity();
  let AmountStakedUnallocated = format(veYETIStaked.yetiStake);
  let veYetiOnUnallocated = formatWithDecimals(veYETIStaked.veYETIGain, 36);
  let WeeklyveYetiGrowthUnallocated =
    AmountStakedUnallocated * 604800 * format(veYETIStaked.accumulationRate);
  let AmountStakedLP = format(veYETIStaked.yetiStakeOnFarm);

  let veYetiOnLp = formatWithDecimals(veYETIStaked.veYetiOnFarm, 36);

  let WeeklyveYetiGrowthLP = format(AmountStakedLP * 604800 * format(veYETIStaked.accumulationRate));
  // console.log("format(veYETIStaked.boostFactor)",  Math.pow(format(veYETIStaked.boostFactor), 2) / format(veYETIStaked.yetiStakeOnFarm))
  let AppliedVeYeti: number;

  if (format(veYETIStaked.yetiStakeOnFarm) == 0 || format(veYETIStaked.boostFactor) == 0) {
    AppliedVeYeti = 0;
  } else {
    AppliedVeYeti =
      (Math.pow(format(veYETIStaked.boostFactor), 2) /
        format(boostedFarm.lpTokenBalance) /
        10 ** 18) *
      10 ** 22;
  }

  let PendingVeYeti = veYetiOnLp - AppliedVeYeti;

  let stakeShare: number;
  if (veYETIStaked.totalUserYeti != undefined && veYETIStaked.totalYeti != undefined) {
    stakeShare = format(veYETIStaked.totalUserYeti.div(veYETIStaked.totalYeti)) * 100;
  } else {
    stakeShare = 0;
  }

  const {
    isOpen: isPoolRewardsOpen,
    onOpen: onPoolRewardsOpen,
    onClose: onPoolRewardsClose
  } = useDisclosure();

  return (
    <>
      <Flex flex={1} ml={[0, null, 3]} mt={[6, null, 0]}>
        <Box layerStyle="card" flex={1}>
          <Text textStyle="title3" mb={3}>
            Stake Allocations
          </Text>
          <Divider />
          <SimpleGrid columns={5} mb={3} spacingX="30px" spacingY="10px" mt={5}>
            <Text textStyle="subtitle2" fontWeight="normal" color="brand.300">
              Location
            </Text>
            <Text textStyle="subtitle2" fontWeight="normal" color="brand.300">
              YETI Staked
            </Text>
            <Text textStyle="subtitle2" fontWeight="normal" color="brand.300">
              Applied veYETI
            </Text>
            <Text textStyle="subtitle2" fontWeight="normal" color="brand.300">
              Pending veYETI
            </Text>
            <Text textStyle="subtitle2" fontWeight="normal" color="brand.300">
              Utility
            </Text>
            <Text textStyle="subtitle2" color="brand.600" mr={1}>
              Unallocated
            </Text>
            <Text textStyle="subtitle2" color="brand.600" mr={1}>
              {getNum(AmountStakedUnallocated, 3)}
            </Text>
            <Text textStyle="subtitle2" color="brand.600" mr={1}>
              {getNum(veYetiOnUnallocated, 3)}
            </Text>
            <Text textStyle="subtitle2" color="brand.600" mr={1}>
              0.000
            </Text>
            <Text textStyle="subtitle2" color="brand.600" mr={1}>
              N/A
            </Text>
            <Text textStyle="subtitle2" mr={1}>
              LP Boost
            </Text>
            <Text textStyle="subtitle2" mr={1}>
              {getNum(AmountStakedLP, 3)}
            </Text>
            <Text textStyle="subtitle2" mr={1}>
              {getNum(AppliedVeYeti, 3)}
            </Text>
            <Text textStyle="subtitle2" mr={1}>
              {getNum(PendingVeYeti, 3)}
            </Text>
            <Text textStyle="subtitle2" mr={1}>
              <Tooltip>15% of Curve LP emissions go to veYETI accumulators who also LP</Tooltip>
            </Text>
          </SimpleGrid>
        </Box>
      </Flex>
    </>
  );
};

export default VEAllocation;
