const { MESH_PARAMS_OBJECT } = require("../scripts/data/meshDeployParams");

const fs = require("fs");
const { ethers, upgrades } = require("hardhat");

const ZERO_ADDRESS = "0x" + "0".repeat(40);
const maxBytes32 = "0x" + "f".repeat(64);

const exchangeLpAddress = "0x60c088234180b36EDcec7AA8Aa23912Bb6bed114";

class MainnetDeploymentHelper {
  constructor(configParams, deployerWallet) {
    this.configParams = configParams;
    this.deployerWallet = deployerWallet;
    this.hre = require("hardhat");
  }

  loadPreviousDeployment() {
    let previousDeployment = {};
    if (fs.existsSync(this.configParams.OUTPUT_FILE)) {
      console.log(`Loading previous deployment...`);
      previousDeployment = require("../" + this.configParams.OUTPUT_FILE);
    }

    return previousDeployment;
  }

  saveDeployment(deploymentState) {
    const deploymentStateJSON = JSON.stringify(deploymentState, null, 2);

    // console.log("Output Filepath", this.configParams.OUTPUT_FILE);
    // fs.writeFileSync(this.configParams.OUTPUT_FILE, deploymentStateJSON)
    fs.writeFileSync(this.configParams.TO_SAVE_FILENAME, deploymentStateJSON);
  }
  // --- Deployer methods ---

  async getFactory(name) {
    const factory = await ethers.getContractFactory(name, this.deployerWallet);
    return factory;
  }

  async sendAndWaitForTransaction(txPromise) {
    const tx = await txPromise;
    const minedTx = await ethers.provider.waitForTransaction(
      tx.hash,
      this.configParams.TX_CONFIRMATIONS
    );

    return minedTx;
  }

  async loadOrDeploy(factory, name, deploymentState, params = []) {
    if (deploymentState[name] && deploymentState[name].address) {
      console.log(
        `Using previously deployed ${name} contract at address ${deploymentState[name].address}`
      );
      return new ethers.Contract(
        deploymentState[name].address,
        factory.interface,
        this.deployerWallet
      );
    }

    console.log("\t✋ deploying:", name);
    const contract = await factory.deploy(...params, {
      gasPrice: this.configParams.GAS_PRICE,
    });
    console.log("\t✅ deployed:", name);
    await this.deployerWallet.provider.waitForTransaction(
      contract.deployTransaction.hash,
      this.configParams.TX_CONFIRMATIONS
    );

    deploymentState[name] = {
      address: contract.address,
      txHash: contract.deployTransaction.hash,
    };

    this.saveDeployment(deploymentState);

    await this.verifyContract(name, deploymentState, params);
    return contract;
  }

  // 🟡 Working
  async loadOrDeployProxy(
    factory,
    name,
    deploymentState,
    initializer = false,
    params = []
  ) {
    console.log("\t✋ deploying:", name);
    if (deploymentState[name] && deploymentState[name].address) {
      console.log(
        `Using previously deployed ${name} contract at address ${deploymentState[name].address}`
      );
      return new ethers.Contract(
        deploymentState[name].address,
        factory.interface,
        this.deployerWallet
      );
    }
    let contract;
    if (initializer) {
      console.log("\t✋ deploying transparent");
      console.log("@params:", params);
      contract = await upgrades.deployProxy(factory, params, {
        initializer: "initialize",
        kind: "transparent",
      });
    } else {
      console.log("\t✋ deploying deployProxy", name);
      console.log("@params:", params);
      contract = await upgrades.deployProxy(factory, params, {
        timeout: 100000000,
        pollingInterval: 8000,
      });
    }

    console.log("⌛️ waiting for being deployed");
    await this.deployerWallet.provider.waitForTransaction(
      contract.deployTransaction.hash,
      this.configParams.TX_CONFIRMATIONS
    );
    await contract.deployed();
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(
      contract.address
    );
    const implementationName = name + "Implementation";

    deploymentState[name] = {
      address: contract.address,
      txHash: contract.deployTransaction.hash,
    };
    deploymentState[implementationName] = {
      address: implementationAddress,
      // txHash: contract.deployTransaction.hash,
    };

    this.saveDeployment(deploymentState);

    await this.verifyContract(name, deploymentState, params); // verify proxy and implementation

    return contract;
  }

