const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const USAGE = "USAGE: serializeDeployment.js NETWORK_OUTPUT.json";

const allowedAddresses = {
  activePool: "0x",
  borrowerOperations: "0x",
  troveManager: "0x",
  collSurplusPool: "0x",
  communityIssuance: "0x",
  defaultPool: "0x",
  hintHelpers: "0x",
  priceFeed: "0x",
  sortedTroves: "0x",
  stabilityPool: "0x",
  gasPool: "0x",
  starToken: "0x",
  preonToken: "0x",
  multiTroveGetter: "0x",
  preonController: "0x",
  farm: "0x",
  boostedFarm: "0x",
  vePREON: "0x",
  vePREONEmissions: "0x",
  lpToken: "0x",
  STARPriceFeed: "0x",
};

const deployment = {
  bootstrapPeriod: 1209600,
  totalStabilityPoolPREONReward: "50000000",
  liquidityMiningPREONRewardRate: "0.257201646090534979",
  tjLiquidityMiningPREONRewardRate: "0",
  pngLiquidityMiningPREONRewardRate: "0.41335978835978837",
  _priceFeedIsTestnet: false,
  _uniTokenIsMock: false,
  _isDev: false,
  addresses: {},
};

async function main() {
  const outputFile = process.argv[2];
  if (!outputFile) {
    throw new Error(USAGE);
  }

  const params = JSON.parse(fs.readFileSync(outputFile));
  //console.log(params)
  const depFile = path.resolve(
    `${__dirname}/../../lib-ethers/deployments/default/avalanche.json`
  );
  deployment.chainId = params.metadata.network.chainId;
  deployment.startBlock = params.metadata.startBlock;
  deployment.deploymentDate = params.metadata.deploymentDate;
  for (const k of Object.keys(params)) {
    if (k === "metadata" || !allowedAddresses?.[k] || k === "tellorCaller") {
      continue;
    }
    deployment.addresses[k] = params[k].address;
  }

  console.log(deployment);
  // the version is the git commit
  const version = execSync("git rev-parse HEAD").toString().trimRight();
  deployment.version = version;
  fs.writeFileSync(depFile, JSON.stringify(deployment, null, 4));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
