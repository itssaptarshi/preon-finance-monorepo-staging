// @ts-nocheck
import React from "react";
import { Box, Flex } from "@chakra-ui/react";
import { Header } from "../components";
import {
  BorrowSummary,
  PoolSummary,
  StakeSummary,
  SystemSummary
} from "../PageComponents/Dashboard";

const Dashboard: React.FC = () => (
  <Box>
    <Header title="dashboard.png" />
    <Flex
      direction={["column", null, null, "row"]}
      bg="brand.800"
      borderRadius="2xl"
      flex={1}
      mt={6}
      p={[2, 3, 4, 5, 6]}
    >
      <Flex flex={1} mr={[0, null, null, 3]} mb={[6, null, null, 0]}>
        <BorrowSummary />
      </Flex>

      <Flex direction="column" flex={1} ml={[0, null, null, 3]}>
        <Flex flex={1} mb={6}>
          <SystemSummary />
        </Flex>
        <Flex flex={1} mb={3}>
          <PoolSummary />
        </Flex>
        <Flex flex={1} mt={3}>
          <StakeSummary />
        </Flex>
      </Flex>
    </Flex>
  </Box>
);

export default Dashboard;
