// @ts-nocheck
import React from "react";
import {
  Box,
  Flex,
  Text,
  Spacer,
  Grid,
  SimpleGrid,
  Divider,
  Button,
  Progress
} from "@chakra-ui/react";
import { Header, ConnectCard, CoinAmount } from "../components";
import { StakeCard, YourBalanceCard } from "../PageComponents/Stake";
import { VEStakeCard, VEAllocation, VEStakeSummary, VEEmissions } from "../PageComponents/VEStake";
import Tooltip from "../components/Tooltip";
// import { calculateHealth, calculateHealthColor, calculateHealthStableTrove } from "../../PageComponents/Borrow/Trove";

export type StakeProps = {
  disconnected?: boolean;
};

const Stake: React.FC<StakeProps> = ({ disconnected = false }) => (
  <Box>
    <Header title="stake.png" />
    <VEStakeSummary />
    <Flex direction={["column", null, "row"]} flex={1} mt={6}>
      <Flex flex={1} mr={[0, null, 3]}>
        <VEStakeCard disconnected={disconnected} />
      </Flex>
      <Flex direction="column" flex={1} ml={[0, null, null, 3]}>
        <VEAllocation />
        <VEEmissions />
      </Flex>
    </Flex>
  </Box>
);

export default Stake;
