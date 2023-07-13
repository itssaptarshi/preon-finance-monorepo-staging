import React, { useEffect, useReducer } from "react";
import { useWeb3React } from "@web3-react/core";
import { AbstractConnector } from "@web3-react/abstract-connector";

import { injectedConnector, walletConnectConnector } from "../connectors/injectedConnector";
import { useAuthorizedConnection } from "../hooks/useAuthorizedConnection";

import UnconnectedApp from "../UnconnectedApp";

import { Box, Button, ButtonProps as ChakraButtonProps, Text } from "@chakra-ui/react";

import Icon from "./Icon";

interface MaybeHasMetaMask {
  ethereum?: {
    isMetaMask?: boolean;
  };
}

type ConnectionState =
  | { type: "inactive" }
  | {
      type: "activating" | "active" | "rejectedByUser" | "alreadyPending" | "failed";
      connector: AbstractConnector;
    };

type ConnectionAction =
  | { type: "startActivating"; connector: AbstractConnector }
  | { type: "fail"; error: Error }
  | { type: "finishActivating" | "retry" | "cancel" | "deactivate" };

export const connectionReducer: React.Reducer<ConnectionState, ConnectionAction> = (
  state,
  action
) => {
  switch (action.type) {
    case "startActivating":
      return {
        type: "activating",
        connector: action.connector
      };
    case "finishActivating":
      return {
        type: "active",
        connector: state.type === "inactive" ? injectedConnector : state.connector
      };
    case "fail":
      if (state.type !== "inactive") {
        return {
          type: action.error.message.match(/user rejected/i)
            ? "rejectedByUser"
            : action.error.message.match(/already pending/i)
            ? "alreadyPending"
            : "failed",
          connector: state.connector
        };
      }
      break;
    case "retry":
      if (state.type !== "inactive") {
        return {
          type: "activating",
          connector: state.connector
        };
      }
      break;
    case "cancel":
      return {
        type: "inactive"
      };
    case "deactivate":
      return {
        type: "inactive"
      };
  }

  console.warn("Ignoring connectionReducer action:");

  return state;
};

const detectMetaMask = () => (window as MaybeHasMetaMask).ethereum?.isMetaMask ?? false;

type WalletConnectorProps = {
  loader?: React.ReactNode;
};

const WalletConnector: React.FC<WalletConnectorProps> = ({ children, loader }) => {
  const { activate, deactivate, active, error, connector } = useWeb3React<unknown>();
  const triedAuthorizedConnection = useAuthorizedConnection();
  const [connectionState, dispatch] = useReducer(connectionReducer, { type: "inactive" });
  const isMetaMask = detectMetaMask();

  useEffect(() => {
    if (error) {
      dispatch({ type: "fail", error });
      deactivate();
    }
  }, [error, deactivate]);

  useEffect(() => {
    if (active) {
      dispatch({ type: "finishActivating" });
    } else {
      dispatch({ type: "deactivate" });
    }
  }, [active]);

  if (!triedAuthorizedConnection) {
    return <>{loader}</>;
  }

  if (connectionState.type === "active") {
    return <>{children}</>;
  }

  return (
    <UnconnectedApp
      failed={connectionState.type === "failed"}
      activating={connectionState.type === "activating"}
      rejectedByUser={connectionState.type === "rejectedByUser"}
      alreadyPending={connectionState.type === "alreadyPending"}
    />
  );
};

export const ConnectButton: React.FC<ChakraButtonProps> = props => {
  const { activate, deactivate, active, error } = useWeb3React<unknown>();
  const [connectionState, dispatch] = useReducer(connectionReducer, { type: "inactive" });
  const isMetaMask = detectMetaMask();

  return (
    <>
      <Button
        onClick={() => {
          dispatch({ type: "startActivating", connector: injectedConnector });
          activate(injectedConnector);
        }}
        variant="primary"
        width={300}
        {...props}
        leftIcon={<Icon iconName="MetaMaskIcon" h="10" />}
      >
        {isMetaMask ? (
          <>
            <Icon iconName="MetaMaskIcon" h="5" w="5" />
            <Text ml={2}>Connect with MetaMask</Text>
          </>
        ) : (
          <>
            <Icon name="plug" h="5" w="5" />
            <Text ml={2}>Connect wallet</Text>
          </>
        )}
      </Button>
      <Button
        onClick={() => {
          dispatch({ type: "startActivating", connector: walletConnectConnector });
          activate(walletConnectConnector);
        }}
        variant="primary"
        {...props}
        width={300}
        mt={5}
      >
        <>
          <Icon iconName="WalletConnect" h={5} w={5} />
          <Text ml={2}>Connect with WalletConnect</Text>
        </>
      </Button>
    </>
  );
};

export default WalletConnector;
