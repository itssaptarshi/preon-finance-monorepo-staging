const SECRETS_FILE = "../secrets.js";
const { secrets } = require(SECRETS_FILE);
const DEPLOYER = secrets["deployer"];

// const DEPLOYER = "0x31c57298578f7508B5982062cfEc5ec8BD346247"; // Mainnet test deployment address
// const DEPLOYER = "0xF3B8406d7b827e99Ede9Bd1dFfb43Cda17582001" // Mainnet test deployment address

const externalAddrs = {
  // https://data.chain.link/avalanche/mainnet/crypto-usd/avax-usd
  CHAINLINK_ETHUSD_PROXY: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0",
  CHAINLINK_USDCUSD_PROXY: "0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7",
  // https://docs.tellor.io/tellor/integration/reference-page
  TELLOR_MASTER: "0xFd45Ae72E81Adaaf01cC61c8bCe016b7060DD537",
  // https://uniswap.org/docs/v2/smart-contracts/factory/
  // Pangolin
  UNISWAP_V2_FACTORY: "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32",
  UNISWAP_V2_ROUTER02: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
  // CURVE_POOL_FACTORY: "0xb17b674d9c5cb2e441f8e196a2f048a81355d031",

  WETH_ERC20: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // wrapped matic
  stMATIC:"0x3A58a54C066FdC0f2D55FC9C89F0415C92eBf3C4", //stMATIC
  USD_PLUS : "0x236eeC6359fb44CCe8f97E99387aa7F8cd5cdE1f", //USD+
  wETH : "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", //wETH
  wBTC : "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", //wBTC
  iDai : "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", //iDAI
  iUSDC : "0x590Cd248e16466F747e74D4cfa6C48f597059704", //iUSDC
};

const liquityAddrsTest = {
  GENERAL_SAFE: "0x8be7e24263c199ebfcfd6aebca83f8d7ed85a5dd", // Hardhat dev address
  PREON_SAFE: "0x20c81d658aae3a8580d990e441a9ef2c9809be74", //  Hardhat dev address
  // PREON_SAFE:"0x66aB6D9362d4F35596279692F0251Db635165871",
  DEPLOYER: DEPLOYER, // Mainnet test deployment address
};

const liquityAddrs = {
  GENERAL_SAFE: "0x7B4a14CD122BFE2e717c27914a024D05eC3061B9", // TODO: Replace with team multisig
  PREON_SAFE: "0x41f8a18b165De90383bf23CbcE5c0244ECDeeaA7", // TODO: Replace with team multisig
  DEPLOYER: DEPLOYER,
};

const beneficiaries = {
  ADVISOR_A: { address: "0x96AC61b54cDB56fA7f1E30E6065E9fDFaB779dfF" },
  ADVISOR_B: { address: "0xeD9b765D6638BEfF21c12F595A1AE60d3830C07c" },
  ADVISOR_C: {
    address: "0x5E2e604dB6965A51ed0e50F8C7Ec91820317b8C6",
    unlockTime: 1664769600,
  },
  ADVISOR_D: {
    address: "0x98731Bd7Cd3824293C7373bDE0DDC22fbd7f4963",
    unlockTime: 1665460800,
  },
};

const OUTPUT_FILE = "./mainnetDeployment/finalDeploymentPolygon.json";

const TO_SAVE_FILENAME = "./mainnetDeployment/finalDeploymentPolygon.json";

const waitFunction = async () => {
  // Fast forward time 1000s (local mainnet fork only)
  ethers.provider.send("evm_increaseTime", [1000]);
  ethers.provider.send("evm_mine");
};

const GAS_PRICE = 265000000000;
const TX_CONFIRMATIONS = 1; // for local fork test

//C-chain explorer doesn't support verification api
//const ETHERSCAN_BASE_URL = 'https://cchain.explorer.avax-test.network/address'
const ETHERSCAN_BASE_URL = "https://polygonscan.com/address";

const TO_VERIFY = false; // whether to perform conract verification on etherscan

module.exports = {
  externalAddrs,
  liquityAddrs,
  beneficiaries,
  OUTPUT_FILE,
  TO_SAVE_FILENAME,
  waitFunction,
  GAS_PRICE,
  TX_CONFIRMATIONS,
  ETHERSCAN_BASE_URL,
  DEPLOYER,
  TO_VERIFY,
};
