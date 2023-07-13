// @ts-nocheck
import React from "react";

import { Tooltip as ChakraTooltip, TooltipProps } from "@chakra-ui/react";
import Icon from "./Icon";

const Tooltip: React.FC<TooltipProps> = ({ children, ...props }) => {
  return (
    <ChakraTooltip label={children} placement="top" {...props}>
      <Icon iconName="Tooltip" h={3} w={3} />
    </ChakraTooltip>
  );
};

export default Tooltip;
