// @ts-nocheck
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Provider } from "@ethersproject/abstract-provider";
import { getNetwork } from "@ethersproject/networks";
import { Web3Provider } from "@ethersproject/providers";
import { useWeb3React } from "@web3-react/core";

import { isBatchedProvider, isWebSocketAugmentedProvider } from "@liquity/providers";
import {
  BlockPolledLiquityStore,
  EthersLiquity,
  EthersLiquityWithStore,
  _connectByChainId
} from "@liquity/lib-ethers";

type LiquityContextValue = {
  account: string;
  provider: Web3Provider;
  liquity: EthersLiquityWithStore<BlockPolledLiquityStore>;
};

const LiquityContext = createContext<LiquityContextValue | undefined>(undefined);

type LiquityProviderProps = {
  loader?: React.ReactNode;
  unsupportedNetworkFallback?: (chainId: number) => React.ReactNode;
  unsupportedMainnetFallback?: React.ReactNode;
};

const wsParams = (network: string, infuraApiKey: string): [string, string] => [
  `wss://${network === "homestead" ? "mainnet" : network}.infura.io/ws/v3/${infuraApiKey}`,
  network
];

const supportedNetworks = ["fuji", "avalanche"];

export const LiquityProvider: React.FC<LiquityProviderProps> = ({
  children,
  loader,
  unsupportedNetworkFallback,
  unsupportedMainnetFallback
}) => {
  const { library: provider, account, chainId } = useWeb3React<Web3Provider>();
  const connection = useMemo(() => {
    if (provider && account && chainId) {
      try {
        return _connectByChainId(provider, provider.getSigner(account), chainId, {
          userAddress: account,
          useStore: "blockPolled"
        });
      } catch (e) {
        console.error(e);
      }
    }
  }, [provider, account, chainId]);

  useEffect(() => {
    if (connection) {
      const { provider, chainId } = connection;

      if (isBatchedProvider(provider) && provider.chainId !== chainId) {
        provider.chainId = chainId;
      }

      if (isWebSocketAugmentedProvider(provider)) {
        const network = getNetwork(chainId);

        // if (network.name && supportedNetworks.includes(network.name) && config.infuraApiKey) {
        //   provider.openWebSocket(...wsParams(network.name, config.infuraApiKey));
        // } else if (network.name === 'fuji'){
        //   provider.openWebSocket(`wss://avax.brkhrd.com/ext/bc/C/ws`, chainId);
        // } else if (connection._isDev) {

        //   provider.openWebSocket(`ws://${window.location.hostname}:8546`, chainId);
        // }

        return () => {
          provider.closeWebSocket();
        };
      }
    }
  }, [connection]);

  if (!provider || !account || !chainId) {
    return <>{loader}</>;
  }

  // if (config.testnetOnly && chainId === 1) {
  //   return <>{unsupportedMainnetFallback}</>;
  // }

  if (!connection) {
    return unsupportedNetworkFallback ? <>{unsupportedNetworkFallback(chainId)}</> : null;
  }

  const liquity = EthersLiquity._from(connection);
  liquity.store.logging = true;
  // console.log('provider', provider)
  return (
    <LiquityContext.Provider value={{ account, provider, liquity }}>
      {children}
    </LiquityContext.Provider>
  );
};

export const useLiquity = () => {
  const liquityContext = useContext(LiquityContext);

  if (!liquityContext) {
    throw new Error("You must provide a LiquityContext via LiquityProvider");
  }

  return liquityContext;
};
