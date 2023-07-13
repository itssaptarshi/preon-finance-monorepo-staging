import { InjectedConnector } from "@web3-react/injected-connector";
import { WalletConnectConnector } from "@web3-react/walletconnect-connector";

export const injectedConnector = new InjectedConnector({});
export const walletConnectConnector = new WalletConnectConnector({
  rpc: { 137: "https://polygon-mainnet.g.alchemy.com/v2/RuQDsmTH-3DgZpUJrzC3tLyK2NN-UYCy" },
  qrcode: true
});