  async deployLiquityCoreMainnet(tellorMasterAddr, deploymentState) {
    // Get contract factories
    // const priceFeedFactory = await this.getFactory("PriceFeed");

    const sortedTrovesFactory = await this.getFactory("SortedTroves");
    const troveManagerFactory = await this.getFactory("TroveManager");
    const activePoolFactory = await this.getFactory("ActivePool");
    const stabilityPoolFactory = await this.getFactory("StabilityPool");
    const gasPoolFactory = await this.getFactory("GasPool");
    const defaultPoolFactory = await this.getFactory("DefaultPool");
    const collSurplusPoolFactory = await this.getFactory("CollSurplusPool");
    const borrowerOperationsFactory = await this.getFactory(
      "BorrowerOperations"
    );
    const hintHelpersFactory = await this.getFactory("HintHelpers");
    const tellorCallerFactory = await this.getFactory("TellorCaller");
    const troveManagerLiquidationsFactory = await this.getFactory(
      "TroveManagerLiquidations"
    );
    const troveManagerRedemptionsFactory = await this.getFactory(
      "TroveManagerRedemptions"
    );
    const whitelistFactory = await this.getFactory("Whitelist");
    const starTokenFactory = await this.getFactory("STARToken");
    const timeLockFactory = await this.getFactory("TimeLock");

    const threeDayTimeLock = await this.loadOrDeploy(
      timeLockFactory,
      "threeDayTimeLock",
      deploymentState,
      [this.deployerWallet.address, 259200, 21600]
    );
    const twoWeekTimeLock = await this.loadOrDeploy(
      timeLockFactory,
      "twoWeekTimeLock",
      deploymentState,
      [this.deployerWallet.address, 1209600, 21600]
    );

    // Deploy txs
    // const priceFeed = await this.loadOrDeploy(
    //   priceFeedFactory,
    //   "priceFeed",
    //   deploymentState
    // );

    const sortedTroves = await this.loadOrDeploy(
      sortedTrovesFactory,
      "sortedTroves",
      deploymentState
    );
    const troveManager = await this.loadOrDeployProxy(
      troveManagerFactory,
      "troveManager",
      deploymentState
    );
    const activePool = await this.loadOrDeployProxy(
      activePoolFactory,
      "activePool",
      deploymentState
    );
    const stabilityPool = await this.loadOrDeployProxy(
      stabilityPoolFactory,
      "stabilityPool",
      deploymentState
    );
    const gasPool = await this.loadOrDeploy(
      gasPoolFactory,
      "gasPool",
      deploymentState
    );
    const defaultPool = await this.loadOrDeployProxy(
      defaultPoolFactory,
      "defaultPool",
      deploymentState
    );
    const collSurplusPool = await this.loadOrDeployProxy(
      collSurplusPoolFactory,
      "collSurplusPool",
      deploymentState
    );
    const borrowerOperations = await this.loadOrDeployProxy(
      borrowerOperationsFactory,
      "borrowerOperations",
      deploymentState
    );
    const hintHelpers = await this.loadOrDeploy(
      hintHelpersFactory,
      "hintHelpers",
      deploymentState
    );
    const tellorCaller = await this.loadOrDeploy(
      tellorCallerFactory,
      "tellorCaller",
      deploymentState,
      [tellorMasterAddr]
    );
    const troveManagerLiquidations = await this.loadOrDeployProxy(
      troveManagerLiquidationsFactory,
      "troveManagerLiquidations",
      deploymentState
    );
    const troveManagerRedemptions = await this.loadOrDeployProxy(
      troveManagerRedemptionsFactory,
      "troveManagerRedemptions",
      deploymentState
    );
    const whitelist = await this.loadOrDeploy(
      whitelistFactory,
      "whitelist",
      deploymentState
    );

    const preonControllerFactory = await this.getFactory("PreonController");
    const preonController = await this.loadOrDeployProxy(
      preonControllerFactory,
      "preonController",
      deploymentState
    );

    const starTokenParams = [
      troveManager.address,
      troveManagerLiquidations.address,
      troveManagerRedemptions.address,
      stabilityPool.address,
      borrowerOperations.address,
      preonController.address,
    ];
    const starToken = await this.loadOrDeployProxy(
      starTokenFactory,
      "starToken",
      deploymentState,
      true,
      starTokenParams
    );

    // if (!this.configParams.ETHERSCAN_BASE_URL) {
    //   console.log("No Etherscan Url defined, skipping verification");
    // } else {
    //   console.log(
    //     "Contract Verification Removed From mainnetDeploymentHelpers.js"
    //   );
    //   // await this.verifyContract('priceFeed', deploymentState)
    //   // await this.verifyContract('whiteList', deploymentState)
    //   // await this.verifyContract('sortedTroves', deploymentState)
    //   // await this.verifyContract('troveManager', deploymentState)
    //   // await this.verifyContract('activePool', deploymentState)
    //   // await this.verifyContract('stabilityPool', deploymentState)
    //   // await this.verifyContract('gasPool', deploymentState)
    //   // await this.verifyContract('defaultPool', deploymentState)
    //   // await this.verifyContract('collSurplusPool', deploymentState)
    //   // await this.verifyContract('borrowerOperations', deploymentState)
    //   // await this.verifyContract('hintHelpers', deploymentState)
    //   // await this.verifyContract('tellorCaller', deploymentState, [tellorMasterAddr])
    //   // await this.verifyContract('starToken', deploymentState, starTokenParams)
    // }

    const coreContracts = {
      // priceFeed,
      sortedTroves,
      troveManager,
      activePool,
      stabilityPool,
      gasPool,
      defaultPool,
      collSurplusPool,
      borrowerOperations,
      hintHelpers,
      tellorCaller,
      troveManagerLiquidations,
      troveManagerRedemptions,
      whitelist,
      preonController,
      starToken,
      threeDayTimeLock,
      twoWeekTimeLock,
    };
    return coreContracts;
  }

  async deployPREONContractsMainnet(
    bountyAddress,
    // lpRewardsAddress,
    multisigAddress,
    deploymentState
  ) {
    const vePREONFactory = await this.getFactory("vePREON");
    const sPREONFactory = await this.getFactory("PreonFinance");
    const vePREONEmissionsFactory = await this.getFactory("vePREONEmissions");

    // const lockupContractFactory_Factory = await this.getFactory(
    //   "LockupContractFactory"
    // );
    const communityIssuanceFactory = await this.getFactory("CommunityIssuance");
    const preonTokenFactory = await this.getFactory("PREONToken");
    const preonFinanceTreasuryFactory = await this.getFactory(
      "PreonFinanceTreasury"
    );

    const sPREON = await this.loadOrDeploy(
      sPREONFactory,
      "sPREON",
      deploymentState
    );
    // const lockupContractFactory = await this.loadOrDeploy(
    //   lockupContractFactory_Factory,
    //   "lockupContractFactory",
    //   deploymentState
    // );

    const vepreonTokenParams = [
      deploymentState["lpToken"].address, // token
    ];

    const vePREON = await this.loadOrDeployProxy(
      vePREONFactory,
      "vePREON",
      deploymentState,
      false, // pass true if using initialize function in transparent proxy
      vepreonTokenParams
    );

    const communityIssuance = await this.loadOrDeploy(
      communityIssuanceFactory,
      "communityIssuance",
      deploymentState
    );

    const preonFinanceTreasury = await this.loadOrDeploy(
      preonFinanceTreasuryFactory,
      "preonFinanceTreasury",
      deploymentState
    );
    // Deploy PREON Token, passing Community Issuance and Factory addresses to the constructor
    // TODO: these two multisigAddresses should be updated to contracts for Treasury and Team that implement specific locking
    const preonTokenParams = [
      sPREON.address,
      preonFinanceTreasury.address, // TODO: Swap out for Team address
      this.deployerWallet.address,
    ];

    const preonToken = await this.loadOrDeployProxy(
      preonTokenFactory,
      "preonToken",
      deploymentState,
      true, // pass true if using initialize function in transparent proxy
      preonTokenParams
    );

    let vePreonEmissionsParams = [
      vePREON.address, // ve token
      [
        deploymentState["starToken"].address,
        deploymentState["lpToken"].address,
      ], // reward tokens - star + lp (rage quit)
    ];
    const vePREONEmissions = await this.loadOrDeployProxy(
      vePREONEmissionsFactory,
      "vePREONEmissions",
      deploymentState,
      false,
      vePreonEmissionsParams
    );

    if (!this.configParams.ETHERSCAN_BASE_URL) {
      console.log("No Etherscan Url defined, skipping verification");
    } else {
      await this.verifyContract("sPREON", deploymentState);
      // await this.verifyContract("lockupContractFactory", deploymentState);
      await this.verifyContract("communityIssuance", deploymentState);
      await this.verifyContract(
        "preonToken",
        deploymentState,
        preonTokenParams
      );
    }

    const PREONContracts = {
      // lockupContractFactory,
      sPREON,
      vePREON,
      vePREONEmissions,
      communityIssuance,
      preonToken,
      preonFinanceTreasury,
    };
    return PREONContracts;
  }

