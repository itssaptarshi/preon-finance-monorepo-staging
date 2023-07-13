# Instructions for Deployments

- Clone repo and 'yarn install' in root.
- cd into packages/contracts then run 'npx hardhat node' to run polygon forked mainnet
- Add secrets.js file in packages/contracts folder.And paste the code from below
- Under contracts/mainnetDeployment folder, replace localForkDeploymentOutput.json with empty json. This file stores deployment state.
- Run deployment script with command :
  'npx hardhat run mainnetDeployment/mainnetLocalForkDeploymentPolygon.js --network localhost'
  Above commands deploys core, yeti contracts and stMATIC vault with strategy.
  Displays system vars, open trove for deployer and then for account 2
- Contract addresses will be saved as json in file 'mainnetDeployment/localForkDeploymentOutput.json'

## secrets.js

```js
const secrets = {
  alchemyAPIKey: undefined,
  DEPLOYER_PRIVATEKEY: "0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f",
  ACCOUNT2_PRIVATEKEY: "0xeaa445c85f7b438dEd6e831d06a4eD0CEBDc2f8527f84Fcda6EBB5fCfAd4C0e9",
  alchemyAPIKeyRinkeby: undefined,
  RINKEBY_DEPLOYER_PRIVATEKEY: undefined,
  ETHERSCAN_API_KEY: undefined,
  ALCHEMY_KEY: "https://polygon-mainnet.g.alchemy.com/v2/RuQDsmTH-3DgZpUJrzC3tLyK2NN-UYCy"
};

module.exports = {
  secrets
};
```

# Proxy deployment and upgrade (YETI and YUSD token)

Run script:

```
cd packages/contracts
npx hardhat node
npx hardhat run scripts/testDeployAndUpgradeProxy.js --network localhost
```

Flow of basic proxy deployment and upgrade script for testing.

> Deploys YUSD contracts and displays version state variable

> Upgrades proxy and sets version to 2 and displays version and a previously retained variable i.e. totalSupply

# Alpha Launch Deployment

**Configuration**

Repo set up steps:

- `yarn install` in root folder
- cd packages/contracts. This is main contracts hardhat repo
- Config params file -> mainnetDeployment/deploymentParams.polygon.js. This file stores important constants and addresses used in project.
- Add secrets.js for to add your own ALCHEMY_KEY and deployer private keys.(A sample is given above)
- Polygon network is set as 'mainnet' under `networks` in hardhat.config.js. Make sure to change gasPrice(if required) and deployer private keys while running scripts on mainnet.

For contract verification configuration:

- Add `ETHERSCAN_API_KEY` in secrets.js
- set TO_VERIFY = true in deploymentParams.polygon.js

**Running script**

> default network is `localhost`. Please specify you network after --network flag

```
cd packages/contracts
npx hardhat node
npx hardhat run mainnetDeployment/finalDeploymentPolygon.js --network <NETWORK_NAME_FROM_CONFIG>
```

**Flow of Deployment script**

Deploys Liquity Core -> STAR-WETH pair creation -> deploys PREON contracts -> PREON-WETH pair creation
-> connect core contracts -> connect PREON contracts -> deployFarm and boosted Farm -> deploy All 5 yieldBearingVaults

Contracts following transparent upgradable proxy pattern are :

- Core Contracts -
- PREON contracts -

**Contract Addresses**

Contract addresses are saved in mainnetDeployment/finalDeploymentPolygon.json
