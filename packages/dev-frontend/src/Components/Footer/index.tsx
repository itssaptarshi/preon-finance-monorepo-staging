// @ts-nocheck
import React from "react";
import Nav from "./Nav";

import { Link, Flex, Center, Icon } from "@chakra-ui/react";

import { AiFillMediumCircle, AiFillTwitterCircle } from "react-icons/ai";
import { SiDiscord, SiTelegram } from "react-icons/si";

const Footer: React.FC = () => {
  return (
    <Flex bg="brand.900" justify="center" px={10} py={6}>
      <Flex
        w={1250}
        py={4}
        alignItems="center"
        justifyContent="space-between"
        direction={["column", null, null, "row"]}
      >
        <Flex flex={[2, null, null, 3]} mb={[4, null, null, 0]}>
          <Nav />
        </Flex>

        <Flex align="center" justify="flex-end" flex={1} gap={4}>
          <Link href="https://yetifinance.medium.com/" isExternal h={12} w={12}>
            <Icon as={AiFillMediumCircle} color="#4B97FF" h={12} w={12} />
          </Link>
          <Link href="https://twitter.com/YetiFinance" isExternal h={12} w={12}>
            <Icon as={AiFillTwitterCircle} color="#4B97FF" h={12} w={12} />
          </Link>

          <Link href="https://discord.com/invite/yetifinance" isExternal h={10} w={10}>
            <Center bg="#4B97FF" borderRadius="full" h={10} w={10}>
              <Icon as={SiDiscord} color="brand.900" h={7} w={7} />
            </Center>
          </Link>
          <Link href="https://t.me/yetifinance" isExternal h={10} w={10}>
            <Icon as={SiTelegram} color="#4B97FF" h={10} w={10} />
          </Link>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default Footer;