  async deployFarmsMainnet(preonContracts, deploymentState) {
    const farmFactory = await this.getFactory("Farm");
    const farm = await this.loadOrDeployProxy(
      farmFactory,
      "farm",
      deploymentState,
      true,
      [
        deploymentState["starLpToken"].address,
        deploymentState["preonToken"].address,
      ]
    );
    const boostedFarmFactory = await this.getFactory("BoostedFarm");
    const boostedFarm = await this.loadOrDeployProxy(
      boostedFarmFactory,
      "boostedFarm",
      deploymentState,
      true,
      [
        deploymentState["starLpToken"].address,
        deploymentState["vePREON"].address,
        [deploymentState["preonToken"].address],
      ]
    );

    const preonMinterFactory = await this.getFactory("PREONMinter");
    const preonMinter = await this.loadOrDeployProxy(
      preonMinterFactory,
      "PREONMinter",
      deploymentState,
      true,
      [
        boostedFarm.address,
        deploymentState["preonToken"].address,
        deploymentState["vePREONEmissions"].address,
      ]
    );

    // add depositers in vePreonEmissions to call checkpointToken, checkpointTotalSupply
    await this.sendAndWaitForTransaction(
      preonContracts.vePREONEmissions.addDepositor(
        deploymentState["PREONMinter"].address,
        {
          gasPrice: this.configParams.GAS_PRICE,
        }
      )
    );

    // add depositers in vePreonEmissions to call checkpointToken, checkpointTotalSupply
    await this.sendAndWaitForTransaction(
      preonContracts.vePREONEmissions.addDepositor(
        deploymentState["borrowerOperations"].address,
        {
          gasPrice: this.configParams.GAS_PRICE,
        }
      )
    );

    await this.sendAndWaitForTransaction(
      preonContracts.vePREONEmissions.addDepositor(
        deploymentState["troveManagerRedemptions"].address,
        {
          gasPrice: this.configParams.GAS_PRICE,
        }
      )
    );

    console.log(
      "\n\n@addDepositor: vePREON",
      deploymentState["vePREON"].address
    );
    await this.sendAndWaitForTransaction(
      preonContracts.vePREONEmissions.addDepositor(
        deploymentState["vePREON"].address,
        {
          gasPrice: this.configParams.GAS_PRICE,
        }
      )
    );

    console.log("@making preonMinter minter in preon token");

    // make preonminter minter in preon token
    await this.sendAndWaitForTransaction(
      preonContracts.preonToken.setMinter(preonMinter.address, {
        gasPrice: this.configParams.GAS_PRICE,
      })
    );

    // run update period
    console.log("@update period: preReward()");
    await this.sendAndWaitForTransaction(
      preonMinter.preReward({ gasPrice: this.configParams.GAS_PRICE })
    );

    // address _preon,
    // address _vePREON,
    // address _lpToken
    // await this.sendAndWaitForTransaction(
    //   boostedFarm.initialize(
    //     deploymentState["preonToken"].address,
    //     deploymentState["vePREON"].address,
    //     deploymentState["starLpToken"].address
    //   )
    // );
  }

