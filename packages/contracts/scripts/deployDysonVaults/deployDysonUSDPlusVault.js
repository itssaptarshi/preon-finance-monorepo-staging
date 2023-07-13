const configParams = require("../../mainnetDeployment/deploymentParams.polygon");
const { upgrades } = require("hardhat");

async function deployDysonUSDPlusVault() {
    const deployAddresses = {};
    console.log("USD+ =>")
    const deployerWallet = (await ethers.getSigners())[0];
    const dysonVaultFactory = await ethers.getContractFactory('DysonVault', deployerWallet);
    const params = []

    const dysonVaultContract = await upgrades.deployProxy(dysonVaultFactory,
        [
            "Dyson Preon USD+ Vault",
            "D-P-USD+",
        ],
        {
            initializer: "initialize",
            kind: "transparent",
        })
    await dysonVaultContract.deployed()

    const usdPlusStrategyFactory = await ethers.getContractFactory('DysonUSDPlusStrategy', deployerWallet);
    const dysonUSDPlusStrategyContract = await upgrades.deployProxy(usdPlusStrategyFactory,
        [
            '0x236eec6359fb44cce8f97e99387aa7f8cd5cde1f', // underlying
            "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC
            "0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e", // dystopia router
            2000, // treasury fee
            dysonVaultContract.address // vault
        ],
        {
            initializer: "initialize",
            kind: "transparent",
        })
    await dysonUSDPlusStrategyContract.deployed()

    await dysonVaultContract.setStrategy(dysonUSDPlusStrategyContract.address)
    await dysonUSDPlusStrategyContract.setTreasury(deployerWallet.address);
    // setBOps not done
    // await dysonVaultContract.setBOps(deploymentState["borrowerOperations"].address)

    deployAddresses['Vault'] = dysonVaultContract.address
    deployAddresses['Strategy'] = dysonUSDPlusStrategyContract.address

    return deployAddresses
}

if (require.main == module) {
    deployDysonUSDPlusVault()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error)
            process.exit(1)
        })
}

module.exports = deployDysonUSDPlusVault