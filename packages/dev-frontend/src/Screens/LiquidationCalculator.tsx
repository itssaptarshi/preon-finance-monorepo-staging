// @ts-nocheck
import { Box } from "@chakra-ui/react";
import React from "react";
import Header from "../components/Header";
import AdjustLiquidation from "../PageComponents/LiquidationCalculator/AdjustLiquidation";

const LiquidationCalculator: React.FC = () => {
  return (
    <Box>
      <Header title="calculator.png" />
      <Box mt={6}>
        <AdjustLiquidation />
      </Box>
    </Box>
  );
};

export default LiquidationCalculator;