  async deployYieldBearingVaults(deploymentState) {
    const dysonVaultFactory = await this.getFactory("DysonVault");
    const stMaticStrategyFactory = await this.getFactory(
      "DysonSTMaticStrategy"
    );
    const usdPlusStrategyFactory = await this.getFactory(
      "DysonUSDPlusStrategy"
    );
    const meshStrategyFactory = await this.getFactory("DysonMeshStrategy");

    // deploy stMatic
    const stMaticVault = await this.loadOrDeployProxy(
      dysonVaultFactory,
      "stMaticVault",
      deploymentState,
      true,
      ["Dyson Preon stMATIC Vault", "D-P-stMATIC"]
    );
    const stMaticStrategy = await this.loadOrDeployProxy(
      stMaticStrategyFactory,
      "stMaticStrategy",
      deploymentState,
      true,
      [
        "0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4", // stMatic
        "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC
        "0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e", // dystopia router
        2000, // treasury fee
        stMaticVault.address, // vault
        "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
        deploymentState["starToken"].address,
      ]
    );
    await stMaticVault.setStrategy(stMaticStrategy.address);
    await stMaticStrategy.setVePreonEmissionsAddr(
      deploymentState["vePREONEmissions"].address
    );
    await stMaticVault.setBOps(deploymentState["borrowerOperations"].address);
    await stMaticStrategy.setCompundingFeeEssentials(
      this.deployerWallet.address,
      this.deployerWallet.address,
      6000
    ); // 60% to 1st recipient; rest to recipient2

    // deploy USD+
    const usdPlusVault = await this.loadOrDeployProxy(
      dysonVaultFactory,
      "usdPlusVault",
      deploymentState,
      true,
      ["Dyson Preon USD+ Vault", "D-P-USD+"]
    );
    const usdPlusStrategy = await this.loadOrDeployProxy(
      usdPlusStrategyFactory,
      "usdPlusStrategy",
      deploymentState,
      true,
      [
        "0x236eec6359fb44cce8f97e99387aa7f8cd5cde1f", // underlying
        "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC
        "0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e", // dystopia router
        2000, // treasury fee 20% fee
        usdPlusVault.address, // vault
        "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
        deploymentState["starToken"].address,
      ]
    );
    await usdPlusVault.setStrategy(usdPlusStrategy.address);
    await usdPlusStrategy.setVePreonEmissionsAddr(
      deploymentState["vePREONEmissions"].address
    );
    await usdPlusVault.setBOps(deploymentState["borrowerOperations"].address);
    await usdPlusStrategy.setCompundingFeeEssentials(
      this.deployerWallet.address,
      this.deployerWallet.address,
      6000
    ); // 60% to 1st recipient; rest to recipient2

    // -------- deploy Mesh Vaults --------
    const _native = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"
    const _reward = "0x82362ec182db3cf7829014bc61e9be8a2e82868a"
    const _router = "0x10f4a785f458bc144e3706575924889954946639"
    const _fee = 2000

    let vault = await this.loadOrDeployProxy(
      dysonVaultFactory,
      "IWMATICVault",
      deploymentState,
      true,
      ["Dyson Preon IWMATIC Vault", "D-P-IWMATIC"]
    );

    let strategy = await this.loadOrDeployProxy(
      meshStrategyFactory,
      "IWMATICStrategy",
      deploymentState,
      true,
      [
        "0xb880e6ade8709969b9fd2501820e052581ac29cf", // pool address
        _native, // wmatic
        _reward, // reward token
        _router, // router
        _fee, // 20%
        vault.address,
        [_reward, "0xa3Fa99A148fA48D14Ed51d610c367C61876997F1", _native], // reward to wmatic path (reward, ?, wmatic)
        [_native, _native],
        deploymentState["starToken"].address,
        "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
      ]
    );

    await vault.setStrategy(strategy.address);
    await vault.setBOps(deploymentState["borrowerOperations"].address);
    await strategy.setVePreonEmissionsAddr(
      deploymentState["vePREONEmissions"].address
    );
    await strategy.setCompundingFeeEssentials(
      this.deployerWallet.address,
      this.deployerWallet.address,
      6000
    ); // 60% to 1st recipient; rest to recipient2


    // =============== IDAI ===============
    vault = await this.loadOrDeployProxy(
      dysonVaultFactory,
      "IDAIVault",
      deploymentState,
      true,
      ["Dyson Preon IDAI Vault", "D-P-IDAI"]
    );

    strategy = await this.loadOrDeployProxy(
      meshStrategyFactory,
      "IDAIStrategy",
      deploymentState,
      true,
      [
        "0xbe068b517e869f59778b3a8303df2b8c13e05d06", // pool address
        _native, // wmatic
        _reward, // reward token
        _router, // router
        _fee, // 20%
        vault.address,
        [_reward, "0xa3Fa99A148fA48D14Ed51d610c367C61876997F1", _native], // reward to wmatic path (reward, ?, wmatic)
        ["0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"],
        deploymentState["starToken"].address,
        "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
      ]
    );

    await vault.setStrategy(strategy.address);
    await vault.setBOps(deploymentState["borrowerOperations"].address);
    await strategy.setVePreonEmissionsAddr(
      deploymentState["vePREONEmissions"].address
    );
    await strategy.setCompundingFeeEssentials(
      this.deployerWallet.address,
      this.deployerWallet.address,
      6000
    ); // 60% to 1st recipient; rest to recipient2


    // =============== IUSDC ===============
    vault = await this.loadOrDeployProxy(
      dysonVaultFactory,
      "IUSDCVault",
      deploymentState,
      true,
      ["Dyson Preon IUSDC Vault", "D-P-IUSDC"]
    );

    strategy = await this.loadOrDeployProxy(
      meshStrategyFactory,
      "IUSDCStrategy",
      deploymentState,
      true,
      [
        "0x590cd248e16466f747e74d4cfa6c48f597059704", // pool address
        _native, // wmatic
        _reward, // reward token
        _router, // router
        _fee, // 20%
        vault.address,
        [_reward, "0xa3Fa99A148fA48D14Ed51d610c367C61876997F1", _native], // reward to wmatic path (reward, ?, wmatic)
        ["0x2791bca1f2de4661ed88a30c99a7a9449aa84174", _native],
        deploymentState["starToken"].address,
        "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
      ]
    );

    await vault.setStrategy(strategy.address);
    await vault.setBOps(deploymentState["borrowerOperations"].address);
    await strategy.setVePreonEmissionsAddr(
      deploymentState["vePREONEmissions"].address
    );
    await strategy.setCompundingFeeEssentials(
      this.deployerWallet.address,
      this.deployerWallet.address,
      6000
    ); // 60% to 1st recipient; rest to recipient2



    // let params, vaultParams, strategyParams, vault, strategy;
    // const assets = ["IWMATIC", "IUSDC", "IDAI"];

    // assets.forEach(async (asset) => {
    //   params = MESH_PARAMS_OBJECT[asset];
    //   vaultParams = params.Vault;
    //   strategyParams = params.Strategy;

    //   vault = await this.loadOrDeployProxy(
    //     dysonVaultFactory,
    //     asset + "Vault",
    //     deploymentState,
    //     true,
    //     [vaultParams.name, vaultParams.symbol]
    //   );

    //   strategy = await this.loadOrDeployProxy(
    //     meshStrategyFactory,
    //     asset + "Strategy",
    //     deploymentState,
    //     true,
    //     [
    //       strategyParams.pool,
    //       strategyParams.WNATIVE,
    //       strategyParams.rewardToken,
    //       strategyParams.router,
    //       strategyParams.fee,
    //       vault.address,
    //       strategyParams.rewardToNativePath,
    //       strategyParams.pooltokenToNativePath,
    //       deploymentState["starToken"].address,
    //       "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
    //     ]
    //   );

    //   await vault.setStrategy(strategy.address);
    //   await vault.setBOps(deploymentState["borrowerOperations"].address);
    //   await strategy.setVePreonEmissionsAddr(
    //     deploymentState["vePREONEmissions"].address
    //   );
    //   await strategy.setCompundingFeeEssentials(
    //     this.deployerWallet.address,
    //     this.deployerWallet.address,
    //     6000
    //   ); // 60% to 1st recipient; rest to recipient2
    // });

    this.saveDeployment(deploymentState);
  }

