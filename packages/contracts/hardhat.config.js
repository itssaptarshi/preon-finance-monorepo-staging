require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("solidity-coverage");
require("hardhat-gas-reporter");

require("@openzeppelin/hardhat-upgrades");
require("hardhat-contract-sizer");
// require("hardhat-abi-exporter");

const accounts = require("./hardhatAccountsList2k.js");
const accountsList = accounts.accountsList;

const fs = require("fs");
const getSecret = (secretKey, defaultValue = "") => {
  const SECRETS_FILE = "./secrets.js";
  let secret = defaultValue;
  if (fs.existsSync(SECRETS_FILE)) {
    const { secrets } = require(SECRETS_FILE);
    if (secrets[secretKey]) {
      secret = secrets[secretKey];
    }
  }

  return secret;
};
const alchemyUrl = () => {
  return `https://eth-mainnet.alchemyapi.io/v2/${getSecret("alchemyAPIKey")}`;
};

const alchemyUrlRinkeby = () => {
  return `https://eth-rinkeby.alchemyapi.io/v2/${getSecret(
    "alchemyAPIKeyRinkeby"
  )}`;
};

module.exports = {
  paths: {
    // contracts: "./contracts",
    // artifacts: "./artifacts"
  },
  solidity: {
    compilers: [
      {
        version: "0.4.23",
        settings: {
          optimizer: {
            enabled: true,
            runs: 2 ** 32 - 1,
          },
        },
      },
      {
        version: "0.5.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 2 ** 32 - 1,
          },
        },
      },
      {
        version: "0.6.11",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100,
          },
        },
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100,
          },
        },
      },
      {
        version: "0.6.11",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100,
          },
        },
      },
      {
        version: "0.8.2",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
            details: {
              yul: true,
            },
          },
        },
      },
    ],
  },
  defaultNetwork: "localhost",
  networks: {
    dev: {
      gas: 8 * 10 ** 6, // tx gas limit
      blockGasLimit: 8 * 10 ** 6, // Avalanche Gas Limit (added by @RoboPreon)
      gasPrice: 50537197095,
      allowUnlimitedContractSize: true,
      // chainId: 43114,
      chainId: 137,
      url: "http://localhost:8545",
      // accounts: [
      //   getSecret(
      //     "DEPLOYER_PRIVATEKEY",
      //     "0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f"
      //   ),
      //   getSecret("ACCOUNT2_PRIVATEKEY"),
      // ],
    },
    hardhat: {
      // gas: 8 * 10 ** 6, // tx gas limit
      // blockGasLimit: 8 * 10 ** 6, // Avalanche Gas Limit (added by @RoboPreon)
      gasPrice: 50537197095,
      allowUnlimitedContractSize: true,
      // chainId: 43114,
      // chainId: 137,
      chainId: 137, // for wagmi localhost connection
      // Uncomment when running normal tests, and comment when forking. set enabled to true
      //accounts: accountsList,
      forking: {
        enabled: true,
        // url: "https://api.avax.network/ext/bc/C/rpc", // Mainnet
        url: getSecret("ALCHEMY_KEY"), // Mainnet
        // blockNumber: 16978525,
        // url: "https://api.avax-test.network/ext/bc/C/rpc", // Testnet
        // blockNumber: 2672331,
      },
      // accounts: [
      //   {
      //     privateKey: getSecret("DEPLOYER_PRIVATEKEY"),
      //     balance: "100000000000000000000000000000",
      //   },
      //   {
      //     privateKey: getSecret("ACCOUNT2_PRIVATEKEY"),
      //     balance: "100000000000000000000000000000",
      //   },
      // ],
    },
    preon: {
      url: "https://preon-rpc.fmobuild.com/",
    },
    mainnet: {
      url: "https://polygon-rpc.com/",
      // gasPrice: process.env.GAS_PRICE
      //   ? parseInt(process.env.GAS_PRICE)
      //   : 500e9, // in wei
      gasLimit: 200e9,
      // gasLimit: 787385,
      // gasPrice: 150e9, // in wei
      // maxFeePerGas: 200e9,
      // maxPriorityFeePerGas: 50e9,
      accounts: [
        getSecret(
          "DEPLOYER_PRIVATEKEY",
          "0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f"
        ),
        getSecret(
          "ACCOUNT2_PRIVATEKEY",
          "0x3ec7cedbafd0cb9ec05bf9f7ccfa1e8b42b3e3a02c75addfccbfeb328d1b383b"
        ),
      ],
    },
    // mumbai: {
    //   url: getSecret("POLYGON_MUMBAI_RPC_URL"),
    //   // accounts: [getSecret("POLYGON_MUMBAI_PRIVATE_KEY")],
    //   chainId: 80001,
    // },
    rinkeby: {
      url: alchemyUrlRinkeby(),
      gas: 10000000, // tx gas limit
      // accounts: [
      //   getSecret(
      //     "RINKEBY_DEPLOYER_PRIVATEKEY",
      //     "0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f"
      //   ),
      // ],
    },
    avash: {
      url: "http://localhost:9650/ext/bc/C/rpc",
      gasPrice: 225000000000,
      chainId: 43112,
      accounts: [
        getSecret(
          "RINKEBY_DEPLOYER_PRIVATEKEY",
          "0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f"
        ),
      ],
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      gasPrice: 255000000000,
      chainId: 43113,
      accounts: [
        getSecret(
          "DEPLOYER_PRIVATEKEY",
          "0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f"
        ),
      ],
    },
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      gasPrice: 225000000000,
      chainId: 43114,
      accounts: [
        getSecret(
          "RINKEBY_DEPLOYER_PRIVATEKEY",
          "0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f"
        ),
      ],
    },
  },
  etherscan: {
    apiKey: getSecret("ETHERSCAN_API_KEY"),
  },
  mocha: { timeout: 12000000 },
  rpc: {
    host: "localhost",
    port: 8545,
  },
  gasReporter: {
    enabled: false,
    // enabled: (process.env.REPORT_GAS) ? true : false,
    currency: "USD",
    token: "AVAX",
    coinmarketcap: process.env.COINMARKETCAP_KEY,
    gasPriceApi:
      "https://api.snowtrace.io/api?module=proxy&action=eth_gasPrice",
    onlyCalledMethods: true,
  },
  // contractSizer: {
  //   alphaSort: false,
  //   disambiguatePaths: false,
  //   runOnCompile: true,
  //   strict: false,
  // },
  abiExporter: {
    path: "../lib-ethers/all_abi",
    pretty: false,
    clear: true,
    runOnCompile: true,
    flat: false,
  },
};
