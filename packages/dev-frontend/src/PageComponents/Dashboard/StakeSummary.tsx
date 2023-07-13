// @ts-nocheck
// @ts-nocheck
import React from "react";
import { Flex, Box, Text, Spacer } from "@chakra-ui/react";
import StatColumn from "./StatColumn";
import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { format, formatWithDecimals, getNum } from "../../Utils/number";

const selector = ({ veYETIStaked, YETIPrice }: LiquityStoreState) => ({
  veYETIStaked,
  YETIPrice
});

const StakeSummary: React.FC = () => {
  const { veYETIStaked, YETIPrice } = useLiquitySelector(selector);

  const veBalance = formatWithDecimals(veYETIStaked.veYETITotal, 36);

  return (
    <Box layerStyle="base" flex={1}>
      <Text textStyle="title3" textAlign={["center", "left"]} pb={6}>
        Stake Summary
      </Text>
      <Flex>
        <StatColumn
          iconName="YETI"
          amount={getNum(veBalance, 2)}
          units="veYETI"
          description="Accrued"
        />
        <Text textStyle="title3" textAlign="center" pt={10}>
          YETI Price: ${YETIPrice.toString(3)}
        </Text>
      </Flex>
    </Box>
  );
};

export default StakeSummary;
