// @ts-nocheck
import React from "react";
import { paths } from "./Navbar.constants";
import { Flex, HStack, Spacer, Stack, Box } from "@chakra-ui/react";
import Link from "./Link";
import UserDetails from "./UserDetails";
import { ConnectButton } from "../WalletConnector";
import { useMediaQuery, Menu, MenuButton, Button, MenuList, MenuItem } from "@chakra-ui/react";

export type NavbarProps = {
  walletConnected: boolean;
  dashboardVisible: boolean;
  snow?: 0 | 1;
  setSnow?: any;
};

const Navbar: React.FC<NavbarProps> = ({ dashboardVisible, walletConnected, snow, setSnow }) => {
  const [isMobile] = useMediaQuery("(max-width: 1000px)");
  return (
    <Flex mb={8} direction={["column", null, null, "row"]} align="center" justify="space-between">
      <>
        <HStack spacing={1}>
          {dashboardVisible && <Link to="/" label="Dashboard" />}

          {paths.slice(1).map(({ path, label }) => (
            <Link key={path} to={path} label={label} />
          ))}
        </HStack>
        {!isMobile ? (
          <Flex align="center">
            {walletConnected ? <UserDetails onChange={setSnow} /> : <ConnectButton />}
          </Flex>
        ) : (
          <>
            <Spacer />
            <Flex align="center" direction={["column", "row"]} mt={[6, null, null, 0]}>
              {walletConnected ? <UserDetails onChange={setSnow} /> : <ConnectButton />}
            </Flex>
          </>
        )}
      </>
    </Flex>
  );
};

export default Navbar;
