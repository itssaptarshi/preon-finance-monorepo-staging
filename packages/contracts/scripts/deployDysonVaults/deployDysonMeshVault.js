// for asset = {'IWMATIC', 'IUSDC', 'IDAI'}
// see: meshDeployParams

const { MESH_PARAMS_OBJECT } = require("../data/meshDeployParams")
const { upgrades } = require("hardhat");

async function main() {
    await deployMeshVault('IUSDC')
}

async function deployMeshVault(asset) {
    const PARAMS = MESH_PARAMS_OBJECT[asset];
    const vaultParams = PARAMS.Vault
    const strategyParams = PARAMS.Strategy
    var deployAddresses = {};
    console.log("%s =>", asset)

    const deployerWallet = (await ethers.getSigners())[0];
    const VaultFactory = await ethers.getContractFactory('DysonVault', deployerWallet);

    // deploy vault
    const VaultContract = await upgrades.deployProxy(VaultFactory, [vaultParams.name,
    vaultParams.symbol], {
        initializer: "initialize",
        kind: "transparent",
    })
    await VaultContract.deployed();

    console.log('Vault deployed')

    // deploy strategy
    const IWMATICStrategyFactory = await ethers.getContractFactory('DysonMeshStrategy', deployerWallet);
    const StrategyContract = await upgrades.deployProxy(IWMATICStrategyFactory,
        [strategyParams.pool,
        strategyParams.WNATIVE,
        strategyParams.rewardToken,
        strategyParams.router,
        strategyParams.fee,
        VaultContract.address,
        strategyParams.rewardToNativePath,
        strategyParams.pooltokenToNativePath],
        {
            initializer: "initialize",
            kind: "transparent",
        }
    )
    console.log('Strategy deployed')
    await StrategyContract.deployed();

    await VaultContract.setStrategy(StrategyContract.address)

    deployAddresses['Vault'] = VaultContract.address
    deployAddresses['Strategy'] = StrategyContract.address
    return deployAddresses
}

if (require.main == module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error)
            process.exit(1)
        })
}

module.exports = deployMeshVault
