const MainnetDeploymentHelper = require("../utils/mainnetDeploymentHelpers");
const configParams = require("../mainnetDeployment/deploymentParams.polygon");

// deploy vault and test deposits and then borrow STAR against stMATIC and openTRove transaction

async function deployVault() {
  const deployerWallet = (await ethers.getSigners())[0];

  console.log("Deployer Wallet :", deployerWallet.address);

  const mdh = new MainnetDeploymentHelper(configParams, deployerWallet);
  const deploymentState = mdh.loadPreviousDeployment();

  console.log("Deploying stMATIC Vault ....");
  await mdh.deployYieldBearingVaults(deploymentState);
}
deployVault();
