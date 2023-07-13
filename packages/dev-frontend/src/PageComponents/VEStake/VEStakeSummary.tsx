// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  Box,
  Flex,
  Spacer,
  Text,
  useDisclosure,
  Button,
  Grid,
  Progress,
  useToast,
  UseToastOptions,
  Tooltip as ChakraTooltip
} from "@chakra-ui/react";
import CoinAmount from "../../components/CoinAmount";
import { Decimal, LiquityStoreState, updateVeYetiParams } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { newWeeklyAPR, format, getNum, formatWithDecimals } from "../../Utils/number";
import Tooltip from "../../components/Tooltip";
import PoolRewardsModal from "../Pool/PoolRewardsModal";
import { getNewEstimatedWeeklyRewardsAmount } from "./veStakeCard.utils";
import { useLiquity } from "../../hooks/LiquityContext";
import { useTransactionFunction } from "../../components/Transaction";
import { contractAddresses } from "../../config/constants";

const BOOSTED_FARM = contractAddresses.boostedFarm.address;

const selector = ({ veYETIStaked, boostedFarm }: LiquityStoreState) => ({
  veYETIStaked,
  boostedFarm
});

var BreakException = {};

const VEStakeSummary: React.FC = () => {
  const { veYETIStaked, boostedFarm } = useLiquitySelector(selector);
  const yetiStaked = format(veYETIStaked.yetiStake);
  const totalYeti: Decimal = veYETIStaked.totalYeti;
  const totalStaked: number = format(veYETIStaked.totalUserYeti);
  const totalVeYeti: number = formatWithDecimals(veYETIStaked.veYETITotal, 36);
  const yetiEarned: Decimal = veYETIStaked.yetiEarned;
  const { liquity } = useLiquity();
  const accumulationRate = format(veYETIStaked.accumulationRate);
  const weeklyVeYetiReward = accumulationRate * totalStaked * 604800;
  let veYetiOnUnallocated = formatWithDecimals(veYETIStaked.veYETIGain, 36);
  let veYetiOnLp = formatWithDecimals(veYETIStaked.veYetiOnFarm, 36);
  let AppliedVeYeti: number;
  if (format(veYETIStaked.yetiStakeOnFarm) == 0 || format(boostedFarm.lpTokenBalance) == 0) {
    AppliedVeYeti = 0;
  } else {
    AppliedVeYeti =
      (Math.pow(format(veYETIStaked.boostFactor), 2) /
        format(boostedFarm.lpTokenBalance) /
        10 ** 18) *
      10 ** 22;
  }
  const progressRatio: number =
    formatWithDecimals(veYETIStaked.veYETITotal, 36) / format(veYETIStaked.totalUserYeti);
  let veYetiProgressBar =
    progressRatio < 1 && formatWithDecimals(veYETIStaked.veYETITotal, 36) !== 0 ? 1 : progressRatio;

  let PendingVeYeti = veYetiOnLp - AppliedVeYeti;
  // const totalPendingVeYeti = PendingVeYeti + veYetiOnUnallocated

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

  const {
    isOpen: isPoolRewardsOpen,
    onOpen: onPoolRewardsOpen,
    onClose: onPoolRewardsClose
  } = useDisclosure();

  const transactionId = "veYetiToFarm-transafter";
  // const [sendTransaction] = useTransactionFunction(
  //   transactionId,
  //   liquity.send.updateVEYETI.bind(liquity.send, Decimal.from(0), false, "0xD8A4AA01D54C8Fdd104EAC28B9C975f0663E75D8")
  // );
  const updateParams: updateVeYetiParams[] = [
    {
      rewarder: "0x0000000000000000000000000000000000000000",
      amount: veYETIStaked.yetiStake.hex,
      isIncrease: false
    },
    { rewarder: BOOSTED_FARM, amount: veYETIStaked.yetiStake.hex, isIncrease: true }
  ];

  const [sendupdateVEYETI] = useTransactionFunction(
    transactionId,
    liquity.send.updateVEYETI.bind(liquity.send, updateParams)
  );

  const [sendNotifyAll] = useTransactionFunction(
    "notifyAllRewarders",
    liquity.send.notifyAllRewarders.bind(liquity.send)
  );

  let AmountStakedUnallocated = format(veYETIStaked.yetiStake);

  const transferToBoost = () => {
    sendupdateVEYETI();
  };

  const toastProps: UseToastOptions = {
    status: "error",
    duration: 4000,
    isClosable: true,
    position: "top-right"
  };
  const toast = useToast();

  const onSubmit = (): void => {
    if (totalStaked == 0) {
      toast({
        title: "Error",
        description: "Stake YETI to begin accruing veYETI",
        ...toastProps
      });
      throw BreakException;
    } else if (AmountStakedUnallocated == 0) {
      toast({
        title: "Error",
        description: "No unallocated veYETI available to transfer to LP boost",
        ...toastProps
      });
      throw BreakException;
    } else {
      transferToBoost();
    }
  };

  const onSubmit2 = (): void => {
    if (totalStaked == 0) {
      toast({
        title: "Error",
        description: "Stake YETI to begin accruing veYETI",
        ...toastProps
      });
      throw BreakException;
    } else if (format(boostedFarm.lpTokenBalance) == 0) {
      if (totalStaked == 0 || format(boostedFarm.lpTokenBalance) == 0) {
        toast({
          title: "Error",
          description: "Stake LP tokens on Farm Page to claim pending veYETI",
          ...toastProps
        });
        throw BreakException;
      }
    } else {
      transferToBoost();
    }
  };

  return (
    <>
      <Box layerStyle="card" flex={1} mt={6}>
        <Text textStyle="title3" mb={2}>
          veYETI Staking Summary
        </Text>
        <Grid templateColumns="repeat(2, 1fr)" gap={12}>
          <Box>
            <Flex mt={4}>
              <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                {"Total Staked"}
              </Text>
              <Spacer />
              <CoinAmount token="YETI" amount={totalStaked} textStyle="subtitle1" color="white" />
            </Flex>
            <Flex mt={4}>
              <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                {"Current Total veYETI "}
                <Tooltip>Total veYETI including pending veYETI yet to be claimed</Tooltip>
              </Text>
              <Spacer />
              <CoinAmount
                token="veYETI"
                amount={totalVeYeti}
                textStyle="subtitle1"
                color="white"
                noCurrencyConvert={true}
              />
            </Flex>
            <Flex mt={4}>
              <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                veYETI Progress Bar
              </Text>
              <Spacer />
              <Text textStyle="subtitle2" fontWeight="normal" mt={1}>
                {progressRatio < 1 ? `< 1.0` : progressRatio.toFixed(1)}%
              </Text>

              {/* <ChakraTooltip label={`${getNum(progressRatio, 3)} : 1`} >
               
               </ChakraTooltip> */}

              <Progress
                value={veYetiProgressBar}
                w="40%"
                colorScheme={"green"}
                bg="brand.900"
                borderRadius="infinity"
                mt={2.5}
                ml={3}
                mr={3}
              />

              <Text textStyle="subtitle2" fontWeight="normal" mt={1}>
                100%
              </Text>
            </Flex>
            <Flex mt={4}>
              <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                veYETI Total to YETI staked ratio{" "}
                <Tooltip>
                  Your veYETI to YETI ratio increases over time, to a max of 100 : 1 which will take
                  2 years to reach.
                </Tooltip>
              </Text>
              <Spacer />
              <Text textStyle="subtitle1" mr={1}>
                {getNum(progressRatio, 3)} X
              </Text>
            </Flex>
          </Box>
          <Box>
            <Flex mt={4}>
              <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                YETI Staking Share
              </Text>
              <Spacer />
              <Text textStyle="subtitle1" mr={1}>
                {getNum(stakeShare, 3)}%
              </Text>
            </Flex>
            <Flex mt={4}>
              <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                {"Weekly veYETI Accumulation Rate"}
              </Text>
              <Spacer />
              <CoinAmount
                token="veYETI"
                amount={weeklyVeYetiReward}
                textStyle="subtitle1"
                color="white"
                noCurrencyConvert={true}
              />
            </Flex>
            <Flex mt={4}>
              <Text textStyle="subtitle1" fontWeight="normal" color="brand.300">
                Current Total Pending veYETI
              </Text>
              <Spacer />
              <CoinAmount
                token="veYETI"
                amount={PendingVeYeti}
                textStyle="subtitle1"
                color="white"
                noCurrencyConvert={true}
              />
            </Flex>

            <Flex mt={10} mb={4} justify="flex-end">
              <Button colorScheme="brand" mr={8} onClick={onSubmit}>
                Transfer veYETI to LP Boost{" "}
                <Flex ml={1}>
                  <Tooltip>Transfer all unallocated veYETI to LP Boost</Tooltip>
                </Flex>
              </Button>
              <Button colorScheme="brand" onClick={onSubmit2}>
                Claim Pending veYETI
              </Button>
            </Flex>
          </Box>
        </Grid>
      </Box>
    </>
  );
};

export default VEStakeSummary;
