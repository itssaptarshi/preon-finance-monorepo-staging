// @ts-nocheck
import React from "react";
import { Text, Box, BoxProps, Flex, Spacer } from "@chakra-ui/react";
import { Icon, CoinAmount } from "../../components";
import { CurrencyConverter } from "../../components";
import Tooltip from "../../components/Tooltip";

type CollateralItemProps = {
  token: string;
  amount: number;
  yusdFromLever?: number;
  changeWithoutLever?: number;
  leverage?: number;
  currency?: string;
  ratio: number;
  fee?: number;
  feePercentage?: number;
  currencyType?: string;
} & BoxProps;

const CollateralItem: React.FC<CollateralItemProps> = ({
  token,
  amount,
  yusdFromLever = 0,
  changeWithoutLever = 0,
  leverage = 0,
  currency,
  ratio,
  fee,
  feePercentage = 0,
  currencyType,
  ...props
}) => {
  return (
    <Box {...props}>
      <Flex align="center">
        <Icon iconName={token} alignItems="center" />
        <Text as="h5" textStyle="subtitle3" color="brand.200" ml={1.5}>
          {token}
        </Text>
        <Spacer />
        <CoinAmount
          token={token}
          amount={amount}
          safetyRatio={ratio}
          currency={currencyType == undefined ? "VC" : currencyType}
          fontWeight="bold"
        />
      </Flex>
      {leverage != 0 ? (
        <Flex mt={2.5} ml={2.5}>
          <Text textStyle="body2" color="brand.300">
            {"Estimated Leverage: "}{" "}
            {<Tooltip>{"Estimated Leverage on this asset as determined earlier. "}</Tooltip>}
          </Text>

          <Spacer />
          <Text color="brand.300" textStyle="body2" fontWeight="bold">
            {Number(leverage).toFixed(2)}x
          </Text>
        </Flex>
      ) : (
        <></>
      )}
      {leverage == 0 && yusdFromLever > 0 ? (
        <Flex mt={2.5} ml={2.5}>
          <Text textStyle="body2" color="brand.300">
            {"Deleveraged Amount: "}{" "}
            {<Tooltip>{"Collateral amount that is autosold into YUSD to reduce debt"}</Tooltip>}
          </Text>

          <Spacer />
          <Text color="brand.300" textStyle="body2" fontWeight="bold">
            {Number(yusdFromLever).toFixed(2)} YUSD
          </Text>
        </Flex>
      ) : (
        <></>
      )}
      {leverage != 0 && changeWithoutLever && changeWithoutLever != 0 ? (
        <Flex mt={2.5} ml={2.5}>
          <Text textStyle="body2" color="brand.300">
            {"Deposited Amount from Wallet: "}{" "}
            {<Tooltip>{"Amount pre leverage of this asset."}</Tooltip>}
          </Text>

          <Spacer />
          <Text color="brand.300" textStyle="body2" fontWeight="bold">
            {Number(changeWithoutLever).toFixed(3) + " " + token}
          </Text>
        </Flex>
      ) : (
        <></>
      )}
      {fee !== undefined && (
        <Flex mt={2.5} ml={2.5}>
          <Text textStyle="body2" color="brand.300">
            {"Deposit Fees: "} {<Tooltip>{"The constant deposit fee for this collateral."}</Tooltip>}
          </Text>

          <Spacer />
          <Text color="brand.300" textStyle="body2" fontWeight="bold">
            {(feePercentage * 100).toFixed(3)}%
            <CurrencyConverter token={token} value={fee} currency={"YUSD"} />
          </Text>
        </Flex>
      )}
    </Box>
  );
};

export default CollateralItem;
