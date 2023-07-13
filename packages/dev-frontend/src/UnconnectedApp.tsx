import React, { useState } from "react";
import { RootWrapper, PageWrapper, Navbar } from "./components";
import { Stake, Borrow, Pool, LiquidationCalculator } from "./Screens";
import { HashRouter as Router, Route, Switch } from "react-router-dom";
import { Center, Text, Button, Flex, HStack, Spacer, useMediaQuery } from "@chakra-ui/react";
import { ConnectButton } from "./components/WalletConnector";

type UnconnectedAppProps = {
  failed: boolean;
  activating: boolean;
  rejectedByUser: boolean;
  alreadyPending: boolean;
};

const UnconnectedApp: React.FC<UnconnectedAppProps> = ({
  failed,
  activating,
  rejectedByUser,
  alreadyPending
}) => {
  const [snow, setSnow] = useState<0 | 1>(1);

  const toggleSnow = () => {
    if (snow === 0) {
      setSnow(1);
    } else {
      setSnow(0);
    }
  };

  const [isMobile] = useMediaQuery("(max-width: 980px)");

  return (
    <RootWrapper>
      <PageWrapper snow={snow}>
        <Flex mb={8} direction={["column", null, null, "row-reverse"]} align="center">
          {/* {!isMobile ? (
            <HStack spacing={[2, 4, 6, 8]}>
              <ConnectButton />
            </HStack>
          ) : (
            <Flex align="center" direction={["column", "row"]} mt={[6, null, null, 0]}>
              <ConnectButton />
            </Flex>
          )} */}
        </Flex>
        <Center w="100%" h="100vh" flexDirection="column" p={10}>
          <img src="/img/3d-yeti.png" alt="Yeti Finance" style={{ width: "12rem" }} />
          <Text textStyle="title4" my={5} textAlign="center">
            Please connect your wallet.
          </Text>
          <ConnectButton />
        </Center>
      </PageWrapper>
    </RootWrapper>
  );
};

export default UnconnectedApp;
