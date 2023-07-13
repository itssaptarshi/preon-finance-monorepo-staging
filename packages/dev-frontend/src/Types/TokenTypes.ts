export type TokenData = {
  address: string;
  troveBalance: number;
  walletBalance: number;
  apr?: number;
  token: string;
  isStable: boolean;
  isVault: boolean;
  underlying: string;
  underlyingDecimals: number;
  tokenTooltip: string;
  feeTooltip: string;
  isDeprecated?: boolean;
  additionalFee?: number;
};

export type TokenDataMappingT = {
  [key: string]: TokenData;
};

export type TokenDataMappingA = {
  [key: string]: TokenData;
};
