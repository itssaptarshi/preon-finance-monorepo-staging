import React from "react";
import { TokenInfoContext } from "./context";
import fakedata from "./fakedata.json";

// TODO pull exchange rates from blockchain
// TODO add other important token info
const TokenInfoProvider: React.FC = ({ children }) => {
  return <TokenInfoContext.Provider value={fakedata as any}>{children}</TokenInfoContext.Provider>;
};

export default TokenInfoProvider;
