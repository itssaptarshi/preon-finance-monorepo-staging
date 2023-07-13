// @ts-nocheck
import React from "react";
import { Center, Text } from "@chakra-ui/react";
import { Loader } from "../components";

const Loading: React.FC = () => (
  <Center flexDirection="column" w="100vw" h="100vh">
    <Loader />
    <Text textStyle="body1" mt={4}>
      Loading...
    </Text>
  </Center>
);

export default Loading;
