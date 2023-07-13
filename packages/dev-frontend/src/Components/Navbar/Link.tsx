// @ts-nocheck
import React from "react";
import { Box, Text } from "@chakra-ui/react";
import { Link, useLocation } from "react-router-dom";

export type LinkProps = {
  label: string;
  to: string;
  hasRadius?: boolean;
};

const CustomLink: React.FC<LinkProps> = ({ label, to, hasRadius = true }) => {
  const location = useLocation();

  let current = false;
  if (location.pathname === to) {
    current = true;
  }

  return (
    <>
      {hasRadius ? (
        <Box
          bg={current ? "brand.500" : "transparent"}
          px={[3, null, 4]}
          py={1}
          borderRadius="infinity"
        >
          <Link to={to}>
            <Text
              textStyle="title4"
              fontSize={["sm", "md", null, "lg"]}
              color={current ? "white" : "brand.300"}
              _hover={{ color: "white" }}
            >
              {label}
            </Text>
          </Link>
        </Box>
      ) : (
        <Box px={[3, null, 4]}>
          <Link to={to}>
            <Text textStyle="title4" color="brand.400" _hover={{ color: "brand.800" }}>
              {label}
            </Text>
          </Link>
        </Box>
      )}
    </>
  );
};

export default CustomLink;
