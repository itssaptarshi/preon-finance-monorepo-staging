// @ts-nocheck
import React from "react";
import { Flex, Text } from "@chakra-ui/react";
import { ConnectButton } from "./WalletConnector";

export type ConnectCardProps = {
  title: string;
};

const ConnectCard: React.FC<ConnectCardProps> = ({ title }) => {
  return (
    <Flex layerStyle="card" bg="brand.800" direction="column" flex={1} h="fit-content">
      <Text textStyle="title3" mb={5}>
        {title}
      </Text>
      <ConnectButton w="100%" mb={2} />
    </Flex>
  );
};

export default ConnectCard;
