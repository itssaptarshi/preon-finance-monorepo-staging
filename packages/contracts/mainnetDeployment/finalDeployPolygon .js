const { UniswapV2Factory } = require("./ABIs/UniswapV2Factory.js");
const { UniswapV2Pair } = require("./ABIs/UniswapV2Pair.js");
const { UniswapV2Router02 } = require("./ABIs/UniswapV2Router02Polygon.js");
const { DystRouter } = require("./ABIs/DystRouter.js");
const { CurvePoolFactory } = require("./ABIs/CurvePoolFactory.js");
const { CurvePlainPool } = require("./ABIs/CurvePlainPool.js");
const {
  TestHelper: th,
  TimeValues: timeVals,
} = require("../utils/testHelpers.js");
const { dec } = th;
const MainnetDeploymentHelper = require("../utils/mainnetDeploymentHelpers.js");
const {
  ChainlinkAggregatorV3Interface,
} = require("./ABIs/ChainlinkAggregatorV3Interface.js");
const toBigNum = ethers.BigNumber.from;

async function finalDeployPolygon(configParams) {
  const date = new Date();
  console.log(date.toUTCString());
  const deployerWallet = (await ethers.getSigners())[0];
  // const account2Wallet = (await ethers.getSigners())[1];
  // console.log(`account 2 address: ${account2Wallet.address}`);
  const basefee = await ethers.provider.getGasPrice();
  const gasPrice = toBigNum(basefee).add(toBigNum("20000000000")); // add tip
  configParams.GAS_PRICE = gasPrice;
  console.log(`BWB gasPrice is ${configParams.GAS_PRICE}`);

  const mdh = new MainnetDeploymentHelper(configParams, deployerWallet);

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const deploymentState = mdh.loadPreviousDeployment();
  console.log(`deployer address: ${deployerWallet.address}`);
  // assert.equal(deployerWallet.address, configParams.liquityAddrs.DEPLOYER);
  // console.log(`account2Wallet: ${account2Wallet.address}`);
  // assert.equal(account2Wallet.address, configParams.beneficiaries.ADVISOR_B);
  let deployerETHBalance = await ethers.provider.getBalance(
    deployerWallet.address
  );
  console.log(`deployerETHBalance before: ${deployerETHBalance}`);
  // Get UniswapV2Factory instance at its deployed address
  const uniswapV2Factory = new ethers.Contract(
    configParams.externalAddrs.UNISWAP_V2_FACTORY,
    UniswapV2Factory.abi,
    deployerWallet
  );

  console.log(`Uniswp addr: ${uniswapV2Factory.address}`);
  // const uniAllPairsLength = await uniswapV2Factory.allPairsLength()
  // console.log(`Uniswap Factory number of pairs: ${uniAllPairsLength}`)

  deployerETHBalance = await ethers.provider.getBalance(deployerWallet.address);
  console.log(
    `deployer's ETH balance before deployments: ${deployerETHBalance}`
  );

  // -------------------------------------------------------
  // Deploy core logic contracts
  let liquityCore = await mdh.deployLiquityCoreMainnet(
    configParams.externalAddrs.TELLOR_MASTER,
    deploymentState
  );
  console.log("Deployed liquity core mainnet");
  await mdh.logContractObjects(liquityCore);

  // -------------------------------------------------------
  // Check Uniswap Pair STAR-ETH pair before pair creation
  let STARWETHPairAddr = await uniswapV2Factory.getPair(
    liquityCore.starToken.address,
    configParams.externalAddrs.WETH_ERC20
  );

  let WETHSTARPairAddr = await uniswapV2Factory.getPair(
    configParams.externalAddrs.WETH_ERC20,
    liquityCore.starToken.address
  );

  assert.equal(STARWETHPairAddr, WETHSTARPairAddr);

  if (STARWETHPairAddr == th.ZERO_ADDRESS) {
    // Deploy Unipool for STAR-WETH
    const pairTx = await mdh.sendAndWaitForTransaction(
      uniswapV2Factory.createPair(
        configParams.externalAddrs.WETH_ERC20,
        liquityCore.starToken.address,
        { gasPrice }
      )
    );

    // Check Uniswap Pair STAR-WETH pair after pair creation (forwards and backwards should have same address)
    STARWETHPairAddr = await uniswapV2Factory.getPair(
      liquityCore.starToken.address,
      configParams.externalAddrs.WETH_ERC20
    );
    assert.notEqual(STARWETHPairAddr, th.ZERO_ADDRESS);
    WETHSTARPairAddr = await uniswapV2Factory.getPair(
      configParams.externalAddrs.WETH_ERC20,
      liquityCore.starToken.address
    );
    console.log(
      `STAR-WETH pair contract address after Uniswap pair creation: ${STARWETHPairAddr}`
    );
    assert.equal(WETHSTARPairAddr, STARWETHPairAddr);
  }

  deploymentState["starLpToken"] = { address: STARWETHPairAddr };
  deploymentState["lpToken"] = { address: STARWETHPairAddr };

  // -------------------------------------------------------
  // Deploy Unipool
  // const unipool = await mdh.deployUnipoolMainnet(deploymentState);

  // -------------------------------------------------------
  // Deploy PREON Contracts
  const PREONContracts = await mdh.deployPREONContractsMainnet(
    configParams.liquityAddrs.GENERAL_SAFE, // bounty address
    // unipool.address, // lp rewards address
    configParams.liquityAddrs.PREON_SAFE, // multisig PREON endowment address
    deploymentState
  );
  console.log("Deployed PREON Contracts");
  await mdh.logContractObjects(PREONContracts);

  // -------------------------------------------------------
  // TODO - Deploy preon lp token
  let PREONWETHPairAddr = await uniswapV2Factory.getPair(
    PREONContracts.preonToken.address,
    configParams.externalAddrs.WETH_ERC20
  );
  let WETHPREONPairAddr = await uniswapV2Factory.getPair(
    configParams.externalAddrs.WETH_ERC20,
    PREONContracts.preonToken.address
  );
  assert.equal(PREONWETHPairAddr, WETHPREONPairAddr);

  if (PREONWETHPairAddr == th.ZERO_ADDRESS) {
    // Deploy Unipool for STAR-WETH
    const pairTx = await mdh.sendAndWaitForTransaction(
      uniswapV2Factory.createPair(
        configParams.externalAddrs.WETH_ERC20,
        PREONContracts.preonToken.address,
        { gasPrice }
      )
    );

    // Check Uniswap Pair PREON-WETH pair after pair creation (forwards and backwards should have same address)
    PREONWETHPairAddr = await uniswapV2Factory.getPair(
      PREONContracts.preonToken.address,
      configParams.externalAddrs.WETH_ERC20
    );
    assert.notEqual(PREONWETHPairAddr, th.ZERO_ADDRESS);
    WETHPREONPairAddr = await uniswapV2Factory.getPair(
      configParams.externalAddrs.WETH_ERC20,
      PREONContracts.preonToken.address
    );
    console.log(
      `PREON-WETH pair contract address after Uniswap pair creation: ${PREONWETHPairAddr}`
    );
    assert.equal(WETHPREONPairAddr, PREONWETHPairAddr);
  }

  deploymentState["preonLp"] = { address: PREONWETHPairAddr };

  // -------------------------------------------------------
  // Connect all core contracts up
  await mdh.connectCoreContractsMainnet(
    liquityCore,
    PREONContracts,
    configParams.externalAddrs.CHAINLINK_ETHUSD_PROXY
  );
  console.log("Connected Core Contracts");
  // -------------------------------------------------------
  await mdh.connectPREONContractsMainnet(PREONContracts);
  console.log("Connected PREON Contracts");
  // -------------------------------------------------------
  await mdh.connectPREONContractsToCoreMainnet(
    PREONContracts,
    liquityCore,
    deployerWallet
  );
  console.log("Connected Preon Contracts to Core");
  // -------------------------------------------------------
  // deploy preon and star price feeds
  console.log(" - 🎈 deploying deployPriceFeedsMainnet")
  liquityCore = {
    ...liquityCore,
    ...(await mdh.deployPriceFeedsMainnet(
      liquityCore,
      PREONContracts,
      deploymentState,
      CurvePoolFactory,
      CurvePlainPool
    )),
  };
  // -------------------------------------------------------
  console.log(" - 🎈 deploying boostedFarm")
  // deploy farm and boosted farm
  await mdh.deployFarmsMainnet(deploymentState);
  console.log(deploymentState["boostedFarm"].address);

  // -------------------------------------------------------
  console.log(" - 🎈 deploying deployYieldBearingVaults")
  // deploy yield bearing vaults e.g.PREON stMATIC vault (YstMATIC)
  await mdh.deployYieldBearingVaults(deploymentState);
  console.log("Deployed all Yield Vaults");

  // -------------------------------------------------------

  // Get the UniswapV2Router contract
  const uniswapV2Router02 = new ethers.Contract(
    configParams.externalAddrs.UNISWAP_V2_ROUTER02,
    UniswapV2Router02.abi,
    deployerWallet
  );

  // Check Uniswap pool has PREON and WETH tokens
  const PREONWETHPair = await new ethers.Contract(
    PREONWETHPairAddr,
    UniswapV2Pair.abi,
    deployerWallet
  );

  // --- Provide liquidity to PREON-ETH pair if not yet done so ---
  let deployerLPTokenBal = await PREONWETHPair.balanceOf(
    deployerWallet.address
  );
  if (deployerLPTokenBal.toString() == "0") {
    console.log("Providing liquidity to Uniswap...");
    // Give router an allowance for PREON
    await PREONContracts.preonToken.increaseAllowance(
      uniswapV2Router02.address,
      dec(10000, 18)
    );

    // Check Router's spending allowance
    const routerPREONAllowanceFromDeployer = await PREONContracts.preonToken.allowance(
      deployerWallet.address,
      uniswapV2Router02.address
    );
    th.logBN(
      "router's spending allowance for deployer's PREON",
      routerPREONAllowanceFromDeployer
    );

    // Get amounts for liquidity provision
    const LP_ETH = dec(1, "ether");

    // -------------------------------------------------------
    const chainlinkProxy = new ethers.Contract(
      configParams.externalAddrs.CHAINLINK_ETHUSD_PROXY,
      ChainlinkAggregatorV3Interface,
      deployerWallet
    );

    // Get latest price
    let chainlinkPrice = await chainlinkProxy.latestAnswer();
    console.log(`current Chainlink price: ${chainlinkPrice}`);

    // Convert 8-digit CL price to 18 and multiply by ETH amount
    const PREONAmount = toBigNum(chainlinkPrice)
      .mul(toBigNum(dec(1, 11)))
      .mul(toBigNum(LP_ETH))
      .div(toBigNum(dec(1, 18)));
    th.logBN("PREON amount", PREONAmount);

    const minPREONAmount = PREONAmount.sub(toBigNum(dec(100, 1)));
    th.logBN("min PREON amount", minPREONAmount);

    latestBlock = await ethers.provider.getBlockNumber();
    now = (await ethers.provider.getBlock(latestBlock)).timestamp;
    let tenMinsFromNow = now + 60 * 60 * 10;

    // Provide liquidity to PREON-ETH pair
    await mdh.sendAndWaitForTransaction(
      uniswapV2Router02.addLiquidityETH(
        PREONContracts.preonToken.address, // address of PREON token
        PREONAmount, // PREON provision
        0, // minimum PREON provision
        LP_ETH, // minimum ETH provision
        deployerWallet.address, // address to send LP tokens to
        tenMinsFromNow, // deadline for this tx
        {
          value: 0.1e18.toString(),
          gasPrice,
          gasLimit: 10000000, // For some reason, ethers can't estimate gas for this tx
        }
      )
    );
  } else {
    console.log("Liquidity already provided to Uniswap");
  }

  // -------------------------------------------------------
  // Check Uniswap pool has STAR and WETH tokens
  const STARETHPair = await new ethers.Contract(
    STARWETHPairAddr,
    UniswapV2Pair.abi,
    deployerWallet
  );

  // --- Provide liquidity to STAR-ETH pair if not yet done so ---
  deployerLPTokenBal = await STARETHPair.balanceOf(deployerWallet.address);
  if (deployerLPTokenBal.toString() == "0") {
    console.log("Providing liquidity to Uniswap...");
    // Give router an allowance for STAR
    await liquityCore.starToken.increaseAllowance(
      uniswapV2Router02.address,
      dec(10000, 18)
    );

    // Check Router's spending allowance
    const routerSTARAllowanceFromDeployer = await liquityCore.starToken.allowance(
      deployerWallet.address,
      uniswapV2Router02.address
    );
    th.logBN(
      "router's spending allowance for deployer's STAR",
      routerSTARAllowanceFromDeployer
    );

    // Get amounts for liquidity provision
    const LP_ETH = dec(1, "ether");

    const chainlinkProxy = new ethers.Contract(
      configParams.externalAddrs.CHAINLINK_ETHUSD_PROXY,
      ChainlinkAggregatorV3Interface,
      deployerWallet
    );

    // Get latest price
    let chainlinkPrice = await chainlinkProxy.latestAnswer();
    console.log(`current Chainlink price: ${chainlinkPrice}`);

    // Convert 8-digit CL price to 18 and multiply by ETH amount
    const STARAmount = toBigNum(chainlinkPrice)
      .mul(toBigNum(dec(1, 10)))
      .mul(toBigNum(LP_ETH))
      .div(toBigNum(dec(1, 18)));
    th.logBN("STAR amount to provision", STARAmount);

    const minSTARAmount = STARAmount.sub(toBigNum(dec(10, 1)));
    th.logBN("min STAR amount to provision", minSTARAmount);

    latestBlock = await ethers.provider.getBlockNumber();
    now = (await ethers.provider.getBlock(latestBlock)).timestamp;
    let tenMinsFromNow = now + 60 * 60 * 10;

    // Provide liquidity to STAR-ETH pair
    console.log(liquityCore.starToken.address);
    console.log(STARAmount);
    console.log(LP_ETH);
    console.log(tenMinsFromNow);
    await mdh.sendAndWaitForTransaction(
      uniswapV2Router02.addLiquidityETH(
        liquityCore.starToken.address, // address of STAR token
        STARAmount, // STAR provision
        0, // minimum STAR provision
        LP_ETH, // minimum ETH provision
        deployerWallet.address, // address to send LP tokens to
        tenMinsFromNow, // deadline for this tx
        {
          value: 0.1e18.toString(),
          gasPrice,
          gasLimit: 10000000, // For some reason, ethers can't estimate gas for this tx
        }
      )
    );
  } else {
    console.log("Liquidity already provided to Uniswap");
  }

  // -------------------------------------------------------
  // deploy fee curve for matic coll
  console.log(" - 🎈 deploying deployWavaxFeeCurve")
  const wavaxFeeCurveAddr = await mdh.deployWavaxFeeCurve(deploymentState);
  console.log(" - 🎈 deploying wmaticLeverAdd")
  const wmaticLeverAdd = await mdh.deployLever(deploymentState);

  // Add collateral
  console.log("Adding WETH as collateral");
  await mdh.sendAndWaitForTransaction(
    liquityCore.preonController.addCollateral(
      configParams.externalAddrs.WETH_ERC20,
      "1000000000000000000",
      "1000000000000000000",
      liquityCore.maticPriceFeed.address,
      18,
      wavaxFeeCurveAddr, //TODO: Fee curve dep
      false,
      wmaticLeverAdd //TODO: Router
    )
  );

  console.log(`
  -- polygon.json (frontend)
  {
    "activePool": "${deploymentState["activePool"]["address"]}",
    "borrowerOperations": "${deploymentState["borrowerOperations"]["address"]}",
    "troveManager": "${deploymentState["troveManager"]["address"]}",
    "collSurplusPool": "${deploymentState["collSurplusPool"]["address"]}",
    "communityIssuance": "${deploymentState["communityIssuance"]["address"]}",
    "defaultPool": "${deploymentState["defaultPool"]["address"]}",
    "hintHelpers": "${deploymentState["hintHelpers"]["address"]}",
    "priceFeed": "${deploymentState["priceFeed"]["address"]}",
    "sortedTroves": "${deploymentState["sortedTroves"]["address"]}",
    "stabilityPool": "${deploymentState["stabilityPool"]["address"]}",
    "gasPool": "${deploymentState["gasPool"]["address"]}",
    "starToken": "${deploymentState["starToken"]["address"]}",
    "preonToken": "${deploymentState["preonToken"]["address"]}",
    "preonController": "${deploymentState["preonController"]["address"]}",
    "farm": "${deploymentState["farm"]["address"]}",
    "boostedFarm": "${deploymentState["boostedFarm"]["address"]}",
    "vePREON": "${deploymentState["vePREON"]["address"]}",
    "vePREONEmissions": "${deploymentState["vePREONEmissions"]["address"]}",
    "lpToken": "${deploymentState["lpToken"]["address"]}",
    "STARPriceFeed": "${deploymentState["STARPriceFeed"]["address"]}"
  }
  `);
  // "multiTroveGetter": "${deploymentState["multiTroveGetter"]["address"]}",

  console.log(`
  -- constants.js (frontend)
  {
      vePREON: {
        address: "${deploymentState["vePREON"]["address"]}",
        txHash: "0x3985d862cfe6777806b9810d6e372f11d0b0c4c2d6d763f90e5a3f83cc6f7b90"
      },
      lpToken: {
        address: "${deploymentState["lpToken"]["address"]}",
        txHash: "0x3985d862cfe6777806b9810d6e372f11d0b0c4c2d6d763f90e5a3f83cc6f7b90"
      },
      boostedFarm: {
        address: "${deploymentState["boostedFarm"]["address"]}",
        txHash: "0x3985d862cfe6777806b9810d6e372f11d0b0c4c2d6d763f90e5a3f83cc6f7b90"
      },
      preonToken: {
        address: "${deploymentState["preonToken"]["address"]}",
        txHash: "0x3985d862cfe6777806b9810d6e372f11d0b0c4c2d6d763f90e5a3f83cc6f7b90"
      }
  }
  `);
}

module.exports = {
  finalDeployPolygon,
};
