// @ts-nocheck
import React from "react";
import {
  Flex,
  VStack,
  Center,
  Text,
  TextProps as ChakraTextProps,
  Tooltip as ChakraTooltip
} from "@chakra-ui/react";
import Icon from "../../components/Icon";
import Tooltip from "../../components/Tooltip";

export interface StatColumnProps extends Omit<ChakraTextProps, "css"> {
  iconName: string;
  amount: any;
  units?: string;
  description: string;
  secondDescription?: string;
  tooltip?: string;
  msg?: string;
}

const StatColumn: React.FC<StatColumnProps> = ({
  iconName,
  amount,
  units,
  description,
  secondDescription,
  tooltip,
  msg,
  ...textProps
}) => (
  <VStack align="center" spacing={1} mx={1} flex={1}>
    <Center h={20} w={20}>
      {msg ? (
        <ChakraTooltip label={msg} placement="top">
          <Icon iconName={iconName} h={20} w={20} />
        </ChakraTooltip>
      ) : (
        <Icon iconName={iconName} h={20} w={20} />
      )}
    </Center>
    <Text textStyle="title3" textAlign="center" pt={2} {...textProps}>
      {amount} {units}
    </Text>
    <Flex align="center">
      {!secondDescription ? (
        <Text textStyle="body1" color="brand.200" align="center">
          {description} {tooltip && <Tooltip>{tooltip}</Tooltip>}
        </Text>
      ) : (
        <Text textStyle="body1" color="brand.200" align="center">
          {description} <br></br> {secondDescription} {tooltip && <Tooltip>{tooltip}</Tooltip>}
        </Text>
      )}
    </Flex>
  </VStack>
);

export default StatColumn;
