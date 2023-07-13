import {
  Box,
  Flex,
  Text,
  Spacer,
  Grid,
  SimpleGrid,
  Divider,
  Button,
  Progress
} from "@chakra-ui/react";
import { RedeemCard, TroveList } from "../PageComponents/Redemption";
import React, { useState, useEffect } from "react";
import { useLiquity } from "../hooks/LiquityContext";
import { Decimal, LiquityStoreState } from "@liquity/lib-base";
import { TroveData, getNextTenTroves } from "../PageComponents/Redemption/RedemptionUtils";
import { format } from "../Utils/number";

export type RedemptionProps = {
  disconnected?: boolean;
};

const Redemption: React.FC<RedemptionProps> = ({ disconnected = false }) => {
  const { liquity, account } = useLiquity();

  const [cachedTroves, setCachedTroves] = useState<Array<TroveData>>([]);

  useEffect(() => {
    const getSetFirstTenTroves = async () => {
      const firstTenTroves = await getNextTenTroves(liquity);
      setCachedTroves(firstTenTroves);
    };

    getSetFirstTenTroves();
  }, []);

  return (
    <>
      <Flex flex={1}>
        <RedeemCard firstTenTroves={cachedTroves} />
      </Flex>

      <Flex flex={1} mt={6}>
        <TroveList firstTenTroves={cachedTroves} />
      </Flex>
    </>
  );
};

export default Redemption;
