import React from "react";
import { Flex, Box, Text, Spacer } from "@chakra-ui/react";
import StatColumn from "./StatColumn";
import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { format, getNum } from "../../Utils/number";

const selector = ({ stabilityDeposit, yusdBalance, YUSDPrice }: LiquityStoreState) => ({
  stabilityDeposit,
  yusdBalance,
  YUSDPrice
});

const PoolSummary: React.FC = () => {
  const { stabilityDeposit, yusdBalance, YUSDPrice } = useLiquitySelector(selector);
  const balance = format(yusdBalance);
  const deposited = format(stabilityDeposit.currentYUSD);

  return (
    <Box layerStyle="base" flex={1}>
      <Text textStyle="title3" textAlign={["center", "left"]} pb={6}>
        Stability Pool Summary
      </Text>
      <Flex>
        <StatColumn
          iconName="YUSD"
          amount={getNum(deposited, 2)}
          units="YUSD"
          description="Deposited in Stability Pool"
        />
        <Spacer />
        <StatColumn
          iconName="YUSD"
          amount={getNum(balance, 2)}
          units="YUSD"
          description="YUSD Balance in Wallet"
        />
      </Flex>

      <Text textStyle="title3" textAlign="center" pt={10}>
        YUSD Price: ${YUSDPrice.toString(3)}
      </Text>
    </Box>
  );
};

export default PoolSummary;