  async deployLever(deploymentState) {
    const leverFactory = await this.getFactory("Lever");
    const lever = await this.loadOrDeploy(
      leverFactory,
      "wmaticLever",
      deploymentState
    );
    await this.sendAndWaitForTransaction(
      lever.setJoeRouter(this.configParams.externalAddrs.UNISWAP_V2_ROUTER02)
    );
    return lever.address;
  }

  async deployWavaxFeeCurve(deploymentState) {
    const wavaxFeeCurveFactory = await this.getFactory(
      "ThreePieceWiseLinearFeeCurve"
    );
    const wavaxFeeCurve = await this.loadOrDeploy(
      wavaxFeeCurveFactory,
      "wmaticFeeCurve",
      deploymentState
    );

    await this.sendAndWaitForTransaction(
      wavaxFeeCurve.setAddresses(deploymentState["preonController"].address)
    );
    await this.sendAndWaitForTransaction(
      wavaxFeeCurve.adjustParams(
        "WAVAX Fee Curve",
        0,
        "2500000000000000",
        0,
        "1000000000000000000",
        0,
        "1000000000000000000",
        "200000000000000000000000000",
        "86400"
      )
    );
    return wavaxFeeCurve.address;
  }

  async deployJLPVault(deploymentState) {
    console.log("JLPVAULT");
    const jlpVaultFactory = await this.getFactory("PenroseVault");
    const jlpVault = await this.loadOrDeploy(
      jlpVaultFactory,
      "jlpVault",
      deploymentState
    );
    console.log(await jlpVault.PID());
    await this.sendAndWaitForTransaction(
      jlpVault[
        "initialize(address,string,string,uint256,uint256,uint256,address,address,uint256,address,address)"
      ](
        exchangeLpAddress,
        "PREON Pen WMATIC-USDC Vault",
        "YPLP-0",
        "1000",
        "20",
        "86400",
        "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
        "0x8831E6aC8f05d1Fe61f6eA03828f5357283Dd785",
        0,
        "0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e",
        "0x39aB6574c289c3Ae4d88500eEc792AB5B947A5Eb"
      )
    );
    await this.sendAndWaitForTransaction(
      jlpVault.setApprovals(
        exchangeLpAddress,
        "0x77A93d0A4aCc6cC8eFf33B51C268807d086D0c95",
        Number.MAX_SAFE_INTEGER - 1
      )
    );
    await this.sendAndWaitForTransaction(
      jlpVault.pushRewardToken("0x39aB6574c289c3Ae4d88500eEc792AB5B947A5Eb")
    );
    // await this.sendAndWaitForTransaction(
    //   jlpVault.setJoeRouter("0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e")
    // );
    await this.sendAndWaitForTransaction(jlpVault.setStale("86400"));
    await this.sendAndWaitForTransaction(
      jlpVault.setFeeRecipient(deploymentState["preonFinanceTreasury"].address)
    );
    await this.sendAndWaitForTransaction(
      jlpVault.setBOps(deploymentState["borrowerOperations"].address)
    );

    console.log(await jlpVault.PID());
    return jlpVault;
  }

  async deployJlpVaultOracle(deploymentState) {
    console.log("USDCPRICEFEED");
    const priceFeedBaseFactory = await this.getFactory("PriceFeedBase");
    const usdcPriceFeed = await this.loadOrDeploy(
      priceFeedBaseFactory,
      "usdcPriceFeed",
      deploymentState
    );
    const avaxPriceFeed = await this.loadOrDeploy(
      priceFeedBaseFactory,
      "maticPriceFeed",
      deploymentState
    );
    await this.sendAndWaitForTransaction(
      avaxPriceFeed.setParams(
        "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0",
        "MATIC PRICE FEED"
      )
    );
    console.log("Setting matic params");
    await this.sendAndWaitForTransaction(
      usdcPriceFeed.setParams(
        "0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7",
        "USDC PRICE FEED"
      )
    );
    console.log("PENLPPRICEFEED");
    const penLpPriceFeedFactory = await this.getFactory(
      "UniswapV2LPTokenPriceFeed"
    );
    const penLpPriceFeed = await this.loadOrDeploy(
      penLpPriceFeedFactory,
      "penLpPriceFeed",
      deploymentState,
      [
        deploymentState["maticPriceFeed"].address, // WMATIC chainlink price feed
        18,
        deploymentState["usdcPriceFeed"].address, // USDC chainlink price feed
        6,
        "0x60c088234180b36EDcec7AA8Aa23912Bb6bed114", // Dyst - WMATIC/USDC LP
        "WMATIC/USDC PenLP Price Feed",
      ]
    );
    console.log("JLPVAULTORACLE");
    const jlpVaultOracleFactory = await this.getFactory("VaultOracle");
    const jlpVaultOracle = await this.loadOrDeploy(
      jlpVaultOracleFactory,
      "JLPVaultOracle",
      deploymentState,
      [
        deploymentState["penLpPriceFeed"].address,
        deploymentState["jlpVault"].address,
        "USDC-AVAX JLP Vault Price Feed",
      ]
    );
    return jlpVaultOracle.address;
  }

  async deployJlpFeeCurve(deploymentState) {
    console.log("JLPFEECURVE");
    const jlpFeeCurveFactory = await this.getFactory(
      "ThreePieceWiseLinearFeeCurve"
    );
    const jlpFeeCurve = await this.loadOrDeploy(
      jlpFeeCurveFactory,
      "jlpFeeCurve",
      deploymentState
    );

    await this.sendAndWaitForTransaction(
      jlpFeeCurve.setAddresses(deploymentState["preonController"].address)
    );
    await this.sendAndWaitForTransaction(
      jlpFeeCurve.adjustParams(
        "USDC-AVAX",
        0,
        "3500000000000000",
        0,
        "1000000000000000000",
        0,
        "1000000000000000000",
        "250000000000000000000000000",
        "86400"
      )
    );
    return jlpFeeCurve.address;
  }

