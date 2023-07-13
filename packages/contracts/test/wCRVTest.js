const { artifacts, ethers, assert } = require("hardhat");
const deploymentHelper = require("../utils/deploymentHelpers.js");
const testHelpers = require("../utils/testHelpers.js");
const STARTokenTester = artifacts.require("./STARTokenTester.sol");
const PreonTokenTester = artifacts.require("./PREONTokenTester.sol");
let joeRouter;
let joeZap;
let joeMasterChef;
let WAVAX;
let WETH;
let WASSET;
let TOWRAP;
let SP;
let LRD;
let rewardTokens;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const routerABI = [
  {
    inputs: [
      { internalType: "address", name: "_factory", type: "address" },
      { internalType: "address", name: "_WAVAX", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "WAVAX",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenA", type: "address" },
      { internalType: "address", name: "tokenB", type: "address" },
      { internalType: "uint256", name: "amountADesired", type: "uint256" },
      { internalType: "uint256", name: "amountBDesired", type: "uint256" },
      { internalType: "uint256", name: "amountAMin", type: "uint256" },
      { internalType: "uint256", name: "amountBMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "addLiquidity",
    outputs: [
      { internalType: "uint256", name: "amountA", type: "uint256" },
      { internalType: "uint256", name: "amountB", type: "uint256" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "amountTokenDesired", type: "uint256" },
      { internalType: "uint256", name: "amountTokenMin", type: "uint256" },
      { internalType: "uint256", name: "amountAVAXMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "addLiquidityAVAX",
    outputs: [
      { internalType: "uint256", name: "amountToken", type: "uint256" },
      { internalType: "uint256", name: "amountAVAX", type: "uint256" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "factory",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "uint256", name: "reserveIn", type: "uint256" },
      { internalType: "uint256", name: "reserveOut", type: "uint256" },
    ],
    name: "getAmountIn",
    outputs: [{ internalType: "uint256", name: "amountIn", type: "uint256" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "reserveIn", type: "uint256" },
      { internalType: "uint256", name: "reserveOut", type: "uint256" },
    ],
    name: "getAmountOut",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
    ],
    name: "getAmountsIn",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
    ],
    name: "getAmountsOut",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountA", type: "uint256" },
      { internalType: "uint256", name: "reserveA", type: "uint256" },
      { internalType: "uint256", name: "reserveB", type: "uint256" },
    ],
    name: "quote",
    outputs: [{ internalType: "uint256", name: "amountB", type: "uint256" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenA", type: "address" },
      { internalType: "address", name: "tokenB", type: "address" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
      { internalType: "uint256", name: "amountAMin", type: "uint256" },
      { internalType: "uint256", name: "amountBMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "removeLiquidity",
    outputs: [
      { internalType: "uint256", name: "amountA", type: "uint256" },
      { internalType: "uint256", name: "amountB", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
      { internalType: "uint256", name: "amountTokenMin", type: "uint256" },
      { internalType: "uint256", name: "amountAVAXMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "removeLiquidityAVAX",
    outputs: [
      { internalType: "uint256", name: "amountToken", type: "uint256" },
      { internalType: "uint256", name: "amountAVAX", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
      { internalType: "uint256", name: "amountTokenMin", type: "uint256" },
      { internalType: "uint256", name: "amountAVAXMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "removeLiquidityAVAXSupportingFeeOnTransferTokens",
    outputs: [{ internalType: "uint256", name: "amountAVAX", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
      { internalType: "uint256", name: "amountTokenMin", type: "uint256" },
      { internalType: "uint256", name: "amountAVAXMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "bool", name: "approveMax", type: "bool" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "removeLiquidityAVAXWithPermit",
    outputs: [
      { internalType: "uint256", name: "amountToken", type: "uint256" },
      { internalType: "uint256", name: "amountAVAX", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
      { internalType: "uint256", name: "amountTokenMin", type: "uint256" },
      { internalType: "uint256", name: "amountAVAXMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "bool", name: "approveMax", type: "bool" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "removeLiquidityAVAXWithPermitSupportingFeeOnTransferTokens",
    outputs: [{ internalType: "uint256", name: "amountAVAX", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenA", type: "address" },
      { internalType: "address", name: "tokenB", type: "address" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
      { internalType: "uint256", name: "amountAMin", type: "uint256" },
      { internalType: "uint256", name: "amountBMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "bool", name: "approveMax", type: "bool" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "removeLiquidityWithPermit",
    outputs: [
      { internalType: "uint256", name: "amountA", type: "uint256" },
      { internalType: "uint256", name: "amountB", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapAVAXForExactTokens",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapExactAVAXForTokens",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapExactAVAXForTokensSupportingFeeOnTransferTokens",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForAVAX",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForAVAXSupportingFeeOnTransferTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForTokens",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForTokensSupportingFeeOnTransferTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "uint256", name: "amountInMax", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapTokensForExactAVAX",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "uint256", name: "amountInMax", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapTokensForExactTokens",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  { stateMutability: "payable", type: "receive" },
];
const zapABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    inputs: [],
    name: "DAI",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "JOE",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "USDT",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "WAVAX",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_joe", type: "address" },
      { internalType: "address", name: "_router", type: "address" },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_address", type: "address" }],
    name: "isLP",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "i", type: "uint256" }],
    name: "removeToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_address", type: "address" }],
    name: "routePair",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "setNotLP",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "asset", type: "address" },
      { internalType: "address", name: "route", type: "address" },
    ],
    name: "setRoutePairAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "sweep",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "tokens",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_to", type: "address" }],
    name: "zapIn",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_from", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address", name: "_to", type: "address" },
    ],
    name: "zapInToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_from", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "zapOut",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  { stateMutability: "payable", type: "receive" },
];
const ERC20ABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "chainId",
        type: "uint256",
      },
    ],
    name: "AddSupportedChainId",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "contractAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "supplyIncrement",
        type: "uint256",
      },
    ],
    name: "AddSwapToken",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "newBridgeRoleAddress",
        type: "address",
      },
    ],
    name: "MigrateBridgeRole",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "to", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "feeAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "feeAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "originTxId",
        type: "bytes32",
      },
    ],
    name: "Mint",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "contractAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "supplyDecrement",
        type: "uint256",
      },
    ],
    name: "RemoveSwapToken",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Swap",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "chainId",
        type: "uint256",
      },
    ],
    name: "Unwrap",
    type: "event",
  },
  {
    inputs: [{ internalType: "uint256", name: "chainId", type: "uint256" }],
    name: "addSupportedChainId",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "contractAddress", type: "address" },
      { internalType: "uint256", name: "supplyIncrement", type: "uint256" },
    ],
    name: "addSwapToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "burn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "burnFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "chainIds",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "subtractedValue", type: "uint256" },
    ],
    name: "decreaseAllowance",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "addedValue", type: "uint256" },
    ],
    name: "increaseAllowance",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newBridgeRoleAddress",
        type: "address",
      },
    ],
    name: "migrateBridgeRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address", name: "feeAddress", type: "address" },
      { internalType: "uint256", name: "feeAmount", type: "uint256" },
      { internalType: "bytes32", name: "originTxId", type: "bytes32" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "contractAddress", type: "address" },
      { internalType: "uint256", name: "supplyDecrement", type: "uint256" },
    ],
    name: "removeSwapToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "swap",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "swapSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "chainId", type: "uint256" },
    ],
    name: "unwrap",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];
const WAVAXABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "src", type: "address" },
      { indexed: true, internalType: "address", name: "guy", type: "address" },
      { indexed: false, internalType: "uint256", name: "wad", type: "uint256" },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "dst", type: "address" },
      { indexed: false, internalType: "uint256", name: "wad", type: "uint256" },
    ],
    name: "Deposit",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "src", type: "address" },
      { indexed: true, internalType: "address", name: "dst", type: "address" },
      { indexed: false, internalType: "uint256", name: "wad", type: "uint256" },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "src", type: "address" },
      { indexed: false, internalType: "uint256", name: "wad", type: "uint256" },
    ],
    name: "Withdrawal",
    type: "event",
  },
  { payable: true, stateMutability: "payable", type: "fallback" },
  {
    constant: true,
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "address", name: "", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "guy", type: "address" },
      { internalType: "uint256", name: "wad", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [],
    name: "deposit",
    outputs: [],
    payable: true,
    stateMutability: "payable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "dst", type: "address" },
      { internalType: "uint256", name: "wad", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "src", type: "address" },
      { internalType: "address", name: "dst", type: "address" },
      { internalType: "uint256", name: "wad", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ internalType: "uint256", name: "wad", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];
const joePairABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
      { indexed: true, internalType: "address", name: "to", type: "address" },
    ],
    name: "Burn",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
    ],
    name: "Mint",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0In",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1In",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0Out",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1Out",
        type: "uint256",
      },
      { indexed: true, internalType: "address", name: "to", type: "address" },
    ],
    name: "Swap",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint112",
        name: "reserve0",
        type: "uint112",
      },
      {
        indexed: false,
        internalType: "uint112",
        name: "reserve1",
        type: "uint112",
      },
    ],
    name: "Sync",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [],
    name: "DOMAIN_SEPARATOR",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MINIMUM_LIQUIDITY",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "PERMIT_TYPEHASH",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "address", name: "", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "to", type: "address" }],
    name: "burn",
    outputs: [
      { internalType: "uint256", name: "amount0", type: "uint256" },
      { internalType: "uint256", name: "amount1", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "factory",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getReserves",
    outputs: [
      { internalType: "uint112", name: "_reserve0", type: "uint112" },
      { internalType: "uint112", name: "_reserve1", type: "uint112" },
      { internalType: "uint32", name: "_blockTimestampLast", type: "uint32" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_token0", type: "address" },
      { internalType: "address", name: "_token1", type: "address" },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "kLast",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "to", type: "address" }],
    name: "mint",
    outputs: [{ internalType: "uint256", name: "liquidity", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "nonces",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "permit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "price0CumulativeLast",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "price1CumulativeLast",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "to", type: "address" }],
    name: "skim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amount0Out", type: "uint256" },
      { internalType: "uint256", name: "amount1Out", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "swap",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "sync",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "token0",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token1",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];
const crvlpTokenABI = [
  {
    name: "Transfer",
    inputs: [
      { name: "_from", type: "address", indexed: true },
      { name: "_to", type: "address", indexed: true },
      { name: "_value", type: "uint256", indexed: false },
    ],
    anonymous: false,
    type: "event",
  },
  {
    name: "Approval",
    inputs: [
      { name: "_owner", type: "address", indexed: true },
      { name: "_spender", type: "address", indexed: true },
      { name: "_value", type: "uint256", indexed: false },
    ],
    anonymous: false,
    type: "event",
  },
  {
    stateMutability: "nonpayable",
    type: "constructor",
    inputs: [
      { name: "_name", type: "string" },
      { name: "_symbol", type: "string" },
    ],
    outputs: [],
  },
  {
    stateMutability: "view",
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    gas: 288,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "transfer",
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    gas: 77340,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "transferFrom",
    inputs: [
      { name: "_from", type: "address" },
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    gas: 115282,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "approve",
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    gas: 37821,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "increaseAllowance",
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_added_value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    gas: 40365,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "decreaseAllowance",
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_subtracted_value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    gas: 40389,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "mint",
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    gas: 79579,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "burnFrom",
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    gas: 79597,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "set_minter",
    inputs: [{ name: "_minter", type: "address" }],
    outputs: [],
    gas: 37785,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "set_name",
    inputs: [
      { name: "_name", type: "string" },
      { name: "_symbol", type: "string" },
    ],
    outputs: [],
    gas: 181606,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    gas: 12990,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    gas: 10743,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "arg0", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    gas: 2963,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "allowance",
    inputs: [
      { name: "arg0", type: "address" },
      { name: "arg1", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    gas: 3208,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    gas: 2808,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "minter",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    gas: 2838,
  },
];
const gaugeABI = [
  {
    name: "Deposit",
    inputs: [
      { name: "provider", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
    anonymous: false,
    type: "event",
  },
  {
    name: "Withdraw",
    inputs: [
      { name: "provider", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
    anonymous: false,
    type: "event",
  },
  {
    name: "CommitOwnership",
    inputs: [{ name: "admin", type: "address", indexed: false }],
    anonymous: false,
    type: "event",
  },
  {
    name: "ApplyOwnership",
    inputs: [{ name: "admin", type: "address", indexed: false }],
    anonymous: false,
    type: "event",
  },
  {
    name: "Transfer",
    inputs: [
      { name: "_from", type: "address", indexed: true },
      { name: "_to", type: "address", indexed: true },
      { name: "_value", type: "uint256", indexed: false },
    ],
    anonymous: false,
    type: "event",
  },
  {
    name: "Approval",
    inputs: [
      { name: "_owner", type: "address", indexed: true },
      { name: "_spender", type: "address", indexed: true },
      { name: "_value", type: "uint256", indexed: false },
    ],
    anonymous: false,
    type: "event",
  },
  {
    stateMutability: "nonpayable",
    type: "constructor",
    inputs: [
      { name: "_admin", type: "address" },
      { name: "_lp_token", type: "address" },
    ],
    outputs: [],
  },
  {
    stateMutability: "view",
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    gas: 288,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "reward_contract",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    gas: 2628,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "last_claim",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    gas: 2454,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "claimed_reward",
    inputs: [
      { name: "_addr", type: "address" },
      { name: "_token", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    gas: 2976,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "claimable_reward",
    inputs: [
      { name: "_addr", type: "address" },
      { name: "_token", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    gas: 2944,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "claimable_reward_write",
    inputs: [
      { name: "_addr", type: "address" },
      { name: "_token", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    gas: 2067577,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "set_rewards_receiver",
    inputs: [{ name: "_receiver", type: "address" }],
    outputs: [],
    gas: 35643,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "claim_rewards",
    inputs: [],
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "claim_rewards",
    inputs: [{ name: "_addr", type: "address" }],
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "claim_rewards",
    inputs: [
      { name: "_addr", type: "address" },
      { name: "_receiver", type: "address" },
    ],
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "deposit",
    inputs: [{ name: "_value", type: "uint256" }],
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "deposit",
    inputs: [
      { name: "_value", type: "uint256" },
      { name: "_addr", type: "address" },
    ],
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "deposit",
    inputs: [
      { name: "_value", type: "uint256" },
      { name: "_addr", type: "address" },
      { name: "_claim_rewards", type: "bool" },
    ],
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "withdraw",
    inputs: [{ name: "_value", type: "uint256" }],
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "withdraw",
    inputs: [
      { name: "_value", type: "uint256" },
      { name: "_claim_rewards", type: "bool" },
    ],
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "transfer",
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    gas: 8092437,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "transferFrom",
    inputs: [
      { name: "_from", type: "address" },
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    gas: 8130387,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "approve",
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    gas: 38091,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "increaseAllowance",
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_added_value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    gas: 40635,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "decreaseAllowance",
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_subtracted_value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    gas: 40659,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "set_rewards",
    inputs: [
      { name: "_reward_contract", type: "address" },
      { name: "_claim_sig", type: "bytes32" },
      { name: "_reward_tokens", type: "address[8]" },
    ],
    outputs: [],
    gas: 4442580,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "commit_transfer_ownership",
    inputs: [{ name: "addr", type: "address" }],
    outputs: [],
    gas: 39375,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "accept_transfer_ownership",
    inputs: [],
    outputs: [],
    gas: 39320,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "lp_token",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    gas: 2928,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "arg0", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    gas: 3173,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    gas: 2988,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "allowance",
    inputs: [
      { name: "arg0", type: "address" },
      { name: "arg1", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    gas: 3448,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    gas: 13350,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    gas: 11103,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "reward_tokens",
    inputs: [{ name: "arg0", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    gas: 3217,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "reward_balances",
    inputs: [{ name: "arg0", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    gas: 3353,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "rewards_receiver",
    inputs: [{ name: "arg0", type: "address" }],
    outputs: [{ name: "", type: "address" }],
    gas: 3383,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "claim_sig",
    inputs: [],
    outputs: [{ name: "", type: "bytes" }],
    gas: 11223,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "reward_integral",
    inputs: [{ name: "arg0", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    gas: 3443,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "reward_integral_for",
    inputs: [
      { name: "arg0", type: "address" },
      { name: "arg1", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    gas: 3688,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "admin",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    gas: 3288,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "future_admin",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    gas: 3318,
  },
];
const crvPoolABI = [
  {
    name: "TokenExchange",
    inputs: [
      { name: "buyer", type: "address", indexed: true },
      { name: "sold_id", type: "int128", indexed: false },
      { name: "tokens_sold", type: "uint256", indexed: false },
      { name: "bought_id", type: "int128", indexed: false },
      { name: "tokens_bought", type: "uint256", indexed: false },
    ],
    anonymous: false,
    type: "event",
  },
  {
    name: "TokenExchangeUnderlying",
    inputs: [
      { name: "buyer", type: "address", indexed: true },
      { name: "sold_id", type: "int128", indexed: false },
      { name: "tokens_sold", type: "uint256", indexed: false },
      { name: "bought_id", type: "int128", indexed: false },
      { name: "tokens_bought", type: "uint256", indexed: false },
    ],
    anonymous: false,
    type: "event",
  },
  {
    name: "AddLiquidity",
    inputs: [
      { name: "provider", type: "address", indexed: true },
      { name: "token_amounts", type: "uint256[3]", indexed: false },
      { name: "fees", type: "uint256[3]", indexed: false },
      { name: "invariant", type: "uint256", indexed: false },
      { name: "token_supply", type: "uint256", indexed: false },
    ],
    anonymous: false,
    type: "event",
  },
  {
    name: "RemoveLiquidity",
    inputs: [
      { name: "provider", type: "address", indexed: true },
      { name: "token_amounts", type: "uint256[3]", indexed: false },
      { name: "fees", type: "uint256[3]", indexed: false },
      { name: "token_supply", type: "uint256", indexed: false },
    ],
    anonymous: false,
    type: "event",
  },
  {
    name: "RemoveLiquidityOne",
    inputs: [
      { name: "provider", type: "address", indexed: true },
      { name: "token_amount", type: "uint256", indexed: false },
      { name: "coin_amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
    type: "event",
  },
  {
    name: "RemoveLiquidityImbalance",
    inputs: [
      { name: "provider", type: "address", indexed: true },
      { name: "token_amounts", type: "uint256[3]", indexed: false },
      { name: "fees", type: "uint256[3]", indexed: false },
      { name: "invariant", type: "uint256", indexed: false },
      { name: "token_supply", type: "uint256", indexed: false },
    ],
    anonymous: false,
    type: "event",
  },
  {
    name: "CommitNewAdmin",
    inputs: [
      { name: "deadline", type: "uint256", indexed: true },
      { name: "admin", type: "address", indexed: true },
    ],
    anonymous: false,
    type: "event",
  },
  {
    name: "NewAdmin",
    inputs: [{ name: "admin", type: "address", indexed: true }],
    anonymous: false,
    type: "event",
  },
  {
    name: "CommitNewFee",
    inputs: [
      { name: "deadline", type: "uint256", indexed: true },
      { name: "fee", type: "uint256", indexed: false },
      { name: "admin_fee", type: "uint256", indexed: false },
      { name: "offpeg_fee_multiplier", type: "uint256", indexed: false },
    ],
    anonymous: false,
    type: "event",
  },
  {
    name: "NewFee",
    inputs: [
      { name: "fee", type: "uint256", indexed: false },
      { name: "admin_fee", type: "uint256", indexed: false },
      { name: "offpeg_fee_multiplier", type: "uint256", indexed: false },
    ],
    anonymous: false,
    type: "event",
  },
  {
    name: "RampA",
    inputs: [
      { name: "old_A", type: "uint256", indexed: false },
      { name: "new_A", type: "uint256", indexed: false },
      { name: "initial_time", type: "uint256", indexed: false },
      { name: "future_time", type: "uint256", indexed: false },
    ],
    anonymous: false,
    type: "event",
  },
  {
    name: "StopRampA",
    inputs: [
      { name: "A", type: "uint256", indexed: false },
      { name: "t", type: "uint256", indexed: false },
    ],
    anonymous: false,
    type: "event",
  },
  {
    stateMutability: "nonpayable",
    type: "constructor",
    inputs: [
      { name: "_coins", type: "address[3]" },
      { name: "_underlying_coins", type: "address[3]" },
      { name: "_pool_token", type: "address" },
      { name: "_A", type: "uint256" },
      { name: "_fee", type: "uint256" },
      { name: "_admin_fee", type: "uint256" },
      { name: "_offpeg_fee_multiplier", type: "uint256" },
    ],
    outputs: [],
  },
  {
    stateMutability: "view",
    type: "function",
    name: "A",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    gas: 10374,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "A_precise",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    gas: 10336,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "dynamic_fee",
    inputs: [
      { name: "i", type: "int128" },
      { name: "j", type: "int128" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    gas: 21857,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "balances",
    inputs: [{ name: "i", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    gas: 7230,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "get_virtual_price",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    gas: 2701683,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "calc_token_amount",
    inputs: [
      { name: "_amounts", type: "uint256[3]" },
      { name: "is_deposit", type: "bool" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    gas: 5367778,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "add_liquidity",
    inputs: [
      { name: "_amounts", type: "uint256[3]" },
      { name: "_min_mint_amount", type: "uint256" },
      { name: "_use_underlying", type: "bool" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    stateMutability: "view",
    type: "function",
    name: "get_dy",
    inputs: [
      { name: "i", type: "int128" },
      { name: "j", type: "int128" },
      { name: "dx", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    gas: 6288606,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "get_dy_underlying",
    inputs: [
      { name: "i", type: "int128" },
      { name: "j", type: "int128" },
      { name: "dx", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    gas: 6288636,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "exchange",
    inputs: [
      { name: "i", type: "int128" },
      { name: "j", type: "int128" },
      { name: "dx", type: "uint256" },
      { name: "min_dy", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    gas: 6464164,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "exchange_underlying",
    inputs: [
      { name: "i", type: "int128" },
      { name: "j", type: "int128" },
      { name: "dx", type: "uint256" },
      { name: "min_dy", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    gas: 6483014,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "remove_liquidity",
    inputs: [
      { name: "_amount", type: "uint256" },
      { name: "_min_amounts", type: "uint256[3]" },
    ],
    outputs: [{ name: "", type: "uint256[3]" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "remove_liquidity",
    inputs: [
      { name: "_amount", type: "uint256" },
      { name: "_min_amounts", type: "uint256[3]" },
      { name: "_use_underlying", type: "bool" },
    ],
    outputs: [{ name: "", type: "uint256[3]" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "remove_liquidity_imbalance",
    inputs: [
      { name: "_amounts", type: "uint256[3]" },
      { name: "_max_burn_amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "remove_liquidity_imbalance",
    inputs: [
      { name: "_amounts", type: "uint256[3]" },
      { name: "_max_burn_amount", type: "uint256" },
      { name: "_use_underlying", type: "bool" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    stateMutability: "view",
    type: "function",
    name: "calc_withdraw_one_coin",
    inputs: [
      { name: "_token_amount", type: "uint256" },
      { name: "i", type: "int128" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    gas: 4490262,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "remove_liquidity_one_coin",
    inputs: [
      { name: "_token_amount", type: "uint256" },
      { name: "i", type: "int128" },
      { name: "_min_amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "remove_liquidity_one_coin",
    inputs: [
      { name: "_token_amount", type: "uint256" },
      { name: "i", type: "int128" },
      { name: "_min_amount", type: "uint256" },
      { name: "_use_underlying", type: "bool" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "ramp_A",
    inputs: [
      { name: "_future_A", type: "uint256" },
      { name: "_future_time", type: "uint256" },
    ],
    outputs: [],
    gas: 159459,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "stop_ramp_A",
    inputs: [],
    outputs: [],
    gas: 154920,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "commit_new_fee",
    inputs: [
      { name: "new_fee", type: "uint256" },
      { name: "new_admin_fee", type: "uint256" },
      { name: "new_offpeg_fee_multiplier", type: "uint256" },
    ],
    outputs: [],
    gas: 148809,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "apply_new_fee",
    inputs: [],
    outputs: [],
    gas: 141271,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "revert_new_parameters",
    inputs: [],
    outputs: [],
    gas: 23012,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "commit_transfer_ownership",
    inputs: [{ name: "_owner", type: "address" }],
    outputs: [],
    gas: 77050,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "apply_transfer_ownership",
    inputs: [],
    outputs: [],
    gas: 65727,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "revert_transfer_ownership",
    inputs: [],
    outputs: [],
    gas: 23102,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "withdraw_admin_fees",
    inputs: [],
    outputs: [],
    gas: 90405,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "donate_admin_fees",
    inputs: [],
    outputs: [],
    gas: 63231,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "kill_me",
    inputs: [],
    outputs: [],
    gas: 40385,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "unkill_me",
    inputs: [],
    outputs: [],
    gas: 23222,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "set_aave_referral",
    inputs: [{ name: "referral_code", type: "uint256" }],
    outputs: [],
    gas: 38352,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "set_reward_receiver",
    inputs: [{ name: "_reward_receiver", type: "address" }],
    outputs: [],
    gas: 38385,
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "set_admin_fee_receiver",
    inputs: [{ name: "_admin_fee_receiver", type: "address" }],
    outputs: [],
    gas: 38415,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "coins",
    inputs: [{ name: "arg0", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    gas: 3333,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "underlying_coins",
    inputs: [{ name: "arg0", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    gas: 3363,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "admin_balances",
    inputs: [{ name: "arg0", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    gas: 3393,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "fee",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    gas: 3378,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "offpeg_fee_multiplier",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    gas: 3408,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "admin_fee",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    gas: 3438,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    gas: 3468,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "lp_token",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    gas: 3498,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "initial_A",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    gas: 3528,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "future_A",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    gas: 3558,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "initial_A_time",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    gas: 3588,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "future_A_time",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    gas: 3618,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "admin_actions_deadline",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    gas: 3648,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "transfer_ownership_deadline",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    gas: 3678,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "future_fee",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    gas: 3708,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "future_admin_fee",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    gas: 3738,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "future_offpeg_fee_multiplier",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    gas: 3768,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "future_owner",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    gas: 3798,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "reward_receiver",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    gas: 3828,
  },
  {
    stateMutability: "view",
    type: "function",
    name: "admin_fee_receiver",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    gas: 3858,
  },
];
const th = testHelpers.TestHelper;
const dec = th.dec;
const toBN = th.toBN;
const getDifference = th.getDifference;
const assertRevert = th.assertRevert;
const mv = testHelpers.MoneyValues;
const MAXINT = dec(10, 36);

const STARToken = artifacts.require("STARToken");
const PreonToken = artifacts.require("PREONToken");
const sPREONToken = artifacts.require("./sPREONToken.sol");
const sPREONTokenTester = artifacts.require("./sPREONTokenTester.sol");

console.log("");
console.log("All tests will fail if mainnet not forked in hardhat.config.js");
console.log(
  "Also may need to change hardhat.config.js file in the hardhat section under networks to enable forking "
);
console.log("");

contract("wCRV Test", async (accounts) => {
  const [
    owner,
    alice,
    bob,
    carol,
    dennis,
    erin,
    freddy,
    greta,
    harry,
    ida,
    A,
    B,
    C,
    D,
    E,
    whale,
    defaulter_1,
    defaulter_2,
    defaulter_3,
    defaulter_4,
  ] = accounts;

  const [bountyAddress, lpRewardsAddress, multisig] = [
    defaulter_1,
    defaulter_2,
    defaulter_3,
  ];

  let starToken;
  let preonToken;
  let sPreonToken;

  let contracts;

  beforeEach(async () => {
    contracts = await deploymentHelper.deployLiquityCore();
    contracts.starToken = await STARTokenTester.new(
      contracts.troveManager.address,
      contracts.troveManagerLiquidations.address,
      contracts.troveManagerRedemptions.address,
      contracts.stabilityPool.address,
      contracts.borrowerOperations.address
    );
    const PREONContracts = await deploymentHelper.deployPREONTesterContractsHardhat(
      bountyAddress,
      lpRewardsAddress,
      multisig
    );
    WAVAX = new ethers.Contract(
      "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      (abi = WAVAXABI),
      (signer = await hre.ethers.getSigner(harry))
    );
    WETH = new ethers.Contract(
      "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
      (abi = ERC20ABI),
      (signer = await hre.ethers.getSigner(harry))
    );
    CRV = new ethers.Contract(
      "0x47536f17f4ff30e64a96a7555826b8f9e66ec468",
      (abi = ERC20ABI),
      (signer = await hre.ethers.getSigner(harry))
    );
    USDC = new ethers.Contract(
      "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
      (abi = ERC20ABI),
      (signer = await hre.ethers.getSigner(harry))
    );
    joeRouter = new ethers.Contract(
      "0x60aE616a2155Ee3d9A68541Ba4544862310933d4",
      (abi = routerABI),
      (signer = await hre.ethers.getSigner(harry))
    );
    joeZap = new ethers.Contract(
      "0x2C7B8e971c704371772eDaf16e0dB381A8D02027",
      (abi = zapABI),
      (signer = await hre.ethers.getSigner(harry))
    );
    gauge = new ethers.Contract(
      "0x5B5CFE992AdAC0C9D48E05854B2d91C73a003858",
      (abi = gaugeABI),
      (signer = await hre.ethers.getSigner(harry))
    );
    crvPool = new ethers.Contract(
      "0x7f90122BF0700F9E7e1F688fe926940E8839F353",
      (abi = crvPoolABI),
      (signer = await hre.ethers.getSigner(harry))
    );
    TOWRAP = new ethers.Contract(
      "0x1337BedC9D22ecbe766dF105c9623922A27963EC",
      (abi = crvlpTokenABI),
      (signer = await hre.ethers.getSigner(harry))
    );
    await deploymentHelper.connectPREONContracts(PREONContracts);
    await deploymentHelper.connectCoreContracts(contracts, PREONContracts);
    await deploymentHelper.connectPREONContractsToCore(
      PREONContracts,
      contracts
    );
    const WRAPPERS = await deploymentHelper.deployAssetWrappers();
    WASSET = WRAPPERS.wCRV_3crv;
    rewardTokens = [
      "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      "0x47536f17f4ff30e64a96a7555826b8f9e66ec468",
    ];
    // console.log(WRAPPERS)
    await WASSET.setAddresses(
      contracts.activePool.address,
      contracts.troveManagerLiquidations.address,
      contracts.troveManagerRedemptions.address,
      contracts.defaultPool.address,
      contracts.stabilityPool.address,
      PREONContracts.preonFinanceTreasury.address
    );
    SP = contracts.stabilityPool.address;
    LRD = contracts.troveManagerLiquidations.address;
    // await network.provider.send("hardhat_setBalance", [
    //   harry,
    //   "0x84595161401484A000000",
    // ]);
    await network.provider.send("hardhat_setBalance", [
      SP,
      "0x84595161401484A000000",
    ]);
    await network.provider.send("hardhat_setBalance", [
      LRD,
      "0x84595161401484A000000",
    ]);
    await network.provider.send("hardhat_impersonateAccount", [SP]);
    await network.provider.send("hardhat_impersonateAccount", [LRD]);
    // console.log("pre WAVAX/WETH", (await WAVAX.balanceOf(harry)).toString(), (await WETH.balanceOf(harry)).toString())
    // await WAVAX.deposit({value: dec(10000, 18)})
    // await joeRouter.swapAVAXForExactTokens(dec(1000,18), [WAVAX.address, WETH.address], harry, MAXINT, {value: dec(1000000, 18), from: harry})
    // makeTOWRAP(harry)
    // console.log("post WAVAX/WETH", (await WAVAX.balanceOf(harry)).toString(), (await WETH.balanceOf(harry)).toString())

    // await WAVAX.approve(joeRouter.address, MAXINT, { from: harry })
    // await WETH.approve(joeRouter.address, MAXINT, { from: harry })
    // await joeRouter.addLiquidity(WAVAX.address, WETH.address, await WAVAX.balanceOf(harry), await WETH.balanceOf(harry), 0, 0, harry, MAXINT, { from: harry })
    // await TOWRAP.approve(WASSET.address, MAXINT, { from: harry });
    // console.log("Done beforeeach")
  });

  async function makeTOWRAP(accountSigner) {
    await network.provider.send("hardhat_setBalance", [
      accountSigner,
      "0x84595161401484A000000",
    ]);
    WAVAX = new ethers.Contract(
      "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      (abi = WAVAXABI),
      (signer = await hre.ethers.getSigner(accountSigner))
    );
    TOWRAP = new ethers.Contract(
      "0x1337BedC9D22ecbe766dF105c9623922A27963EC",
      (abi = crvlpTokenABI),
      (signer = await hre.ethers.getSigner(accountSigner))
    );
    crvPool = new ethers.Contract(
      "0x7f90122BF0700F9E7e1F688fe926940E8839F353",
      (abi = crvPoolABI),
      (signer = await hre.ethers.getSigner(accountSigner))
    );
    joeRouter = new ethers.Contract(
      "0x60aE616a2155Ee3d9A68541Ba4544862310933d4",
      (abi = routerABI),
      (signer = await hre.ethers.getSigner(accountSigner))
    );
    USDC = new ethers.Contract(
      "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
      (abi = ERC20ABI),
      (signer = await hre.ethers.getSigner(accountSigner))
    );
    await joeRouter.swapExactAVAXForTokens(
      0,
      [WAVAX.address, USDC.address],
      accountSigner,
      MAXINT,
      { value: dec(1000000, 18), from: accountSigner }
    );
    USDC.approve(crvPool.address, MAXINT);
    await crvPool.add_liquidity(
      [0, await USDC.balanceOf(signer.address), 0],
      0,
      true
    );
    // console.log("add liquidity")
    await TOWRAP.approve(WASSET.address, MAXINT);
    // console.log("post WAVAX/WETH", (await WAVAX.balanceOf(accountSigner)).toString(), (await WETH.balanceOf(accountSigner)).toString())
  }

  it("Testing wrapper wraps and unwraps properly", async () => {
    await makeTOWRAP(harry);
    toWrapBalance = await TOWRAP.balanceOf(harry);
    console.log("TOWRAP Balance", toWrapBalance.toString());
    WASSET.wrap(toWrapBalance, SP, { from: harry });
    assert.equal(await TOWRAP.balanceOf(WASSET.address), 0);
    WASSETBalance = await WASSET.balanceOf(SP);
    console.log("WASSET Balance", WASSETBalance.toString());
    assert.equal(WASSETBalance.toString(), toWrapBalance.toString());
    await WASSET.updateReward(harry, ZERO_ADDRESS, toWrapBalance, {
      from: LRD,
    });
    await WASSET.unwrapFor(harry, toWrapBalance, { from: SP });
    aftertoWrapBalance = await TOWRAP.balanceOf(harry);
    afterWASSETBalance = await WASSET.balanceOf(SP);
    console.log("afterTOWRAP Balance", aftertoWrapBalance.toString());
    console.log("afterWASSET Balance", afterWASSETBalance.toString());
    assert.equal(aftertoWrapBalance.toString(), toWrapBalance.toString());
  });

  it("Testing reward is always increasing overtime", async () => {
    await makeTOWRAP(harry);
    beforeWAVAXBalance = await WAVAX.balanceOf(harry);
    toWrapBalance = await TOWRAP.balanceOf(harry);
    console.log("TOWRAP Balance", toWrapBalance.toString());
    WASSET.wrap(toWrapBalance, harry, { from: harry });
    assert.equal(await TOWRAP.balanceOf(WASSET.address), 0);
    WASSETBalance = await WASSET.balanceOf(harry);
    console.log("WASSET Balance", WASSETBalance.toString());
    assert.equal(WASSETBalance.toString(), toWrapBalance.toString());
    await network.provider.send("evm_increaseTime", [60 * 60 * 24 * 180]);
    //await WASSET.updateReward(harry, ZERO_ADDRESS, toWrapBalance, { from: LRD})
    await WASSET.unwrap(toWrapBalance, { from: harry });
    aftertoWrapBalance = await TOWRAP.balanceOf(harry);
    afterWASSETBalance = await WASSET.balanceOf(harry);
    afterWAVAXBalance = await WAVAX.balanceOf(harry);
    console.log("afterTOWRAP Balance", aftertoWrapBalance.toString());
    console.log("afterWASSET Balance", afterWASSETBalance.toString());
    assert(afterWASSETBalance.gt(beforeWAVAXBalance));
    assert(aftertoWrapBalance.gt(toWrapBalance));
  });

  it("Testing wrapper wraps and unwraps properly multiple users", async () => {
    await makeTOWRAP(harry);
    await makeTOWRAP(alice);

    toWrapBalanceH = await TOWRAP.balanceOf(harry);
    await WASSET.wrap(toWrapBalanceH, SP, { from: harry });
    console.log(
      "total supply after harry wrap " + (await WASSET.totalSupply()).toString()
    );
    console.log("TOWRAP Balance", toWrapBalanceH.toString());
    // assert.equal(await TOWRAP.balanceOf(WASSET.address), 0)

    toWrapBalanceA = await TOWRAP.balanceOf(alice);
    await WASSET.wrap(toWrapBalanceA, SP, { from: alice });
    console.log(
      "total supply after alice wrap " + (await WASSET.totalSupply()).toString()
    );
    console.log("TOWRAP Balance", toWrapBalanceA.toString());
    // assert.equal(await TOWRAP.balanceOf(WASSET.address), 0)

    await makeTOWRAP(bob);
    // console.log(await joeMasterChef.userInfo(26, WASSET.address), toWrapBalanceA)
    await WASSET.updateReward(alice, ZERO_ADDRESS, toWrapBalanceA, {
      from: LRD,
    });
    console.log(
      "total supply after alice update " +
        (await WASSET.totalSupply()).toString()
    );

    await WASSET.unwrapFor(alice, toWrapBalanceA, { from: SP });
    console.log(
      "total supply after alice unwrap " +
        (await WASSET.totalSupply()).toString()
    );
    aftertoWrapBalanceA = await TOWRAP.balanceOf(alice);
    // assert.equal(aftertoWrapBalanceA.toString(),toWrapBalanceA.toString())
    assert(aftertoWrapBalanceA.gte(toWrapBalanceA));
    toWrapBalanceB = await TOWRAP.balanceOf(bob);
    await WASSET.wrap(toWrapBalanceB, SP, { from: bob });
    console.log(
      "total supply after bob wrap " + (await WASSET.totalSupply()).toString()
    );
    console.log("TOWRAP Balance", toWrapBalanceB.toString());
    // assert.equal(await TOWRAP.balanceOf(WASSET.address), 0)

    // console.log(await joeMasterChef.userInfo(26, WASSET.address), toWrapBalanceB)
    await WASSET.updateReward(bob, ZERO_ADDRESS, toWrapBalanceB, { from: LRD });
    await WASSET.unwrapFor(bob, toWrapBalanceB, { from: SP });
    aftertoWrapBalanceB = await TOWRAP.balanceOf(bob);
    // assert.equal(aftertoWrapBalanceB.toString(),toWrapBalanceB.toString())
    assert(aftertoWrapBalanceB.gte(toWrapBalanceB));
    // console.log(await joeMasterChef.userInfo(26, WASSET.address), toWrapBalanceH)
    await WASSET.updateReward(harry, ZERO_ADDRESS, toWrapBalanceH, {
      from: LRD,
    });
    await WASSET.unwrapFor(harry, toWrapBalanceH, { from: SP });
    aftertoWrapBalanceH = await TOWRAP.balanceOf(harry);
    assert.equal(aftertoWrapBalanceH.toString(), toWrapBalanceH.toString());
    console.log((await TOWRAP.balanceOf(WASSET.address)).toString());
  });
});
