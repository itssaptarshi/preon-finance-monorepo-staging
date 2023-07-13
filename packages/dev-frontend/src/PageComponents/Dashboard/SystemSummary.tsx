import React, { useEffect, useState } from "react";
import { Flex, Box, Text, Spacer } from "@chakra-ui/react";
// import StatColumn from "../StatColumn";
import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { format, getNum } from "../../Utils/number";

const selector = ({
  yusdInStabilityPool,
  YUSDPrice,
  prices,
  farm,
  total,
  decimals,
  boostedFarm
}: LiquityStoreState) => ({
  yusdInStabilityPool,
  YUSDPrice,
  prices,
  farm,
  total,
  decimals,
  boostedFarm
});

const SystemSummary: React.FC = () => {
  const {
    yusdInStabilityPool,
    YUSDPrice,
    prices,
    farm,
    total,
    decimals,
    boostedFarm
  } = useLiquitySelector(selector);

  let totalSystemUSD = 0;

  Object.keys(total.collaterals).map(address => {
    totalSystemUSD += format(
      total.collaterals[address]
        .mul(prices[address])
        .mul(10 ** (18 - format(decimals[address])))
        .div(1e18)
    );
  });

  // TODO
  const LPPrice = format(YUSDPrice);
  const TVL =
    totalSystemUSD +
    format(farm.totalLPStaked.add(boostedFarm.totalLPStaked)) * LPPrice +
    format(yusdInStabilityPool);

  const [CurvePoolData, setCurvePoolData] = useState({
    liquidity: {
      value: 0,
      usd: 0
    }
  });

  const [PLPPoolData, setPLPPoolData] = useState({
    USDC: {
      Deposits: {
        value: 0,
        usd: 0
      }
    },
    YUSD: {
      Deposits: {
        value: 0,
        usd: 0
      }
    }
  });

  useEffect(() => {
    const curvePoolUrl = "https://api.yeti.finance/v1/CurvePool";
    const plpPoolUrl = "https://api.yeti.finance/v1/PLPPool";
    const fetchData = async () => {
      try {
        const curveResponse = await fetch(curvePoolUrl, {
          method: "GET",
          mode: "cors"
        });
        const plpResponse = await fetch(plpPoolUrl, {
          method: "GET",
          mode: "cors"
        });
        setCurvePoolData(await curveResponse.json());
        setPLPPoolData(await plpResponse.json());
      } catch (error) {
        console.log("error", error);
      }
    };
    fetchData();
  }, []);

  return (
    <Box layerStyle="base" flex={1} px={2}>
      <Text textStyle="title3" textAlign={["center", "left"]} pb={6} px={5}>
        System Overview
      </Text>
      <Text textStyle="subtitle1" textAlign={["center", "left"]} pb={6} px={5}>
        Total Value Locked:
      </Text>
      <Flex px={6} mb={2}>
        <Text textStyle="subtitle2" fontWeight="normal">
          System Total Collateral:
        </Text>
        <Spacer />
        <Text textStyle="subtitle2" fontWeight="normal">
          ${getNum(totalSystemUSD, 4)}
        </Text>
      </Flex>
      <Flex px={6} mb={2}>
        <Text textStyle="subtitle2" fontWeight="normal">
          Stability Pool Deposits:
        </Text>
        <Spacer />
        <Text textStyle="subtitle2" fontWeight="normal">
          ${getNum(format(yusdInStabilityPool), 4)}
        </Text>
      </Flex>
      <Flex px={6} mb={2}>
        <Text textStyle="subtitle2" fontWeight="normal">
          Curve YUSD LP Token Staked:
        </Text>
        <Spacer />
        <Text textStyle="subtitle2" fontWeight="normal">
          ${getNum(format(farm.totalLPStaked.add(boostedFarm.totalLPStaked)) * LPPrice, 4)}
        </Text>
      </Flex>
      <Flex px={6}>
        <Text textStyle="subtitle1">TVL:</Text>
        <Spacer />
        <Text textStyle="subtitle1">${getNum(TVL, 4)}</Text>
      </Flex>

      <Text textStyle="subtitle1" textAlign={["center", "left"]} pb={6} px={5} mt={5}>
        Stablecoin Liquidity:
      </Text>
      <Flex px={6} mb={2}>
        <Text textStyle="subtitle2" fontWeight="normal" as="u">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={"https://avax.curve.fi/factory/69"}
            style={{ outline: "none", textDecoration: "none" }}
          >
            Curve YUSD Pool:
          </a>
        </Text>
        <Spacer />
        <Text textStyle="subtitle2" fontWeight="normal">
          ${getNum(CurvePoolData?.liquidity.usd, 4)}
        </Text>
      </Flex>
      <Flex px={6} mb={2}>
        <Text textStyle="subtitle2" fontWeight="normal" as="u">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={"https://app.platypus.finance/pool?pool_group=alt"}
            style={{ outline: "none", textDecoration: "none" }}
          >
            Platypus YUSD/USDC Pool:
          </a>
        </Text>
        <Spacer />
        <Text textStyle="subtitle2" fontWeight="normal">
          ${getNum(PLPPoolData?.USDC?.Deposits.usd + PLPPoolData?.YUSD?.Deposits.usd, 4)}
        </Text>
      </Flex>
      <Flex px={6}>
        <Text textStyle="subtitle1">Total:</Text>
        <Spacer />
        <Text textStyle="subtitle1">
          $
          {getNum(
            CurvePoolData?.liquidity.usd +
              PLPPoolData?.USDC?.Deposits.usd +
              PLPPoolData?.YUSD?.Deposits.usd,
            4
          )}
        </Text>
      </Flex>
    </Box>
  );
};

export default SystemSummary;
