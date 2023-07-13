// @ts-nocheck
import React from "react";

import {
  Flex,
  Text,
  Progress,
  Circle,
  ProgressProps as ChakraProgressProps
} from "@chakra-ui/react";

export interface ProgressBarProps extends Omit<ChakraProgressProps, "css"> {
  step: 0 | 1;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ step, ...props }) => {
  return (
    <Flex align="center" {...props}>
      <Circle size="20px" bg="brand.500" zIndex={2}>
        <Text textStyle="label1">1</Text>
      </Circle>
      <Progress
        value={step * 100}
        size="xs"
        bg="brand.100"
        colorScheme="brand"
        ml={-1}
        mr={-1}
        w="100%"
        zIndex={1}
      />
      <Circle size="20px" bg={step === 0 ? "brand.100" : "brand.500"} zIndex={2}>
        <Text textStyle="label1">2</Text>
      </Circle>
    </Flex>
  );
};

export default ProgressBar;