  async deployUnipoolMainnet(deploymentState) {
    const unipoolFactory = await this.getFactory("Unipool");
    const unipool = await this.loadOrDeploy(
      unipoolFactory,
      "unipool",
      deploymentState
    );

    if (!this.configParams.ETHERSCAN_BASE_URL) {
      console.log("No Etherscan Url defined, skipping verification");
    } else {
      await this.verifyContract("unipool", deploymentState);
    }

    return unipool;
  }

  async deployPool2UnipoolMainnet(deploymentState, dexName) {
    const unipoolFactory = await this.getFactory("Pool2Unipool");
    const contractName = `${dexName}Unipool`;
    const pool2Unipool = await this.loadOrDeploy(
      unipoolFactory,
      contractName,
      deploymentState
    );

    if (!this.configParams.ETHERSCAN_BASE_URL) {
      console.log("No Etherscan Url defined, skipping verification");
    } else {
      await this.verifyContract(contractName, deploymentState);
    }

    return pool2Unipool;
  }

  async deployMultiTroveGetterMainnet(liquityCore, deploymentState) {
    const multiTroveGetterFactory = await this.getFactory("MultiTroveGetter");
    const multiTroveGetterParams = [
      liquityCore.troveManager.address,
      liquityCore.sortedTroves.address,
      liquityCore.whitelist.address,
    ];

    const multiTroveGetter = await this.loadOrDeploy(
      multiTroveGetterFactory,
      "multiTroveGetter",
      deploymentState,
      multiTroveGetterParams
    );

    if (!this.configParams.ETHERSCAN_BASE_URL) {
      console.log("No Etherscan Url defined, skipping verification");
    } else {
      await this.verifyContract(
        "multiTroveGetter",
        deploymentState,
        multiTroveGetterParams
      );
    }

    return multiTroveGetter;
  }
  // --- Connector methods ---

  async isOwnershipRenounced(contract) {
    const owner = await contract.owner();
    return owner == ZERO_ADDRESS;
  }
  // Connect contracts to their dependencies
  async connectCoreContractsMainnet(
    contracts,
    PREONContracts,
    chainlinkProxyAddress
  ) {
    const gasPrice = this.configParams.GAS_PRICE;

    // Set ChainlinkAggregatorProxy and TellorCaller in the PriceFeed
    // (await this.isOwnershipRenounced(contracts.priceFeed)) ||
    //   (await this.sendAndWaitForTransaction(
    //     contracts.priceFeed.setAddresses(
    //       chainlinkProxyAddress,
    //       contracts.tellorCaller.address,
    //       { gasPrice }
    //     )
    //   ));

    // set TroveManager addr in SortedTroves
    // (await this.isOwnershipRenounced(contracts.sortedTroves)) ||
    console.log("Setting params in SortedTroves Contract ...");
    await this.sendAndWaitForTransaction(
      contracts.sortedTroves.setParams(
        maxBytes32,
        contracts.troveManager.address,
        contracts.borrowerOperations.address,
        contracts.troveManagerRedemptions.address,
        contracts.preonController.address,
        { gasPrice }
      )
    );
    console.log("Setting Addresses in PREON Controller ...");

    // (await this.isOwnershipRenounced(contracts.preonController)) ||
    await this.sendAndWaitForTransaction(
      contracts.preonController.setAddresses(
        {
          _activePoolAddress: contracts.activePool.address,
          _defaultPoolAddress: contracts.defaultPool.address,
          _stabilityPoolAddress: contracts.stabilityPool.address,
          _collSurplusPoolAddress: contracts.collSurplusPool.address,
          _borrowerOperationsAddress: contracts.borrowerOperations.address,
          _starTokenAddress: contracts.starToken.address,
          _STARFeeRecipientAddress: PREONContracts.vePREONEmissions.address, // vePreonEmissions
          _preonFinanceTreasury: PREONContracts.preonFinanceTreasury.address, //_preonFinanceTreasury
          _sortedTrovesAddress: contracts.sortedTroves.address,
          _vePREONAddress: PREONContracts.vePREON.address,
          _troveManagerRedemptionsAddress:
            contracts.troveManagerRedemptions.address,
          _claimAddress: PREONContracts.preonFinanceTreasury.address, //_claimAddress
          _threeDayTimelock: contracts.threeDayTimeLock.address,
          _twoWeekTimelock: contracts.twoWeekTimeLock.address,
        },
        { gasPrice }
      )
    );
    console.log("Setting Addresses in TroveManager Contract ...");

    // set contracts in the Trove Manager
    // (await this.isOwnershipRenounced(contracts.troveManager)) ||
    await this.sendAndWaitForTransaction(
      contracts.troveManager.setAddresses(
        contracts.borrowerOperations.address,
        contracts.activePool.address,
        contracts.defaultPool.address,
        contracts.sortedTroves.address,
        contracts.preonController.address,
        contracts.troveManagerRedemptions.address,
        contracts.troveManagerLiquidations.address,
        { gasPrice }
      )
    );
    console.log("Setting Addresses in TroveManagerLiquidations Contract ...");

    // set contracts in the Trove Manager Liquidations
    // (await this.isOwnershipRenounced(contracts.troveManagerLiquidations)) ||
    await this.sendAndWaitForTransaction(
      contracts.troveManagerLiquidations.setAddresses(
        contracts.activePool.address,
        contracts.defaultPool.address,
        contracts.stabilityPool.address,
        contracts.gasPool.address,
        contracts.collSurplusPool.address,
        contracts.starToken.address,
        contracts.preonController.address,
        contracts.troveManager.address,
        { gasPrice }
      )
    );
    console.log("Setting Addresses in TroveManagerRedemptions Contract ...");

    // (await this.isOwnershipRenounced(contracts.troveManagerRedemptions)) ||
    await this.sendAndWaitForTransaction(
      contracts.troveManagerRedemptions.setAddresses(
        contracts.activePool.address,
        contracts.defaultPool.address,
        contracts.gasPool.address,
        contracts.collSurplusPool.address,
        contracts.starToken.address,
        contracts.sortedTroves.address,
        contracts.preonController.address,
        contracts.troveManager.address,
        { gasPrice }
      )
    );
    console.log("Setting Addresses in BorrowerOperations Contract ...");

    // set contracts in BorrowerOperations
    // (await this.isOwnershipRenounced(contracts.borrowerOperations)) ||
    await this.sendAndWaitForTransaction(
      contracts.borrowerOperations.setAddresses(
        contracts.troveManager.address,
        contracts.activePool.address,
        contracts.defaultPool.address,
        contracts.gasPool.address,
        contracts.collSurplusPool.address,
        contracts.sortedTroves.address,
        contracts.starToken.address,
        contracts.preonController.address,
        { gasPrice }
      )
    );
    console.log("Setting Addresses in StabilityPool ...");

    // set contracts in the Pools
    // (await this.isOwnershipRenounced(contracts.stabilityPool)) ||
    await this.sendAndWaitForTransaction(
      contracts.stabilityPool.setAddresses(
        contracts.borrowerOperations.address,
        contracts.troveManager.address,
        contracts.activePool.address,
        contracts.starToken.address,
        contracts.sortedTroves.address,
        PREONContracts.communityIssuance.address,
        contracts.preonController.address,
        contracts.troveManagerLiquidations.address,
        { gasPrice }
      )
    );
    console.log("Setting Addresses in ActivePool ...");

    // (await this.isOwnershipRenounced(contracts.activePool)) ||
    await this.sendAndWaitForTransaction(
      contracts.activePool.setAddresses(
        contracts.borrowerOperations.address,
        contracts.troveManager.address,
        contracts.stabilityPool.address,
        contracts.defaultPool.address,
        contracts.preonController.address,
        contracts.troveManagerLiquidations.address,
        contracts.troveManagerRedemptions.address,
        contracts.collSurplusPool.address,
        { gasPrice }
      )
    );
    console.log("Setting Addresses in DefaultPool ...");

    // (await this.isOwnershipRenounced(contracts.defaultPool)) ||
    await this.sendAndWaitForTransaction(
      contracts.defaultPool.setAddresses(
        contracts.troveManager.address,
        contracts.troveManagerLiquidations.address,
        contracts.activePool.address,
        contracts.preonController.address,
        { gasPrice }
      )
    );
    console.log("Setting Addresses in CollSurplusPool Contract ...");

    // (await this.isOwnershipRenounced(contracts.collSurplusPool)) ||
    await this.sendAndWaitForTransaction(
      contracts.collSurplusPool.setAddresses(
        contracts.borrowerOperations.address,
        contracts.troveManagerLiquidations.address,
        contracts.troveManagerRedemptions.address,
        contracts.activePool.address,
        contracts.preonController.address,
        contracts.starToken.address,
        { gasPrice }
      )
    );
    console.log("Setting Addresses in HintHelpers Contract ...");

    // set contracts in HintHelpers
    // (await this.isOwnershipRenounced(contracts.hintHelpers)) ||
    await this.sendAndWaitForTransaction(
      contracts.hintHelpers.setAddresses(
        contracts.sortedTroves.address,
        contracts.troveManager.address,
        contracts.preonController.address,
        { gasPrice }
      )
    );
    console.log("------ CONNECT CORE CONTRACTS MAINNET SUCCESSFUL ------");
  }

