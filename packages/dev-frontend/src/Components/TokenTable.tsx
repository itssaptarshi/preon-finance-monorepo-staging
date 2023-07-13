// @ts-nocheck
import React, { ReactNode } from "react";

import { Flex, Text, Table, Thead, Tbody, Tr, Th, TableProps } from "@chakra-ui/react";

import Tooltip from "./Tooltip";

export type TokenTableProps = {
  headers: ReactNode[];
  tooltips?: string[];
  children: ReactNode;
  width?: number;
  borrow?: boolean;
} & TableProps;

const TokenTable: React.FC<TokenTableProps> = ({
  headers,
  children,
  tooltips,
  width = 6,
  borrow = false,
  ...props
}) => {
  if (headers.length !== width) {
    const empty = new Array(width - headers.length);
    headers.splice(1, 0, ...empty);
  }

  if (tooltips && tooltips.length !== width) {
    const empty = new Array(width - tooltips.length);
    tooltips.splice(1, 0, ...empty);
  }

  return (
    <Table variant="unstyled" {...props}>
      <Thead>
        <Tr>
          {headers.map((header, index) => (
            <Th
              color="brand.600"
              fontSize="xs"
              pb={0.5}
              pr={0}
              key={`header-${index}`}
              pl={index !== 0 && borrow ? 2 : undefined}
            >
              <Flex align="center">
                <Text mr={1.5}>
                  {header}
                  <br />
                  {tooltips && tooltips[index] && <Tooltip>{tooltips[index]}</Tooltip>}
                </Text>
              </Flex>
            </Th>
          ))}
        </Tr>
      </Thead>
      <Tbody fontSize="med" fontWeight="bold" color="white">
        {children}
      </Tbody>
    </Table>
  );
};

export default TokenTable;
