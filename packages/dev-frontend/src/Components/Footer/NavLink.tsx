// @ts-nocheck
import React from "react";

import { Button } from "@chakra-ui/react";

type NavLinkProps = {
  to: string;
};

const NavLink: React.FC<NavLinkProps> = ({ to, children }) => (
  <a href={to} target="_blank" rel="noreferrer">
    <Button
      px={5}
      py={0}
      bg="transparent"
      borderRadius="full"
      fontWeight="light"
      fontSize="xl"
      filter="none"
      color="white"
      _hover={{
        bg: "brand.700"
      }}
    >
      {children}
    </Button>
  </a>
);

export default NavLink;