  async connectPREONContractsMainnet(PREONContracts) {
    const gasPrice = this.configParams.GAS_PRICE;
    // Set PREONToken address in LCF
    // (await this.isOwnershipRenounced(PREONContracts.sPREON)) ||
    //   (await this.sendAndWaitForTransaction(
    //     PREONContracts.lockupContractFactory.setPREONTokenAddress(
    //       PREONContracts.preonToken.address,
    //       { gasPrice }
    //     )
    //   ));
  }

  async connectPREONContractsToCoreMainnet(
    PREONContracts,
    coreContracts,
    deployerWallet,
    deploymentState
  ) {
    const gasPrice = this.configParams.GAS_PRICE;
    // (await this.isOwnershipRenounced(PREONContracts.sPREON)) ||
    //   (await this.sendAndWaitForTransaction(
    //     PREONContracts.sPREON.setAddresses(
    //       PREONContracts.preonToken.address,
    //       coreContracts.starToken.address,
    //       { gasPrice }
    //     )
    //   ));

    // (await this.isOwnershipRenounced(PREONContracts.communityIssuance)) ||
    await this.sendAndWaitForTransaction(
      PREONContracts.communityIssuance.setAddresses(
        PREONContracts.preonToken.address,
        deploymentState["boostedFarm"].address,
        { gasPrice }
      )
    );

    await this.sendAndWaitForTransaction(
      PREONContracts.vePREON.setAddresses(
        deploymentState["preonController"].address,
        deploymentState["boostedFarm"].address,
        deploymentState["vePREONEmissions"].address,
        {
          gasPrice,
        }
      )
    );

    // ! TODO: will need to find for emitting.
    // await this.sendAndWaitForTransaction(
    //   PREONContracts.vePREON.setEmitter(
    //     PREONContracts.vePREONEmissions.address,
    //     {
    //       gasPrice,
    //     }
    //   )
    // );
    // await this.sendAndWaitForTransaction(
    //   PREONContracts.vePREON.setup(
    //     PREONContracts.preonToken.address,
    //     coreContracts.preonController.address,
    //     // accumulationRate
    //     "1585489599188",
    //     { gasPrice }
    //   )
    // );
    // await this.sendAndWaitForTransaction(
    //   PREONContracts.vePREONEmissions.setAddresses(
    //     PREONContracts.preonToken.address,
    //     PREONContracts.vePREON.address,
    //     { gasPrice }
    //   )
    // );
  }

