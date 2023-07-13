// @ts-nocheck
import React from "react";
import { capitalizeFirstLetter } from "../Utils/string";
// import {pure} from "recompose"
import { Text, Flex, Image } from "@chakra-ui/react";

export type HeaderProps = { title: string };

const Header: React.FC<HeaderProps> = ({ title }) => (
  <Flex
    maxH={250}
    overflow="hidden"
    align="center"
    justify="center"
    borderRadius="2xl"
    bg="brand.800"
  >
    <Image
      loading={"eager"}
      src={`/img/${title}`}
      fallback={
        <Text textStyle="title1" my={75}>
          {capitalizeFirstLetter(title)}
        </Text>
      }
      fallbackSrc={`/img/${title}`}
    />
  </Flex>
);

export default Header;
