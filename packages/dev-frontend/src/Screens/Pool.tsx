// @ts-nocheck
import React from "react";
import { Box, Flex, Button } from "@chakra-ui/react";
import { Header, ConnectCard } from "../components";
import { PoolCard, YourBalanceCard } from "../PageComponents/Pool";
import {
  BoostFarmCard,
  YourBoostFarmBalanceCard,
  FarmCard,
  YourFarmBalanceCard
} from "../PageComponents/BoostFarm";
import TJFarmPool from "../PageComponents/DEXPools/TJFarmPool";
import PLPPool from "../PageComponents/DEXPools/PLPPool";

export type PoolProps = {
  disconnected?: boolean;
};

const Pool: React.FC<PoolProps> = ({ disconnected = false }) => {
  return (
    <Box>
      <Header title="pool.png" />
      <Flex direction={["column", null, "row"]} flex={1} mt={6}>
        <TJFarmPool />
      </Flex>
      <Flex direction={["column", null, "row"]} flex={1} mt={6}>
        <PLPPool />
      </Flex>

      <Flex direction={["column", null, "row"]} flex={1} mt={6}>
        <Flex flex={1} mr={[0, null, 3]}>
          <PoolCard disconnected={disconnected} />
        </Flex>
        <Flex flex={1} ml={[0, null, 3]} mt={[6, null, 0]}>
          {disconnected ? <ConnectCard title="Your Balance" /> : <YourBalanceCard />}
        </Flex>
      </Flex>
      <Flex direction={["column", null, "row"]} flex={1} mt={6}>
        <Flex flex={1} mr={[0, null, 3]}>
          <BoostFarmCard disconnected={disconnected} />
        </Flex>
        <Flex flex={1} ml={[0, null, 3]} mt={[6, null, 0]}>
          {disconnected ? <ConnectCard title="Your Balance" /> : <YourBoostFarmBalanceCard />}
        </Flex>
      </Flex>
      <Flex direction={["column", null, "row"]} flex={1} mt={6}>
        <Flex flex={1} mr={[0, null, 3]}>
          <FarmCard disconnected={disconnected} />
        </Flex>
        <Flex flex={1} ml={[0, null, 3]} mt={[6, null, 0]}>
          {disconnected ? <ConnectCard title="Your Balance" /> : <YourFarmBalanceCard />}
        </Flex>
      </Flex>
    </Box>
  );
};

export default Pool;
