const configParams = require("../../mainnetDeployment/deploymentParams.polygon");
const { upgrades } = require("hardhat");

async function deployDysonSTMaticVault() {
    const deployAddresses = {};
    console.log("stMatic =>")
    const deployerWallet = (await ethers.getSigners())[0];
    const dysonVaultFactory = await ethers.getContractFactory('DysonVault', deployerWallet);
    const params = []

    const dysonVaultContract = await upgrades.deployProxy(dysonVaultFactory,
        ["Dyson Preon stMATIC Vault",
            "D-P-stMATIC",],
        {
            initializer: "initialize",
            kind: "transparent",
        })
    await dysonVaultContract.deployed()

    const stMATICStrategyFactory = await ethers.getContractFactory('DysonSTMaticStrategy', deployerWallet);
    const dysonSTMaticStrategyContract = await upgrades.deployProxy(stMATICStrategyFactory,
        [
            '0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4', // stMatic
            "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC
            "0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e", // dystopia router
            2000, // treasury fee
            dysonVaultContract.address // vault
        ],
        {
            initializer: "initialize",
            kind: "transparent",
        })
    await dysonSTMaticStrategyContract.deployed()

    await dysonVaultContract.setStrategy(dysonSTMaticStrategyContract.address)
    await dysonSTMaticStrategyContract.setTreasury(deployerWallet.address);
    // setBOps not done
    // await dysonVaultContract.setBOps(deploymentState["borrowerOperations"].address)

    deployAddresses['Vault'] = dysonVaultContract.address
    deployAddresses['Strategy'] = dysonSTMaticStrategyContract.address
    if (require.main == module) {
        console.log(deployAddresses)
    }

    return deployAddresses
}

if (require.main == module) {
    deployDysonSTMaticVault()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error)
            process.exit(1)
        })
}

module.exports = deployDysonSTMaticVault