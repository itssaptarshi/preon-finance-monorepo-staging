// @ts-nocheck
import React, { useState } from "react";
import { Text, Flex, Button, useDisclosure } from "@chakra-ui/react";
import { Tooltip as ChakraTooltip, TooltipProps } from "@chakra-ui/react";
import Icon from "../Icon";
import { useWeb3React } from "@web3-react/core";
import { injectedConnector, walletConnectConnector } from "../../connectors/injectedConnector";
import Toggle from "../Toggle";
import { useLiquity } from "../../hooks/LiquityContext";
import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { formatWalletAddress } from "../../Utils/string";
import { getNum, format } from "../../Utils/number";

// TODO: Fix LiquityStoreState type to include yusdBalance, yetiBalance, YETIPrice
// @ts-expect-error
const selector = ({ yusdBalance, yetiBalance, YETIPrice }: LiquityStoreState) => ({
  yusdBalance,
  yetiBalance,
  YETIPrice
});

type UserDetailsProps = {
  onChange: any;
};

const UserDetails: React.FC<UserDetailsProps> = ({ onChange }) => {
  const { deactivate, active, error, connector } = useWeb3React<unknown>();
  const { account } = useLiquity();
  const { yusdBalance, yetiBalance, YETIPrice } = useLiquitySelector(selector);
  const userYusdBalance = format(yusdBalance);
  const userYetiBalance = format(yetiBalance);
  const {
    liquity: {
      connection: { addresses }
    }
  } = useLiquity();

  const [log, setLog] = useState<string[]>([]);
  const addToken = (params: any) => {
    // @ts-ignore
    const func = window.ethereum.request;

    func({ method: "wallet_watchAsset", params }) //@ts-ignore
      .then(() => setLog([...log, "Success, Token added!"]))
      .catch((error: Error) => setLog([...log, `Error: ${error.message}`]));
  };

  const addYusdToken = () => {
    addToken({
      type: "ERC20",
      options: {
        address: addresses["yusdToken"],
        symbol: "YUSD",
        decimals: 18,
        image: "https://i.ibb.co/DCL8fhg/yusd-Token.png"
      }
    });
  };

  const addYetiToken = () => {
    addToken({
      type: "ERC20",
      options: {
        address: addresses["yetiToken"],
        symbol: "YETI",
        decimals: 18,
        image: "https://i.ibb.co/fvT5sMy/YETI-LOGO.png"
      }
    });
  };
  async function deactivateWallet() {
    try {
      if (
        (await walletConnectConnector.getProvider()) != undefined &&
        (await walletConnectConnector.getProvider()).connected == true
      ) {
        walletConnectConnector.close();
      } else {
        deactivate();
      }
    } catch (ex) {
      console.error(ex);
    }
  }

  return (
    <>
      <Flex align="center" direction={["column", null, "row"]}>
        <Flex align="center">
          <ChakraTooltip label={"Add YETI to Metamask"} placement="top">
            <Button variant="link" onClick={addYetiToken}>
              <Icon iconName="YETI" h={6} w={6} mr={2} />
              <Text textStyle="subtitle3" mr={3}>
                {getNum(userYetiBalance)} YETI
              </Text>
            </Button>
          </ChakraTooltip>
          <ChakraTooltip label={"Add YUSD to Metamask"} placement="top">
            <Button variant="link" onClick={addYusdToken}>
              <Icon iconName="YUSD" h={6} w={6} mr={2} />
              <Text textStyle="subtitle3" mr={[0, null, 3]}>
                {getNum(userYusdBalance)} YUSD
              </Text>
            </Button>
          </ChakraTooltip>
          {/* <Text textStyle="walletAddress">{formatWalletAddress(account, 6, 4, 13)}</Text> */}
          <ChakraTooltip label={"Disconnect Wallet"} placement="top">
            {connector != undefined ? (
              <Button variant="link" onClick={deactivateWallet}>
                <Text textStyle="walletAddress">{formatWalletAddress(account, 6, 4, 13)}</Text>
              </Button>
            ) : (
              <Text textStyle="walletAddress">{formatWalletAddress(account, 6, 4, 13)}</Text>
            )}
          </ChakraTooltip>
          <Button colorScheme="brand" ml={4}>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={
                "https://traderjoexyz.com/trade?outputCurrency=0x77777777777d4554c39223C354A05825b2E8Faa3#/"
              }
              style={{ outline: "none", textDecoration: "none" }}
            >
              Buy YETI
            </a>
          </Button>

          <Flex align="center" h={10} ml={4}>
            <Toggle
              options={[
                { key: "nosnow", value: " ⛅ " },
                { key: "snow", value: " ❄️ " }
              ]}
              size="md"
              onChange={onChange}
            />
          </Flex>
        </Flex>
        <Flex align="center" mt={[6, null, 0]}></Flex>
      </Flex>
    </>
  );
};

export default UserDetails;
