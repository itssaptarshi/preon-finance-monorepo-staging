// @ts-nocheck
// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Flex, Box, Text, Tr, Td, Spacer, useTheme } from "@chakra-ui/react";
import StatColumn from "./StatColumn";
import { Icon, TokenTable } from "../../components";
import { Decimal, LiquityStoreState, TroveMappings } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import tokenData, { tokenDataMappingA } from "../../TokenData";
import { format, getNum, formatWithDecimals } from "../../Utils/number";
import { VC_explanation } from "../../Utils/constants";
import Tooltip from "../../components/Tooltip";
import { useLiquity } from "../../hooks/LiquityContext";
import { calculateHealthStableTrove } from "../Borrow/Trove/Trove.utils";

const selector = ({
  trove,
  prices,
  tokenBalances,
  total,
  safetyRatios,
  recoveryRatios,
  YUSDPrice,
  icr,
  decimals,
  farm,
  yusdInStabilityPool,
  underlyingPerReceiptRatios
}: LiquityStoreState) => ({
  trove,
  prices,
  tokenBalances,
  total,
  safetyRatios,
  recoveryRatios,
  YUSDPrice,
  icr,
  decimals,
  farm,
  yusdInStabilityPool,
  underlyingPerReceiptRatios
});

const BorrowSummary: React.FC = () => {
  const {
    trove,
    prices,
    tokenBalances,
    total,
    safetyRatios,
    recoveryRatios,
    YUSDPrice,
    icr,
    decimals,
    farm,
    yusdInStabilityPool,
    underlyingPerReceiptRatios
  } = useLiquitySelector(selector);
  const { liquity } = useLiquity();
  const { yeti } = useTheme();

  // console.log('YUSDPrice', +String(YUSDPrice))
  console.log(tokenData);
  tokenData.map(
    token =>
      (token["troveBalance"] = formatWithDecimals(
        trove.collaterals[token.address],
        decimals[token.address].toNumber()
      ))
  );
  tokenData.map(
    token =>
      (token["walletBalance"] = formatWithDecimals(
        tokenBalances[token.underlying == "" ? token.address : token.underlying],
        token.underlyingDecimals
      ))
  );

  const depositedCollateral = tokenData.filter(
    token => token.walletBalance !== 0 || token.troveBalance !== 0
  );

  const heldCollateral = tokenData.filter(token => token.troveBalance !== 0);

  const collateralizationRatio = format(icr) * 100;

  const totalBorrowed = format(trove.debt["debt"]);

  console.log("Yeti airdrop secret link: https://bit.ly/IqT6zt");

  const ratioMapping: TroveMappings = {};
  const [ratios, setRatios] = useState<TroveMappings>(ratioMapping);

  let vcValue: number = 0;
  let usdValue: number = 0;
  let stableVC: number = 0;
  let stableUSD: number = 0;
  tokenData.map(token => {
    const curBal: Decimal = trove.collaterals[token.address];
    let vc: number;
    let usd: number;
    const safetyRatio = format(safetyRatios[token.address]);
    const dec = decimals[token.address].toNumber();
    if (curBal != undefined) {
      vc = format(prices[token.address]) * safetyRatio * formatWithDecimals(curBal, dec);
      // console.log(token.token +'ddd', vc)
      vcValue += vc;
      usd = format(prices[token.address]) * formatWithDecimals(curBal, dec);
      usdValue += usd;
    } else {
      vc =
        format(prices[token.address]) *
        safetyRatio *
        formatWithDecimals(trove.collaterals[token.address], dec);
      vcValue += vc;

      usd =
        format(prices[token.address]) * formatWithDecimals(trove.collaterals[token.address], dec);
      usdValue += usd;
    }
    if (token.isStable) {
      stableVC += vc;
      stableUSD += usd;
    }
  });
  // console.log('vcValue summary', vcValue)

  const troveHealth =
    stableVC * 1.1 > totalBorrowed && stableVC / vcValue > 0.99
      ? 200 - (200 - 110) * Math.exp((-1 / 9) * (collateralizationRatio - 110))
      : collateralizationRatio;

  const getCollateralRatioDisplay = (collateralRatio: number) => {
    if (collateralRatio < 125) {
      return ["RedThermometer", "red.500"];
    } else if (collateralRatio < 165) {
      return ["YellowThermometer", "yellow.500"];
    } else {
      return ["GreenThermometer", "green.500"];
    }
  };

  const getTroveRiskynessMsg = () => {
    const riskeyness = ((vcValue - stableVC) / (totalBorrowed - stableVC)) * 100;
    const precentStable = (stableVC / vcValue) * 100;
    let safteyLable: string;
    let amountRoom: string;
    if (collateralizationRatio === 0) {
      return "";
    }
    if (stableUSD > totalBorrowed) {
      if ((collateralizationRatio * precentStable) / 100 < 112) {
        safteyLable = "risky";
        amountRoom = "not much";
      } else if ((collateralizationRatio * precentStable) / 100 < 114) {
        safteyLable = "medium risk";
        amountRoom = "some";
      } else {
        safteyLable = "safe";
        amountRoom = "a lot of";
      }
    } else if (riskeyness < 130) {
      safteyLable = "risky";
      amountRoom = "not much";
    } else if (riskeyness < 170) {
      safteyLable = "low-medium risk";
      amountRoom = "some";
    } else {
      safteyLable = "safe";
      amountRoom = "a lot of";
    }
    return `Your trove is comprised of ${precentStable.toFixed(3)}% stables${
      riskeyness > 0 ? `, with an ICR without stable coins of ${riskeyness.toFixed(3)}%.` : "."
    } We deem this as ${safteyLable} since there is ${amountRoom} room for your collateral prices to fall before reaching the liquidation threshold of 110%.`;
  };

  let totalSystemVC = 0;
  let totalSystemUSD = 0;
  let totalStableUSD = 0;

  Object.keys(total.collaterals).map(address => {
    const amountUSD = format(
      total.collaterals[address]
        .mul(10 ** (18 - format(decimals[address])))
        .mul(prices[address])
        .div(1e18)
    );
    totalSystemVC += amountUSD * format(recoveryRatios[address]);
    totalSystemUSD += amountUSD;
    if (tokenDataMappingA[address] !== undefined && tokenDataMappingA[address].isStable) {
      totalStableUSD += amountUSD;
    }
  });
  // console.log("totalSystemVC", totalSystemVC);
  const totalSystemRatio = totalSystemVC / format(total.debt["debt"]);

  return (
    <Box layerStyle="base" flex={1} px={2}>
      <Text textStyle="title3" textAlign={["center", "left"]} pb={6} px={6}>
        Borrow Summary
      </Text>
      <Flex direction={["column", "row"]} mb={5} px={6}>
        <StatColumn
          iconName={getCollateralRatioDisplay(troveHealth)[0]}
          amount={`${collateralizationRatio.toFixed(3)}%`}
          description="Collateralization Ratio"
          color={getCollateralRatioDisplay(troveHealth)[1]}
          tooltip="Ratio of risk adjusted value in trove to debt"
          msg={getTroveRiskynessMsg()}
        />
        <StatColumn
          iconName="Bank"
          amount={`$${getNum(totalBorrowed * +String(YUSDPrice), 2)}`}
          description="Borrowed YUSD"
          secondDescription="(in USD)"
        />
        <StatColumn
          iconName="MoneyStack"
          amount={`$${getNum(usdValue, 2)}`}
          description="Total Collateral"
        />
      </Flex>

      <Flex px={6} mb={2}>
        <Text textStyle="subtitle1" fontWeight="normal">
          Trove Risk Adjusted Value: <Tooltip>{VC_explanation}</Tooltip>
        </Text>
        <Spacer />
        <Text textStyle="subtitle1">{getNum(vcValue, 2)}</Text>
      </Flex>

      <Flex px={6} mb={2}>
        <Text textStyle="subtitle1" fontWeight="normal">
          Trove Stablecoin Percentage:
        </Text>
        <Spacer />
        <Text textStyle="subtitle1">{getNum((stableUSD / usdValue) * 100, 3)}%</Text>
      </Flex>
      <Flex px={6} mb={2}>
        <Text textStyle="subtitle1" fontWeight="normal">
          System Stablecoin Percentage:
        </Text>
        <Spacer />
        <Text textStyle="subtitle1">{getNum((totalStableUSD / totalSystemUSD) * 100, 3)}%</Text>
      </Flex>
      <Flex px={6} mb={2}>
        <Text textStyle="subtitle1" fontWeight="normal">
          System Collateral Ratio:
        </Text>
        <Spacer />
        <Text textStyle="subtitle1">{(totalSystemRatio * 100).toFixed(3)}%</Text>
      </Flex>
      <Flex px={6} mb={6}>
        <Text textStyle="subtitle3" fontWeight="normal">
          {totalSystemRatio < 1.5 ? "Recovery Mode ( < 150%)" : "Normal Mode ( > 150%)"}
        </Text>
      </Flex>

      <Box
        overflowY={depositedCollateral.length > 10 ? "scroll" : undefined}
        maxHeight="30rem"
        sx={yeti.scrollbarDashboard}
      >
        <TokenTable
          headers={["Token", "Wallet Balance", "Trove Balance"]}
          // tooltips={["placeholder", "placeholder", "placeholder"]}
          width={5}
          display={["none", "block"]}
        >
          <>
            {depositedCollateral.map(token => (
              <Tr key={token.token + token.walletBalance}>
                <Td pb={0} pt={4}>
                  <Flex align="center">
                    <Icon iconName={token.token} h={5} w={5} />
                    <Text ml={3}>{token.token}</Text>
                  </Flex>
                </Td>
                {[...new Array(2)].map(_ => (
                  <Td pb={0} pt={4} />
                ))}
                <Td pb={0} pt={4}>
                  {getNum(token.walletBalance)}
                </Td>
                <Td pb={0} pt={4}>
                  {getNum(
                    token.troveBalance *
                      format(underlyingPerReceiptRatios[token.address]) *
                      10 ** (18 - token.underlyingDecimals)
                  )}
                </Td>
              </Tr>
            ))}
          </>
        </TokenTable>
      </Box>

      {/* Mobile Table */}
      {heldCollateral.length !== 0 && (
        <TokenTable
          headers={["Token", "Trove Balance"]}
          // tooltips={["placeholder", "placeholder"]}
          width={2}
          display={["block", "none"]}
        >
          <>
            {heldCollateral.map(token => (
              <Tr key={token.token + token.walletBalance}>
                <Td pb={0} pt={4}>
                  <Flex align="center">
                    <Icon iconName={token.token} h={5} w={5} />
                    <Text ml={3}>{token.token}</Text>
                  </Flex>
                </Td>
                <Td pb={0} pt={4}>
                  {getNum(token.troveBalance)}
                </Td>
              </Tr>
            ))}
          </>
        </TokenTable>
      )}
    </Box>
  );
};

export default BorrowSummary;