  async deployPriceFeedsMainnet(
    coreContracts,
    PREONContracts,
    deploymentState,
    CurvePoolFactory,
    CurvePlainPool
  ) {
    const preonPriceFeedFactory = await this.getFactory("PREONPriceFeed");
    const starPriceFeedFactory = await this.getFactory("STARPriceFeed");

    const priceFeedBaseFactory = await this.getFactory("PriceFeedBase");

    // ? MATIC-USDC price feed
    const maticPriceFeed = await this.loadOrDeploy(
      priceFeedBaseFactory,
      "maticPriceFeed",
      deploymentState
    );
    await this.sendAndWaitForTransaction(
      maticPriceFeed.setParams(
        "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0",
        "MATIC PRICE FEED"
      )
    );

    // ? stMATIC-USDC price feed
    const stMaticPriceFeed = await this.loadOrDeploy(
      priceFeedBaseFactory,
      "stMaticPriceFeed",
      deploymentState
    );
    await this.sendAndWaitForTransaction(
      stMaticPriceFeed.setParams(
        "0x97371dF4492605486e23Da797fA68e55Fc38a13f",
        "stMATIC PRICE FEED"
      )
    );

    // ? wBTC-USDC price feed
    const wBtcPriceFeed = await this.loadOrDeploy(
      priceFeedBaseFactory,
      "wBtcPriceFeed",
      deploymentState
    );
    await this.sendAndWaitForTransaction(
      wBtcPriceFeed.setParams(
        "0xde31f8bfbd8c84b5360cfacca3539b938dd78ae6",
        "wBtc PRICE FEED"
      )
    );

    // ? usd+-USDC price feed
    const usdPlusPriceFeed = await this.loadOrDeploy(
      priceFeedBaseFactory,
      "usdPlusPriceFeed",
      deploymentState
    );
    await this.sendAndWaitForTransaction(
      usdPlusPriceFeed.setParams(
        "0xfe4a8cc5b5b2366c1b58bea3858e81843581b2f7",
        "usdPlus PRICE FEED"
      )
    );

    // ? weth-USDC price feed
    const wEthPriceFeed = await this.loadOrDeploy(
      priceFeedBaseFactory,
      "wEthPriceFeed",
      deploymentState
    );
    await this.sendAndWaitForTransaction(
      wEthPriceFeed.setParams(
        "0xF9680D99D6C9589e2a93a78A04A279e509205945",
        "wEth PRICE FEED"
      )
    );

    // ? iDAI-USDC price feed
    const iDaiPriceFeed = await this.loadOrDeploy(
      priceFeedBaseFactory,
      "iDaiPriceFeed",
      deploymentState
    );
    await this.sendAndWaitForTransaction(
      iDaiPriceFeed.setParams(
        "0x97371dF4492605486e23Da797fA68e55Fc38a13f",
        "iDAI PRICE FEED"
      )
    );

    // ? iUSDC-USDC price feed
    const iUSDCPriceFeed = await this.loadOrDeploy(
      priceFeedBaseFactory,
      "iUSDCPriceFeed",
      deploymentState
    );
    await this.sendAndWaitForTransaction(
      iUSDCPriceFeed.setParams(
        "0xfe4a8cc5b5b2366c1b58bea3858e81843581b2f7",
        "iUSDC PRICE FEED"
      )
    );

    // const avaxPriceFeed = await this.loadOrDeploy(
    //   avaxPriceFeedFactory,
    //   "avaxPriceFeed",
    //   deploymentState
    // );
    // await this.sendAndWaitForTransaction(
    //   avaxPriceFeed.setAddresses(
    //     this.configParams.externalAddrs.CHAINLINK_ETHUSD_PROXY,
    //     "AVAX PriceFeed",
    //     { gasPrice }
    //   )
    // );

    const preonPriceFeed = await this.loadOrDeploy(
      preonPriceFeedFactory,
      "priceFeed",
      deploymentState,
      [
        deploymentState.preonLp.address,
        PREONContracts.preonToken.address,
        maticPriceFeed.address,
      ]
    );

    // const starPriceFeed = await this.loadOrDeploy(
    //   starPriceFeedFactory,
    //   "STARPriceFeed",
    //   deploymentState,
    //   [
    //     deploymentState.starLpToken.address,
    //     coreContracts.starToken.address,
    //     maticPriceFeed.address,
    //   ]
    // );

    return {
      maticPriceFeed,
      stMaticPriceFeed,
      wBtcPriceFeed,
      wEthPriceFeed,
      usdPlusPriceFeed,
      iDaiPriceFeed,
      iUSDCPriceFeed,
      priceFeed: preonPriceFeed,
      STARPriceFeed: usdPlusPriceFeed, // changed starpricefeed to usd pricefeed
    };
  }

  async connectUnipoolMainnet(
    uniPool,
    PREONContracts,
    STARWETHPairAddr,
    duration
  ) {
    const gasPrice = this.configParams.GAS_PRICE;
    (await this.isOwnershipRenounced(uniPool)) ||
      (await this.sendAndWaitForTransaction(
        uniPool.setParams(
          PREONContracts.preonToken.address,
          STARWETHPairAddr,
          duration,
          { gasPrice }
        )
      ));
  }

  // --- Verify on Ethrescan ---
  async verifyContract(name, deploymentState, constructorArguments = []) {
    if (!this.configParams.TO_VERIFY) return;
    // console.log("@KingPreon: commented out verifyContract function");
    if (!deploymentState[name] || !deploymentState[name].address) {
      console.error(`  --> No deployment state for contract ${name}!!`);
      return;
    }
    if (deploymentState[name].verification) {
      console.log(`Contract ${name} already verified`);
      return;
    }

    try {
      await this.hre.run("verify:verify", {
        address: deploymentState[name].address,
        constructorArguments,
      });
    } catch (error) {
      // if it was already verified, it’s like a success, so let’s move forward and save it
      if (error.name != "NomicLabsHardhatPluginError") {
        console.error(`Error verifying: ${error.name}`);
        console.error(error);
        return;
      }
    }

    deploymentState[
      name
    ].verification = `${this.configParams.ETHERSCAN_BASE_URL}/${deploymentState[name].address}#code`;

    this.saveDeployment(deploymentState);
  }

  // --- Helpers ---

  async logContractObjects(contracts) {
    console.log(`Contract objects addresses:`);
    for (const contractName of Object.keys(contracts)) {
      console.log(`${contractName}: ${contracts[contractName].address}`);
    }
  }
}

module.exports = MainnetDeploymentHelper;
