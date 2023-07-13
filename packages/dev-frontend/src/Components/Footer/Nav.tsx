// @ts-nocheck
import React from "react";
import NavLink from "./NavLink";

import { Flex, Text } from "@chakra-ui/react";

const Links = [
  { title: "User Docs", link: "https://docs.yeti.finance/" },
  { title: "Technical Docs", link: "https://techdocs.yeti.finance/" },
  {
    title: "Audit",
    link: "https://techdocs.yeti.finance/about-yeti-finance/audits-and-risks"
  }
];

const Nav: React.FC = () => {
  return (
    <Flex flex={1} direction={["column", null, null, "row"]}>
      <Flex
        align="center"
        justify={["center", null, null, "flex-start"]}
        flex={1}
        gap={5}
        mb={[6, null, null, 0]}
      >
        <img src="/img/3d-yeti.png" alt="Yeti Finance" style={{ width: "70px" }} />
        <Text textStyle="title2" mb={0}>
          Yeti
        </Text>
      </Flex>

      <Flex
        as="nav"
        align="center"
        justify="center"
        direction={["column", null, null, "row"]}
        flex={[1, null, null, 2]}
        gap={4}
      >
        {Links.map(({ title, link }) => (
          <NavLink to={link} key={title}>
            {title}
          </NavLink>
        ))}
      </Flex>
    </Flex>
  );
};

export default Nav;
