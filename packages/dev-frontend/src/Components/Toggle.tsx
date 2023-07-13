// @ts-nocheck
import React, { useState } from "react";

import { Tab, TabList, Tabs, Text, TabsProps } from "@chakra-ui/react";

import { Option } from "../Types";

export type ToggleProps = {
  options: any | Option[];
  size: "sm" | "md" | "lg";
  onChange: (key: string) => void;
};

const Toggle: React.FC<ToggleProps> = ({ options, size, onChange }) => {
  const [toggleIndex, setToggleIndex] = useState(0);

  const handleToggleChange = (index: number) => {
    setToggleIndex(index);
    onChange(options[index].key);
  };

  return (
    <Tabs
      variant="unstyled"
      size={size}
      w="fit-content"
      h="fit-content"
      bg="brand.700"
      borderRadius="full"
      index={toggleIndex}
      onChange={handleToggleChange}
    >
      <TabList h="100%">
        {/*  @ts-expect-error */}
        {options.map((option, index) => (
          <Tab
            key={option.key + option.value + index}
            borderRadius="full"
            px={3}
            py={1}
            color="brand.300"
            fontSize={size}
            fontWeight={600}
            _hover={{ color: "white" }}
            _selected={{ color: "white", bg: "#4B97FF" }}
            _focus={{ outline: "none" }}
          >
            <Text>{option.value}</Text>
          </Tab>
        ))}
      </TabList>
    </Tabs>
  );
};

export default Toggle;
