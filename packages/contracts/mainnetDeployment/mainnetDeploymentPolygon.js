const { UniswapV2Factory } = require("./ABIs/UniswapV2Factory.js");
const { UniswapV2Pair } = require("./ABIs/UniswapV2Pair.js");
const { UniswapV2Router02 } = require("./ABIs/UniswapV2Router02Polygon.js");
const { DystRouter } = require("./ABIs/DystRouter.js");
const { CurvePoolFactory } = require("./ABIs/CurvePoolFactory.js");
const { CurvePlainPool } = require("./ABIs/CurvePlainPool.js");
const { ERC20 } = require("./ABIs/ERC20.js");
const { WETH } = require("./ABIs/WETH.js");
const {
  ChainlinkAggregatorV3Interface,
} = require("./ABIs/ChainlinkAggregatorV3Interface.js");
const {
  TestHelper: th,
  TimeValues: timeVals,
} = require("../utils/testHelpers.js");
const { dec } = th;
const MainnetDeploymentHelper = require("../utils/mainnetDeploymentHelpers.js");
const { BigNumber, Contract } = require("ethers");
const toBigNum = ethers.BigNumber.from;

async function mainnetDeployPolygon(configParams) {
  const date = new Date();
  console.log(date.toUTCString());
  const deployerWallet = (await ethers.getSigners())[0];
  const account2Wallet = (await ethers.getSigners())[1];
  console.log(`account 2 address: ${account2Wallet.address}`);
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
  console.log(`account2Wallet: ${account2Wallet.address}`);
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

  // // -------------------------------------------------------
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
  // deploy farm and boosted farm
  await mdh.deployFarmsMainnet(PREONContracts, deploymentState);
  console.log(deploymentState["boostedFarm"].address);

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
    deployerWallet,
    deploymentState
  );
  console.log("Connected Preon Contracts to Core");
  // -------------------------------------------------------
  // deploy preon and star price feeds
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

  // deploy yield bearing vaults e.g.PREON stMATIC vault (YstMATIC)
  await mdh.deployYieldBearingVaults(deploymentState);
  console.log("Deployed all Yield Vaults");

  // -------------------------------------------------------

  // @KingPreon: commented out below for now because it is not part of the core system
  // Deploy a read-only multi-trove getter
  const multiTroveGetter = await mdh.deployMultiTroveGetterMainnet(
    liquityCore,
    deploymentState
  );

  //  // Connect Unipool to PREONToken and the STAR-WETH pair address, with a 6 week duration
  //  const LPRewardsDuration = timeVals.SECONDS_IN_SIX_WEEKS
  //  await mdh.connectUnipoolMainnet(unipool, PREONContracts, STARWETHPairAddr, LPRewardsDuration)
  //
  //
  //  // deploy pool2
  //  const pool2Factories = {
  //    'tj': new ethers.Contract(
  //    configParams.externalAddrs.TJ_FACTORY,
  //    UniswapV2Factory.abi,
  //    deployerWallet
  //    ),
  //    'png': new ethers.Contract(
  //    configParams.externalAddrs.UNISWAP_V2_FACTORY,
  //    UniswapV2Factory.abi,
  //    deployerWallet
  //    )
  //  };
  //
  //
  //  for (const [dex, factory] of Object.entries(pool2Factories)) {
  //    let PREONWETHPairAddr = await factory.getPair(PREONContracts.preonToken.address, configParams.externalAddrs.WETH_ERC20)
  //    let WETHPREONPairAddr = await factory.getPair(configParams.externalAddrs.WETH_ERC20, PREONContracts.preonToken.address)
  //    assert.equal(PREONWETHPairAddr, WETHPREONPairAddr)
  //    const pool2Name = `${dex}Token`;
  //    if (PREONWETHPairAddr == th.ZERO_ADDRESS) {
  //      // Deploy Unipool for PREON-WETH
  //      const pairTx = await mdh.sendAndWaitForTransaction(factory.createPair(
  //        configParams.externalAddrs.WETH_ERC20,
  //        PREONContracts.preonToken.address,
  //        { gasPrice }
  //      ))
  //
  //      // Check Uniswap Pair STAR-WETH pair after pair creation (forwards and backwards should have same address)
  //      PREONWETHPairAddr = await factory.getPair(PREONContracts.preonToken.address, configParams.externalAddrs.WETH_ERC20)
  //      assert.notEqual(PREONWETHPairAddr, th.ZERO_ADDRESS)
  //      WETHPREONPairAddr = await factory.getPair(configParams.externalAddrs.WETH_ERC20, PREONContracts.preonToken.address)
  //      console.log(`${dex} PREON-WETH pair contract address after Uniswap pair creation: ${PREONWETHPairAddr}`)
  //      assert.equal(WETHPREONPairAddr, PREONWETHPairAddr)
  //      deploymentState[pool2Name] = {address: PREONWETHPairAddr, txHash: pairTx.transactionHash};
  //    } else if (!deploymentState[pool2Name]) {
  //      // Check Uniswap Pair STAR-WETH pair after pair creation (forwards and backwards should have same address)
  //      PREONWETHPairAddr = await factory.getPair(PREONContracts.preonToken.address, configParams.externalAddrs.WETH_ERC20)
  //      assert.notEqual(PREONWETHPairAddr, th.ZERO_ADDRESS)
  //      console.log(`${dex} PREON-WETH pair contract address after Uniswap pair creation: ${PREONWETHPairAddr}`)
  //      deploymentState[pool2Name] = {address: PREONWETHPairAddr};
  //    }
  //
  //    // create rewards unipools
  //    const pool2Unipool = await mdh.deployPool2UnipoolMainnet(deploymentState, dex);
  //    console.log(`${dex} pool2Unipool address: ${pool2Unipool.address}`)
  //    // duration is 4 weeks
  //    await mdh.connectUnipoolMainnet(pool2Unipool, PREONContracts, PREONWETHPairAddr, timeVals.SECONDS_IN_ONE_MONTH);
  //    console.log(`Successfully connected${pool2Name}`);
  //  }
  //
  //  // Log PREON and Unipool addresses
  //  await mdh.logContractObjects(PREONContracts)
  //  console.log(`Unipool address: ${unipool.address}`)
  //
  // const deployTx = await ethers.provider.getTransaction(
  //   deploymentState["preonToken"].txHash
  // );
  // const startBlock = deployTx.blockNumber;
  //
  // let deploymentStartTime = await PREONContracts.preonToken.getDeploymentStartTime();
  // let deploymentStartTime = (await ethers.provider.getBlock(latestBlock)).timestamp
  // deploymentState.metadata = deploymentState.metadata || {};
  // deploymentState.metadata.startBlock = startBlock;
  // deploymentState.metadata.deploymentDate = parseInt(
  //   deploymentStartTime.toString() + "000"
  // );
  // deploymentState.metadata.network = {
  //   name: mdh.hre.network.name,
  //   chainId: mdh.hre.network.config.chainId,
  // };
  // mdh.saveDeployment(deploymentState);

  //
  //  console.log(`deployment start time: ${deploymentStartTime}`)
  //  const oneYearFromDeployment = (Number(deploymentStartTime) + timeVals.SECONDS_IN_ONE_YEAR).toString()
  //  console.log(`time oneYearFromDeployment: ${oneYearFromDeployment}`)
  //
  //  // Deploy LockupContracts - one for each beneficiary
  //  const lockupContracts = {}
  //
  //  for (const [investor, investorObj] of Object.entries(configParams.beneficiaries)) {
  //    investorAddr = investorObj.address
  //    const lockupContractEthersFactory = await ethers.getContractFactory("LockupContract", deployerWallet)
  //    if (deploymentState[investor] && deploymentState[investor].address) {
  //      console.log(`Using previously deployed ${investor} lockup contract at address ${deploymentState[investor].address}`)
  //      lockupContracts[investor] = new ethers.Contract(
  //        deploymentState[investor].address,
  //        lockupContractEthersFactory.interface,
  //        deployerWallet
  //      )
  //    } else {
  //      console.log(`Deploying lockup for ${investor}`)
  //      let unlockTime = investorObj.unlockTime ? investorObj.unlockTime : oneYearFromDeployment;
  //      const txReceipt = await mdh.sendAndWaitForTransaction(PREONContracts.lockupContractFactory.deployLockupContract(investorAddr, unlockTime, { gasPrice }))
  //
  //      const address = await txReceipt.logs[0].address // The deployment event emitted from the LC itself is is the first of two events, so this is its address
  //      lockupContracts[investor] = new ethers.Contract(
  //        address,
  //        lockupContractEthersFactory.interface,
  //        deployerWallet
  //      )
  //
  //      deploymentState[investor] = {
  //        address: address,
  //        txHash: txReceipt.transactionHash
  //      }
  //
  //      mdh.saveDeployment(deploymentState)
  //    }
  //
  //    const preonTokenAddr = PREONContracts.preonToken.address
  //    // verify
  //    if (configParams.ETHERSCAN_BASE_URL) {
  //      console.log("@KingPreon: Removed Call to mdf.verifyContract in mainnetDeployment")
  //      // await mdh.verifyContract(investor, deploymentState, [preonTokenAddr, investorAddr, oneYearFromDeployment])
  //    }
  //  }
  //  mdh.saveDeployment(deploymentState)
  //  // // --- TESTS AND CHECKS  ---
  //
  //  // Deployer repay STAR
  //  // console.log(`deployer trove debt before repaying: ${await liquityCore.troveManager.getTroveDebt(deployerWallet.address)}`)
  // // await mdh.sendAndWaitForTransaction(liquityCore.borrowerOperations.repaySTAR(dec(800, 18), th.ZERO_ADDRESS, th.ZERO_ADDRESS, {gasPrice, gasLimit: 1000000}))
  //  // console.log(`deployer trove debt after repaying: ${await liquityCore.troveManager.getTroveDebt(deployerWallet.address)}`)
  //
  //  // Deployer add coll
  //  // console.log(`deployer trove coll before adding coll: ${await liquityCore.troveManager.getTroveColl(deployerWallet.address)}`)
  //  // await mdh.sendAndWaitForTransaction(liquityCore.borrowerOperations.addColl(th.ZERO_ADDRESS, th.ZERO_ADDRESS, {value: dec(2, 'ether'), gasPrice, gasLimit: 1000000}))
  //  // console.log(`deployer trove coll after addingColl: ${await liquityCore.troveManager.getTroveColl(deployerWallet.address)}`)
  //
  //  // Check chainlink proxy price ---
  //
  const chainlinkProxy = new ethers.Contract(
    configParams.externalAddrs.CHAINLINK_ETHUSD_PROXY,
    ChainlinkAggregatorV3Interface,
    deployerWallet
  );

  // Get latest price
  let chainlinkPrice = await chainlinkProxy.latestAnswer();
  console.log(`current Chainlink price: ${chainlinkPrice}`);
  //
  //  // Check Tellor price directly (through our TellorCaller)
  //  // let tellorPriceResponse = await liquityCore.tellorCaller.getTellorCurrentValue(1) // id == 1: the ETH-USD request ID
  //  // console.log(`current Tellor price: ${tellorPriceResponse[1]}`)
  //  // console.log(`current Tellor timestamp: ${tellorPriceResponse[2]}`)
  //
  //  // // --- Lockup Contracts ---
  //  console.log("LOCKUP CONTRACT CHECKS")
  //  // Check lockup contracts exist for each beneficiary with correct unlock time
  //  for (investor of Object.keys(lockupContracts)) {
  //    const lockupContract = lockupContracts[investor]
  //    // check LC references correct PREONToken
  //    const storedPREONTokenAddr = await lockupContract.preonToken()
  //    assert.equal(PREONContracts.preonToken.address, storedPREONTokenAddr)
  //    // Check contract has stored correct beneficary
  //    const onChainBeneficiary = await lockupContract.beneficiary()
  //    assert.equal(configParams.beneficiaries[investor].address.toLowerCase(), onChainBeneficiary.toLowerCase())
  //    // Check correct unlock time (1 yr from deployment)
  //    const unlockTime = await lockupContract.unlockTime()
  //    assert(toBigNum(unlockTime).gte(oneYearFromDeployment))
  //
  //    console.log(
  //      `lockupContract addr: ${lockupContract.address},
  //            stored PREONToken addr: ${storedPREONTokenAddr}
  //            beneficiary: ${investor},
  //            beneficiary addr: ${configParams.beneficiaries[investor].address},
  //            on-chain beneficiary addr: ${onChainBeneficiary},
  //            unlockTime: ${unlockTime}
  //            `
  //    )
  //  }

  // // --- Check correct addresses set in PREONToken
  // console.log("STORED ADDRESSES IN PREON TOKEN")
  // const storedMultisigAddress = await PREONContracts.preonToken.multisigAddress()
  // assert.equal(configParams.liquityAddrs.PREON_SAFE.toLowerCase(), storedMultisigAddress.toLowerCase())
  // console.log(`multi-sig address stored in PREONToken : ${th.squeezeAddr(storedMultisigAddress)}`)
  // console.log(`PREON Safe address: ${th.squeezeAddr(configParams.liquityAddrs.PREON_SAFE)}`)

  // // --- PREON allowances of different addresses ---
  // console.log("INITIAL PREON BALANCES")
  // // Unipool
  // const unipoolPREONBal = await PREONContracts.preonToken.balanceOf(unipool.address)
  // // assert.equal(unipoolPREONBal.toString(), '1333333333333333333333333')
  // th.logBN('Unipool PREON balance       ', unipoolPREONBal)

  // // PREON Safe
  // const preonSafeBal = await PREONContracts.preonToken.balanceOf(configParams.liquityAddrs.PREON_SAFE)
  // assert.equal(preonSafeBal.toString(), '64666666666666666666666667')
  // th.logBN('PREON Safe balance     ', preonSafeBal)

  // // Bounties/hackathons (General Safe)
  // const generalSafeBal = await PREONContracts.preonToken.balanceOf(configParams.liquityAddrs.GENERAL_SAFE)
  // assert.equal(generalSafeBal.toString(), '2000000000000000000000000')
  // th.logBN('General Safe balance       ', generalSafeBal)

  // // CommunityIssuance contract
  // const communityIssuanceBal = await PREONContracts.preonToken.balanceOf(PREONContracts.communityIssuance.address)
  // // assert.equal(communityIssuanceBal.toString(), '32000000000000000000000000')
  // th.logBN('Community Issuance balance', communityIssuanceBal)

  // // --- PriceFeed ---
  // console.log("PRICEFEED CHECKS");
  // // Check Pricefeed's status and last good price
  // const lastGoodPrice = await liquityCore.priceFeed.lastGoodPrice();
  // const priceFeedInitialStatus = await liquityCore.priceFeed.status();
  // th.logBN("PriceFeed first stored price", lastGoodPrice);
  // console.log(`PriceFeed initial status: ${priceFeedInitialStatus}`);

  // // Check PriceFeed's & TellorCaller's stored addresses
  // const priceFeedCLAddress = await liquityCore.priceFeed.priceAggregator()
  // const priceFeedTellorCallerAddress = await liquityCore.priceFeed.tellorCaller()
  // assert.equal(priceFeedCLAddress, configParams.externalAddrs.CHAINLINK_ETHUSD_PROXY)
  // assert.equal(priceFeedTellorCallerAddress, liquityCore.tellorCaller.address)

  // // Check Tellor address
  // const tellorCallerTellorMasterAddress = await liquityCore.tellorCaller.tellor()
  // assert.equal(tellorCallerTellorMasterAddress, configParams.externalAddrs.TELLOR_MASTER)

  // // --- Unipool ---

  // // Check Unipool's STAR-ETH Uniswap Pair address
  // const unipoolUniswapPairAddr = await unipool.uniToken()
  // console.log(`Unipool's stored STAR-ETH Uniswap Pair address: ${unipoolUniswapPairAddr}`)

  console.log("SYSTEM GLOBAL VARS CHECKS");
  // --- Sorted Troves ---

  // // Check max size
  // const sortedTrovesMaxSize = (await liquityCore.sortedTroves.data())[2]
  // assert.equal(sortedTrovesMaxSize, '115792089237316195423570985008687907853269984665640564039457584007913129639935')

  // --- TroveManager ---

  const liqReserve = await liquityCore.troveManager.getSTAR_GAS_COMPENSATION();
  const minNetDebt = await liquityCore.troveManager.getMIN_NET_DEBT();

  th.logBN("system liquidation reserve", liqReserve);
  th.logBN("system min net debt      ", minNetDebt);

  // ------------------------------------------------------------------
  // --- Make first PREON-ETH liquidity provision ---
  console.log("MAKE FIRST PREON-ETH LIQUIDITY PROVISION");

  // Check Uniswap pool has STAR and WETH tokens
  const PREONWETHPair = await new ethers.Contract(
    PREONWETHPairAddr,
    UniswapV2Pair.abi,
    deployerWallet
  );

  console.log(
    "PREON Deployer balance: ",
    (
      await PREONContracts.preonToken.balanceOf(deployerWallet.address)
    ).toString()
  );

  let token0Addr = await PREONWETHPair.token0();
  let token1Addr = await PREONWETHPair.token1();
  console.log(`PREON-ETH Pair token 0: ${th.squeezeAddr(token0Addr)},
        PREONToken contract addr: ${th.squeezeAddr(
          PREONContracts.preonToken.address
        )}`);
  console.log(`PREON-ETH Pair token 1: ${th.squeezeAddr(token1Addr)},
        WETH ERC20 contract addr: ${th.squeezeAddr(
          configParams.externalAddrs.WETH_ERC20
        )}`);

  // Check initial PREON-ETH pair reserves before provision
  let reserves = await PREONWETHPair.getReserves();
  th.logBN("PREON-ETH Pair's PREON reserves before provision", reserves[0]);
  th.logBN("PREON-ETH Pair's ETH reserves before provision", reserves[1]);

  // Get the UniswapV2Router contract
  const uniswapV2Router02 = new ethers.Contract(
    configParams.externalAddrs.UNISWAP_V2_ROUTER02,
    UniswapV2Router02.abi,
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
          value: dec(100, "ether"),
          gasPrice,
          gasLimit: 10000000, // For some reason, ethers can't estimate gas for this tx
        }
      )
    );
  } else {
    console.log("Liquidity already provided to Uniswap");
  }
  // Check PREON-ETH reserves after liquidity provision:
  reserves = await PREONWETHPair.getReserves();
  th.logBN("PREON-ETH Pair's PREON reserves after provision", reserves[0]);
  th.logBN("PREON-ETH Pair's ETH reserves after provision", reserves[1]);

  // --- Make first STAR-ETH liquidity provision ---

  // -------------------------------------------------------
  // deploy fee curve for wavax coll
  const wavaxFeeCurveAddr = await mdh.deployWavaxFeeCurve(deploymentState);
  const wmaticLeverAdd = await mdh.deployLever(deploymentState);

  console.log("adding collaterals");

  // deploy jlp collateral requirements
  // const jlpVault = await mdh.deployJLPVault(deploymentState);
  // const preonVaultFactory = await mdh.getFactory("PreonVault");
  // const preonVault = await mdh.loadOrDeploy(
  //   preonVaultFactory,
  //   "preonVault",
  //   deploymentState
  // );

  // const jlpFeeCurveAddr = await mdh.deployJlpFeeCurve(deploymentState);
  // const jlpVaultOracle = await mdh.deployJlpVaultOracle(deploymentState);

  // ? Add collaterals (non-yield bearing)
  console.log("Adding wMATIC as collateral");
  await mdh.sendAndWaitForTransaction(
    liquityCore.preonController.addCollateral(
      configParams.externalAddrs.WETH_ERC20, // rename it to wMatic
      "1000000000000000000",
      "1000000000000000000",
      liquityCore.maticPriceFeed.address,
      18,
      wavaxFeeCurveAddr, //TODO: Fee curve dep
      false,
      wmaticLeverAdd //TODO: Router
    )
  );

  console.log("Adding wETH as collateral");
  await mdh.sendAndWaitForTransaction(
    liquityCore.preonController.addCollateral(
      configParams.externalAddrs.wETH,
      "1000000000000000000",
      "1000000000000000000",
      liquityCore.wEthPriceFeed.address,
      18,
      wavaxFeeCurveAddr, //TODO: Fee curve dep
      false,
      wmaticLeverAdd //TODO: Router
    )
  );

  console.log("Adding wBTC as collateral");
  await mdh.sendAndWaitForTransaction(
    liquityCore.preonController.addCollateral(
      configParams.externalAddrs.wBTC,
      "1000000000000000000",
      "1000000000000000000",
      liquityCore.wBtcPriceFeed.address,
      8,
      wavaxFeeCurveAddr, //TODO: Fee curve dep
      false,
      wmaticLeverAdd //TODO: Router
    )
  );

  // ? adding Yield Bearing Collaterals (Dyson-Vault)
  console.log("Adding stMATIC vault as collateral");
  await mdh.sendAndWaitForTransaction(
    liquityCore.preonController.addCollateral(
      deploymentState["stMaticVault"].address,
      "916100000000000000",
      "916100000000000000",
      liquityCore.stMaticPriceFeed.address,
      18,
      wavaxFeeCurveAddr, //TODO: Fee curve dep
      true,
      wmaticLeverAdd //TODO: Router
    )
  );

  console.log("Adding USD_PLUS as collateral");
  await mdh.sendAndWaitForTransaction(
    liquityCore.preonController.addCollateral(
      deploymentState["usdPlusVault"].address,
      "959600000000000000",
      "959600000000000000",
      liquityCore.usdPlusPriceFeed.address,
      6,
      wavaxFeeCurveAddr, //TODO: Fee curve dep
      true,
      wmaticLeverAdd //TODO: Router
    )
  );

  console.log("Adding iUSDC as collateral");
  await mdh.sendAndWaitForTransaction(
    liquityCore.preonController.addCollateral(
      deploymentState["IUSDCVault"].address,
      "1046000000000000000",
      "1046000000000000000",
      liquityCore.usdPlusPriceFeed.address,
      6,
      wavaxFeeCurveAddr, //TODO: Fee curve dep
      true,
      wmaticLeverAdd //TODO: Router
    )
  );

  // ! TODO: not working - check
  console.log("Adding iDAI as collateral");
  await mdh.sendAndWaitForTransaction(
    liquityCore.preonController.addCollateral(
      deploymentState["IDAIVault"].address,
      "1046000000000000000",
      "1046000000000000000",
      liquityCore.iDaiPriceFeed.address,
      18,
      wavaxFeeCurveAddr, //TODO: Fee curve dep
      true,
      wmaticLeverAdd //TODO: Router
    )
  );

  // ! TODO: not working - check
  console.log("Adding iWmatic as collateral");
  await mdh.sendAndWaitForTransaction(
    liquityCore.preonController.addCollateral(
      deploymentState["IWMATICVault"].address,
      "1046000000000000000",
      "1046000000000000000",
      liquityCore.maticPriceFeed.address,
      18,
      wavaxFeeCurveAddr, //TODO: Fee curve dep
      true,
      wmaticLeverAdd //TODO: Router
    )
  );

  // // Add collateral
  // console.log("Adding LP as collateral");

  // await mdh.sendAndWaitForTransaction(
  //   liquityCore.preonController.addCollateral(
  //     preonVault.address,
  //     "956521739130434784",
  //     "956521739130434784",
  //     jlpVaultOracle, // TODO:
  //     18,
  //     jlpFeeCurveAddr, //TODO: Fee curve dep
  //     true,
  //     wavaxLeverAdd //TODO: Router
  //   )
  // );
  // console.log("Collateral added");

  // Swap Matic for usdc using dyst router

  // const dystRouter = new ethers.Contract(
  //   "0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e",
  //   DystRouter.abi,
  //   deployerWallet
  // );

  // latestBlock = await ethers.provider.getBlockNumber();
  // now = (await ethers.provider.getBlock(latestBlock)).timestamp;
  // let tenMinsFromNow = now + 60 * 60 * 10;

  // console.log("Swapping matic for usdc");

  // await mdh.sendAndWaitForTransaction(
  //   dystRouter.swapExactMATICForTokens(
  //     0,
  //     [
  //       [
  //         "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
  //         "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  //         false,
  //       ],
  //     ],
  //     configParams.DEPLOYER,
  //     // "0x31c57298578f7508B5982062cfEc5ec8BD346247",
  //     tenMinsFromNow,
  //     { value: dec(100000, 18) }
  //   )
  // );

  // console.log("Swapping completed");

  // const usdcContract = new ethers.Contract(
  //   "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  //   ERC20.abi,
  //   deployerWallet
  // );

  // await mdh.sendAndWaitForTransaction(
  //   usdcContract.approve(
  //     "0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e",
  //     th.dec(10000000, 18)
  //   )
  // );

  // Adding MATIC-USDC liquidity

  // console.log("Add liquidity");

  // await mdh.sendAndWaitForTransaction(
  //   dystRouter.addLiquidityMATIC(
  //     "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  //     false,
  //     th.dec(50000, 18),
  //     0,
  //     0,
  //     configParams.DEPLOYER,
  //     // "0x31c57298578f7508B5982062cfEc5ec8BD346247",
  //     tenMinsFromNow,
  //     { value: dec(100000, 18) }
  //   )
  // );
  // Open trove if not yet opened
  // let troveStatus = await liquityCore.troveManager.getTroveStatus(
  //   deployerWallet.address
  // );
  // if (troveStatus.toString() != "1") {
  //   // erc20 gice allowance to borroweroperations

  //   const WETH_ERC20 = new ethers.Contract(
  //     await preonVault.underlying(),
  //     ERC20.abi,
  //     deployerWallet
  //   );

  //   // await mdh.sendAndWaitForTransaction(
  //   //   WETH_ERC20.deposit({ value: dec(100000, "ether") })
  //   // );
  //   const WETH_BALANCE = await WETH_ERC20.balanceOf(deployerWallet.address);
  //   th.logBN("WETH Balance", WETH_BALANCE);

  //   await mdh.sendAndWaitForTransaction(
  //     WETH_ERC20.approve(
  //       liquityCore.activePool.address,
  //       th.dec(10000000, "ether")
  //     )
  //   );
  //   await mdh.sendAndWaitForTransaction(
  //     WETH_ERC20.approve(
  //       deploymentState["preonVault"].address,
  //       th.dec(10000000, "ether")
  //     )
  //   );
  //   await mdh.sendAndWaitForTransaction(
  //     WETH_ERC20.approve(
  //       liquityCore.borrowerOperations.address,
  //       th.dec(10000000, "ether")
  //     )
  //   );
  //   console.log("Providing first deposit");

  //   let _3kSTARWithdrawal = th.dec(3000, 18); // 3000 STAR
  //   let _3ETHcoll = th.dec(3, 15);

  //   console.log("Opening trove...");
  //   await mdh.sendAndWaitForTransaction(
  //     liquityCore.borrowerOperations.openTrove(
  //       th.dec(5, 17), // max fee percentage
  //       _3kSTARWithdrawal, // star amt
  //       th.ZERO_ADDRESS,
  //       th.ZERO_ADDRESS,
  //       [deploymentState["preonVault"].address],
  //       [_3ETHcoll], // collateral amt
  //       { gasPrice }
  //     )
  //   );
  // } else {
  //   console.log("Deployer already has an active trove");
  // }

  // // Check deployer now has an open trove
  // console.log(
  //   `deployer is in sorted list after making trove: ${await liquityCore.sortedTroves.contains(
  //     deployerWallet.address
  //   )}`
  // );

  // {
  //   troveStatus = await liquityCore.troveManager.getTroveStatus(
  //     deployerWallet.address
  //   );
  //   const debt = await liquityCore.troveManager.getTroveDebt(
  //     deployerWallet.address
  //   );
  //   const colls = await liquityCore.troveManager.getTroveColls(
  //     deployerWallet.address
  //   );
  //   th.logBN("deployer debt", debt);
  //   th.logBN("deployer coll", colls);
  //   console.log(`deployer's trove status: ${troveStatus}`);
  // }

  // Check deployer has STAR
  let deployerSTARBal = await liquityCore.starToken.balanceOf(
    deployerWallet.address
  );
  th.logBN("deployer's STAR balance", deployerSTARBal);

  // Check Uniswap pool has STAR and WETH tokens
  const STARETHPair = await new ethers.Contract(
    STARWETHPairAddr,
    UniswapV2Pair.abi,
    deployerWallet
  );

  token0Addr = await STARETHPair.token0();
  token1Addr = await STARETHPair.token1();
  console.log(`STAR-ETH Pair token 0: ${th.squeezeAddr(token0Addr)},
        STARToken contract addr: ${th.squeezeAddr(
          liquityCore.starToken.address
        )}`);
  console.log(`STAR-ETH Pair token 1: ${th.squeezeAddr(token1Addr)},
        WETH ERC20 contract addr: ${th.squeezeAddr(
          configParams.externalAddrs.WETH_ERC20
        )}`);

  // Check initial STAR-ETH pair reserves before provision
  reserves = await STARETHPair.getReserves();
  th.logBN("STAR-ETH Pair's STAR reserves before provision", reserves[0]);
  th.logBN("STAR-ETH Pair's ETH reserves before provision", reserves[1]);

  // Get the UniswapV2Router contract
  // const uniswapV2Router02 = new ethers.Contract(
  //   configParams.externalAddrs.UNISWAP_V2_ROUTER02,
  //   UniswapV2Router02.abi,
  //   deployerWallet
  // );

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

    // ! #pending #change this before mainnet deploy.
    const _amountToGive = 500;
    // Get amounts for liquidity provision
    const LP_ETH = dec(_amountToGive, "ether");

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
    // console.log("star token addr:", liquityCore.starToken.address);
    // console.log(STARAmount);
    // console.log(LP_ETH)
    // console.log(tenMinsFromNow);
    console.log("amount to give", _amountToGive);

    await mdh.sendAndWaitForTransaction(
      uniswapV2Router02.addLiquidityETH(
        liquityCore.starToken.address, // address of STAR token
        STARAmount, // STAR provision
        0, // minimum STAR provision
        LP_ETH, // minimum ETH provision
        deployerWallet.address, // address to send LP tokens to
        tenMinsFromNow, // deadline for this tx
        {
          value: (_amountToGive * 1e18).toString(),
          gasPrice,
          gasLimit: 5000000, // For some reason, ethers can't estimate gas for this tx
        }
      )
    );
  } else {
    console.log("Liquidity already provided to Uniswap");
  }
  // Check STAR-ETH reserves after liquidity provision:
  reserves = await STARETHPair.getReserves();
  th.logBN("STAR-ETH Pair's STAR reserves after provision", reserves[0]);
  th.logBN("STAR-ETH Pair's ETH reserves after provision", reserves[1]);

  async function _checkSwap(
    _name,
    _contractAddr,
    decimals,
    _directSwap = false
  ) {
    console.log("=".repeat(5), _name.toUpperCase(), "=".repeat(5));
    let now = (await ethers.provider.getBlock(latestBlock)).timestamp;
    let tenMinsFromNow = now + 60 * 60 * 10;

    const _contract = new Contract(_contractAddr, ERC20.abi, deployerWallet);

    const _starContract = new Contract(
      deploymentState["starToken"].address,
      ERC20.abi,
      deployerWallet
    );

    const _balance = await _contract.balanceOf(deployerWallet.address);

    const _starBalance = await _starContract.balanceOf(deployerWallet.address);
    console.log(`STAR balance: ${+_starBalance}`);

    console.log(_name, "@balance:", +_balance);
    console.log(_name, "@balance:", +_balance / 10 ** decimals);
    console.log("Deployer wallet addr:", deployerWallet.address);
    console.log(
      "@making approvals:",
      uniswapV2Router02.address,
      (100 * 10 ** decimals).toString()
    );

    const _allowanceTx = await _contract.approve(
      uniswapV2Router02.address,
      (100 * 10 ** decimals).toString()
    );

    const _allowanceToRouter = await _contract.allowance(
      deployerWallet.address,
      uniswapV2Router02.address
    );
    console.log("@router allowance:", +_allowanceToRouter);

    console.log(`\n@swapping ${_name} to star token`);

    if (_directSwap) {
      const _tokensTx = await uniswapV2Router02.swapExactTokensForTokens(
        (10 * 10 ** decimals).toString(),
        "0",
        [_contractAddr, deploymentState["starToken"].address],
        deployerWallet.address,
        tenMinsFromNow
      );
    } else {
      const _tokensTx = await uniswapV2Router02.swapExactTokensForTokens(
        (10 * 10 ** decimals).toString(),
        "0",
        [
          _contractAddr,
          "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // wMatic address
          deploymentState["starToken"].address,
        ],
        deployerWallet.address,
        tenMinsFromNow
      );
    }

    const _starBalanceAfter = await _starContract.balanceOf(
      deployerWallet.address
    );
    console.log(`STAR balance after: ${+_starBalanceAfter / 1e18} `);
    console.log(
      `STAR balance increased: ${(_starBalanceAfter - _starBalance) / 1e18}`
    );

    console.log("====".repeat(10));
    console.log("");
  }

  // ---  Check LP staking  ---
  // console.log("CHECK LP STAKING EARNS PREON");

  // Check deployer's LP tokens
  deployerLPTokenBal = await STARETHPair.balanceOf(deployerWallet.address);
  th.logBN("deployer's LP token balance", deployerLPTokenBal);

  const _wmaticAddr = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
  const _stMaticAddr = "0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4";
  const _btcAddr = "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6";
  const _usdcPlusAddr = "0x236eeC6359fb44CCe8f97E99387aa7F8cd5cdE1f";

  await _checkSwap("wmatic", _wmaticAddr, 18, true);
  await _checkSwap("stMATIC", _stMaticAddr, 18);
  await _checkSwap("USD+", _usdcPlusAddr, 6);

  // ? Test wmatic -> star swap
  // now = (await ethers.provider.getBlock(latestBlock)).timestamp;
  // let tenMinsFromNow = now + 60 * 60 * 10;

  // const _wmaticContract = new Contract(
  //   "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
  //   ERC20.abi,
  //   deployerWallet
  // );

  // const _wmaticBalance = await _wmaticContract.balanceOf(
  //   deployerWallet.address
  // );
  // console.log("@wmatic balance:", +_wmaticBalance / 1e18);

  // console.log("Deployer wallet addr:", deployerWallet.address);
  // console.log(
  //   "@making approvals:",
  //   uniswapV2Router02.address,
  //   "100000000000000000000"
  // );

  // const _allowanceTx = await _wmaticContract.approve(
  //   uniswapV2Router02.address,
  //   "100000000000000000000"
  // );

  // const _allowanceToRouter = await _wmaticContract.allowance(
  //   deployerWallet.address,
  //   uniswapV2Router02.address
  // );
  // console.log("@router allowance:", _allowanceToRouter);

  // console.log("\n\n@swapping wmatic -> star token");
  // const _tokensTx = await uniswapV2Router02.swapExactTokensForTokens(
  //   (10e18).toString(),
  //   "0",
  //   [
  //     "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
  //     deploymentState["starToken"].address,
  //   ],
  //   deployerWallet.address,
  //   tenMinsFromNow
  // );

  // // Stake LP tokens in Unipool
  // console.log(`STARETHPair addr: ${STARETHPair.address}`)
  // console.log(`Pair addr stored in Unipool: ${await unipool.uniToken()}`)

  // earnedPREON = await unipool.earned(deployerWallet.address)
  // th.logBN("deployer's farmed PREON before staking LP tokens", earnedPREON)

  // const deployerUnipoolStake = await unipool.balanceOf(deployerWallet.address)
  // if (deployerUnipoolStake.toString() == '0') {
  //   console.log('Staking to Unipool...')
  //   // Deployer approves Unipool
  //   await mdh.sendAndWaitForTransaction(
  //     STARETHPair.approve(unipool.address, deployerLPTokenBal, { gasPrice })
  //   )

  //   await mdh.sendAndWaitForTransaction(unipool.stake(1, { gasPrice }))
  // } else {
  //   console.log('Already staked in Unipool')
  // }

  // console.log("wait 90 seconds before checking earnings... ")
  // await configParams.waitFunction()

  // earnedPREON = await unipool.earned(deployerWallet.address)
  // th.logBN("deployer's farmed PREON from Unipool after waiting ~1.5mins", earnedPREON)

  // let deployerPREONBal = await PREONContracts.preonToken.balanceOf(
  //   deployerWallet.address
  // );
  // th.logBN("deployer PREON Balance Before SP deposit", deployerPREONBal);

  // --- Make SP deposit and earn PREON ---
  // console.log("CHECK DEPLOYER MAKING DEPOSIT AND EARNING PREON");

  // let SPDeposit = await liquityCore.stabilityPool.getCompoundedSTARDeposit(
  //   deployerWallet.address
  // );
  // th.logBN("deployer SP deposit before making deposit", SPDeposit);

  // // Provide to SP
  // await mdh.sendAndWaitForTransaction(
  //   liquityCore.stabilityPool.provideToSP(dec(15, 18), {
  //     gasPrice,
  //     gasLimit: 400000,
  //   })
  // );

  // Get SP deposit
  // SPDeposit = await liquityCore.stabilityPool.getCompoundedSTARDeposit(
  //   deployerWallet.address
  // );
  // th.logBN("deployer SP deposit after depositing 15 STAR", SPDeposit);

  // console.log("wait 90 seconds before withdrawing...");
  // // wait 90 seconds
  // await sleep(90000);

  // // Withdraw from SP
  // await mdh.sendAndWaitForTransaction(
  //   liquityCore.stabilityPool.withdrawFromSP(dec(1000, 18), {
  //     gasPrice,
  //     gasLimit: 400000,
  //   })
  // );

  // SPDeposit = await liquityCore.stabilityPool.getCompoundedSTARDeposit(
  //   deployerWallet.address
  // );
  // th.logBN("deployer SP deposit after full withdrawal", SPDeposit);

  // deployerPREONBal = await PREONContracts.preonToken.balanceOf(
  //   deployerWallet.address
  // );
  // th.logBN(
  //   "deployer PREON Balance after SP deposit withdrawal",
  //   deployerPREONBal
  // );

  // // ---  Attempt withdrawal from LC  ---
  // console.log("CHECK BENEFICIARY ATTEMPTING WITHDRAWAL FROM LC")

  // // connect Acct2 wallet to the LC they are beneficiary of
  // let account2LockupContract = await lockupContracts["ACCOUNT_2"].connect(account2Wallet)

  // // Deployer funds LC with 10 PREON
  // // await mdh.sendAndWaitForTransaction(PREONContracts.preonToken.transfer(account2LockupContract.address, dec(10, 18), { gasPrice }))

  // // account2 PREON bal
  // let account2bal = await PREONContracts.preonToken.balanceOf(account2Wallet.address)
  // th.logBN("account2 PREON bal before withdrawal attempt", account2bal)

  // // Check LC PREON bal
  // let account2LockupContractBal = await PREONContracts.preonToken.balanceOf(account2LockupContract.address)
  // th.logBN("account2's LC PREON bal before withdrawal attempt", account2LockupContractBal)

  // // Acct2 attempts withdrawal from  LC
  // await mdh.sendAndWaitForTransaction(account2LockupContract.withdrawPREON({ gasPrice, gasLimit: 1000000 }))

  // // Acct PREON bal
  // account2bal = await PREONContracts.preonToken.balanceOf(account2Wallet.address)
  // th.logBN("account2's PREON bal after LC withdrawal attempt", account2bal)

  // // Check LC bal
  // account2LockupContractBal = await PREONContracts.preonToken.balanceOf(account2LockupContract.address)
  // th.logBN("account2's LC PREON bal LC withdrawal attempt", account2LockupContractBal)

  // // --- Stake PREON ---
  // console.log("CHECK DEPLOYER STAKING PREON");

  // // Log deployer PREON bal and stake before staking
  // deployerPREONBal = await PREONContracts.preonToken.balanceOf(
  //   deployerWallet.address
  // );
  // th.logBN("deployer PREON bal before staking", deployerPREONBal);
  // let boostedFarmAddress = deploymentState["boostedFarm"].address;
  // console.log("Boosted Farm address : ", boostedFarmAddress);
  // let deployerPREONStake = await PREONContracts.vePREON.getUserPreonOnRewarder(
  //   deployerWallet.address,
  //   boostedFarmAddress
  // );
  // th.logBN("deployer stake before staking", deployerPREONStake);

  // await mdh.sendAndWaitForTransaction(
  //   PREONContracts.preonToken.approve(
  //     PREONContracts.vePREON.address,
  //     deployerPREONBal,
  //     { gasPrice }
  //   )
  // );

  // stake 13 PREON
  // await mdh.sendAndWaitForTransaction(
  //   PREONContracts.vePREON.update(
  //     [[boostedFarmAddress, th.dec(100, "ether"), true]],
  //     { gasPrice }
  //   )
  // );

  // // Log deployer PREON bal and stake after staking
  // deployerPREONBal = await PREONContracts.preonToken.balanceOf(
  //   deployerWallet.address
  // );
  // th.logBN("deployer PREON bal after staking", deployerPREONBal);
  // deployerPREONStake = await PREONContracts.vePREON.getUserPreonOnRewarder(
  //   deployerWallet.address,
  //   boostedFarmAddress
  // );
  // th.logBN("deployer stake after staking", deployerPREONStake);

  // // Log deployer rev share immediately after staking
  // let deployerSTARRevShare = await PREONContracts.vePREONEmissions.earned(
  //   deployerWallet.address
  // );
  // th.logBN("deployer pending STAR revenue share", deployerSTARRevShare);

  // --- 2nd Account opens trove ---
  // const trove2Status = await liquityCore.troveManager.getTroveStatus(
  //   account2Wallet.address
  // );
  // if (trove2Status.toString() != "1") {
  //   console.log("Acct 2 opens a trove ...");
  //   let _2kSTARWithdrawal = th.dec(2000, 18); // 2000 STAR
  //   let _1pt5_ETHcoll = th.dec(15, 17); // 1.5 ETH
  //   const borrowerOpsEthersFactory = await ethers.getContractFactory(
  //     "BorrowerOperations",
  //     account2Wallet
  //   );
  //   const borrowerOpsAcct2 = await new ethers.Contract(
  //     liquityCore.borrowerOperations.address,
  //     borrowerOpsEthersFactory.interface,
  //     account2Wallet
  //   );

  //   await mdh.sendAndWaitForTransaction(
  //     borrowerOpsAcct2.openTrove(
  //       th._100pct,
  //       _2kSTARWithdrawal,
  //       th.ZERO_ADDRESS,
  //       th.ZERO_ADDRESS,
  //       [configParams.externalAddrs.WETH_ERC20],
  //       [th.dec(500, "ether")],
  //       { gasPrice, gasLimit: 1000000 }
  //     )
  //   );
  // } else {
  //   console.log("Acct 2 already has an active trove");
  // }

  // const acct2Trove = await liquityCore.troveManager.Troves(
  //   account2Wallet.address
  // );
  // th.logBN("acct2 debt", acct2Trove[0]);
  // th.logBN("acct2 coll", acct2Trove[1]);
  // th.logBN("acct2 stake", acct2Trove[2]);
  // console.log(`acct2 trove status: ${acct2Trove[3]}`);

  // Log deployer's pending STAR gain - check fees went to staker (deloyer)
  // deployerPREONrew = await PREONContracts.vePREONEmissions.earned(
  //   deployerWallet.address
  // );
  // th.logBN(
  //   "deployer pending YETU revenue share from staking, after acct 2 opened trove",
  //   deployerPREONrew
  // );

  //  --- deployer withdraws staking gains ---
  // console.log("CHECK DEPLOYER WITHDRAWING STAKING GAINS");

  // check deployer's STAR balance before withdrawing staking gains
  // deployerSTARBal = await PREONContracts.preonToken.balanceOf(
  //   deployerWallet.address
  // );
  // th.logBN(
  //   "deployer PREON bal before withdrawing staking gains",
  //   deployerSTARBal
  // );

  // Deployer withdraws staking gains
  // await mdh.sendAndWaitForTransaction(
  //   PREONContracts.vePREON.update(
  //     [[boostedFarmAddress, th.dec(100, "ether"), false]],
  //     { gasPrice }
  //   )
  // );

  // check deployer's STAR balance after withdrawing staking gains
  // deployerSTARBal = await PREONContracts.preonToken.balanceOf(
  //   deployerWallet.address
  // );
  // th.logBN(
  //   "deployer PREON bal after withdrawing staking gains",
  //   deployerSTARBal
  // );
  // deployerPREONStake = await PREONContracts.vePREON.getUserPreonOnRewarder(
  //   deployerWallet.address,
  //   boostedFarmAddress
  // );
  // th.logBN("deployer stake after withdrawing", deployerPREONStake);

  // // --- System stats  ---
  //
  // Uniswap STAR-ETH pool size
  reserves = await STARETHPair.getReserves();
  th.logBN("STAR-ETH Pair's current STAR reserves", reserves[0]);
  th.logBN("STAR-ETH Pair's current ETH reserves", reserves[1]);

  // Number of troves
  const numTroves = await liquityCore.troveManager.getTroveOwnersCount();
  console.log(`number of troves: ${numTroves} `);

  // Sorted list size
  const listSize = await liquityCore.sortedTroves.getSize();
  console.log(`Trove list size: ${listSize} `);

  // Total system debt and coll
  const entireSystemDebt = await liquityCore.troveManager.getEntireSystemDebt();
  const entireSystemColl = await liquityCore.troveManager.getEntireSystemColl();
  th.logBN("Entire system debt", entireSystemDebt);
  th.logBN("Entire system coll", entireSystemColl);
  //
  // // TCR
  // const TCR = await liquityCore.troveManager.getTCR(chainlinkPrice)
  // console.log(`TCR: ${TCR}`)
  //
  // current borrowing rate
  const baseRate = await liquityCore.troveManager.baseRate();
  const currentBorrowingRate = await liquityCore.troveManager.getBorrowingRateWithDecay();
  th.logBN("Base rate", baseRate);
  th.logBN("Current borrowing rate", currentBorrowingRate);

  const _preonBal = await PREONContracts.preonToken.balanceOf(
    deploymentState["boostedFarm"].address
  );
  console.log(
    "@boosted farm: preon token balance:",
    +_preonBal,
    _preonBal.toString()
  );

  // // total SP deposits
  // const totalSPDeposits = await liquityCore.stabilityPool.getTotalSTARDeposits()
  // th.logBN("Total STAR SP deposits", totalSPDeposits)
  //
  // // total PREON Staked in SPREON
  // const totalPREONStaked = await PREONContracts.sPREON.totalPREONStaked()
  // th.logBN("Total PREON staked", totalPREONStaked)
  //
  // // total LP tokens staked in Unipool
  // const totalLPTokensStaked = await unipool.totalSupply()
  // th.logBN("Total LP (STAR-ETH) tokens staked in unipool", totalLPTokensStaked)
  //
  // // --- State variables ---
  //
  // // TroveManager
  // console.log("TroveManager state variables:")
  // const totalStakes = await liquityCore.troveManager.totalStakes()
  // const totalStakesSnapshot = await liquityCore.troveManager.totalStakesSnapshot()
  // const totalCollateralSnapshot = await liquityCore.troveManager.totalCollateralSnapshot()
  // th.logBN("Total trove stakes", totalStakes)
  // th.logBN("Snapshot of total trove stakes before last liq. ", totalStakesSnapshot)
  // th.logBN("Snapshot of total trove collateral before last liq. ", totalCollateralSnapshot)
  // //
  // const L_ETH = await liquityCore.troveManager.L_ETH()
  // const L_STARDebt = await liquityCore.troveManager.L_STARDebt()
  // th.logBN("L_ETH", L_ETH)
  // th.logBN("L_STARDebt", L_STARDebt)

  // // StabilityPool
  // console.log("StabilityPool state variables:")
  // const P = await liquityCore.stabilityPool.P()
  // const currentScale = await liquityCore.stabilityPool.currentScale()
  // const currentEpoch = await liquityCore.stabilityPool.currentEpoch()
  // // TODO: Supply an address here: epochToScaleToSum(address, epoch, scale)
  // const S = await liquityCore.stabilityPool.epochToScaleToSum(currentEpoch, currentScale)
  // const G = await liquityCore.stabilityPool.epochToScaleToG(currentEpoch, currentScale)
  // th.logBN("Product P", P)
  // th.logBN("Current epoch", currentEpoch)
  // th.logBN("Current scale", currentScale)
  // th.logBN("Sum S, at current epoch and scale", S)
  // th.logBN("Sum G, at current epoch and scale", G)

  // // SPREON
  // console.log("SPREON state variables:")
  // const F_STAR = await PREONContracts.sPREON.F_STAR()
  // const F_ETH = await PREONContracts.sPREON.F_ETH()
  // th.logBN("F_STAR", F_STAR)
  // th.logBN("F_ETH", F_ETH)

  // // CommunityIssuance
  // console.log("CommunityIssuance state variables:")
  // const totalPREONIssued = await PREONContracts.communityIssuance.totalPREONIssued()
  // th.logBN("Total PREON issued to depositors / front ends", totalPREONIssued)

  // // TODO: Uniswap *PREON-ETH* pool size (check it's deployed?)

  // ************************
  // --- NOT FOR APRIL 5: Deploy a PREONToken2 with General Safe as beneficiary to test minting PREON showing up in Gnosis App  ---

  // // General Safe PREON bal before:
  // const realGeneralSafeAddr = "0xF06016D822943C42e3Cb7FC3a6A3B1889C1045f8"

  //   const PREONToken2EthersFactory = await ethers.getContractFactory("PREONToken2", deployerWallet)
  //   const preonToken2 = await PREONToken2EthersFactory.deploy(
  //     "0xF41E0DD45d411102ed74c047BdA544396cB71E27",  // CI param: LC1
  //     "0x9694a04263593AC6b895Fc01Df5929E1FC7495fA", // PREON Staking param: LC2
  //     "0x98f95E112da23c7b753D8AE39515A585be6Fb5Ef", // LCF param: LC3
  //     realGeneralSafeAddr,  // bounty/hackathon param: REAL general safe addr
  //     "0x98f95E112da23c7b753D8AE39515A585be6Fb5Ef", // LP rewards param: LC3
  //     deployerWallet.address, // multisig param: deployer wallet
  //     {gasPrice, gasLimit: 10000000}
  //   )

  //   console.log(`preon2 address: ${preonToken2.address}`)

  //   let generalSafePREONBal = await preonToken2.balanceOf(realGeneralSafeAddr)
  //   console.log(`generalSafePREONBal: ${generalSafePREONBal}`)

  // ************************
  // --- NOT FOR APRIL 5: Test short-term lockup contract PREON withdrawal on mainnet ---

  // now = (await ethers.provider.getBlock(latestBlock)).timestamp

  // const LCShortTermEthersFactory = await ethers.getContractFactory("LockupContractShortTerm", deployerWallet)

  // new deployment
  // const LCshortTerm = await LCShortTermEthersFactory.deploy(
  //   PREONContracts.preonToken.address,
  //   deployerWallet.address,
  //   now,
  //   {gasPrice, gasLimit: 1000000}
  // )

  // LCshortTerm.deployTransaction.wait()

  // existing deployment
  // const deployedShortTermLC = await new ethers.Contract(
  //   "0xbA8c3C09e9f55dA98c5cF0C28d15Acb927792dC7",
  //   LCShortTermEthersFactory.interface,
  //   deployerWallet
  // )

  // new deployment
  // console.log(`Short term LC Address:  ${LCshortTerm.address}`)
  // console.log(`recorded beneficiary in short term LC:  ${await LCshortTerm.beneficiary()}`)
  // console.log(`recorded short term LC name:  ${await LCshortTerm.NAME()}`)

  // existing deployment
  //   console.log(`Short term LC Address:  ${deployedShortTermLC.address}`)
  //   console.log(`recorded beneficiary in short term LC:  ${await deployedShortTermLC.beneficiary()}`)
  //   console.log(`recorded short term LC name:  ${await deployedShortTermLC.NAME()}`)
  //   console.log(`recorded short term LC name:  ${await deployedShortTermLC.unlockTime()}`)
  //   now = (await ethers.provider.getBlock(latestBlock)).timestamp
  //   console.log(`time now: ${now}`)

  //   // check deployer PREON bal
  //   let deployerPREONBal = await PREONContracts.preonToken.balanceOf(deployerWallet.address)
  //   console.log(`deployerPREONBal before he withdraws: ${deployerPREONBal}`)

  //   // check LC PREON bal
  //   let LC_PREONBal = await PREONContracts.preonToken.balanceOf(deployedShortTermLC.address)
  //   console.log(`LC PREON bal before withdrawal: ${LC_PREONBal}`)

  // // withdraw from LC
  // const withdrawFromShortTermTx = await deployedShortTermLC.withdrawPREON( {gasPrice, gasLimit: 1000000})
  // withdrawFromShortTermTx.wait()

  // // check deployer bal after LC withdrawal
  // deployerPREONBal = await PREONContracts.preonToken.balanceOf(deployerWallet.address)
  // console.log(`deployerPREONBal after he withdraws: ${deployerPREONBal}`)

  //   // check LC PREON bal
  //   LC_PREONBal = await PREONContracts.preonToken.balanceOf(deployedShortTermLC.address)
  //   console.log(`LC PREON bal after withdrawal: ${LC_PREONBal}`)

  console.log("adding depositor - usd+ strategy");
  await mdh.sendAndWaitForTransaction(
    PREONContracts.vePREONEmissions.addDepositor(
      deploymentState["usdPlusStrategy"].address,
      {
        gasPrice: configParams.GAS_PRICE,
      }
    )
  );

  console.log("adding depositor - IUSDCStrategy");
  await mdh.sendAndWaitForTransaction(
    PREONContracts.vePREONEmissions.addDepositor(
      deploymentState["IUSDCStrategy"].address,
      {
        gasPrice: configParams.GAS_PRICE,
      }
    )
  );

  console.log("adding depositor - IWMATICStrategy");
  await mdh.sendAndWaitForTransaction(
    PREONContracts.vePREONEmissions.addDepositor(
      deploymentState["IWMATICStrategy"].address,
      {
        gasPrice: configParams.GAS_PRICE,
      }
    )
  );

  console.log("adding depositor - IDAI strategy");
  await mdh.sendAndWaitForTransaction(
    PREONContracts.vePREONEmissions.addDepositor(
      deploymentState["IDAIStrategy"].address,
      {
        gasPrice: configParams.GAS_PRICE,
      }
    )
  );

  console.log("adding depositor - stMaticStrategy strategy");
  await mdh.sendAndWaitForTransaction(
    PREONContracts.vePREONEmissions.addDepositor(
      deploymentState["stMaticStrategy"].address,
      {
        gasPrice: configParams.GAS_PRICE,
      }
    )
  );

  mdh.saveDeployment(deploymentState);

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
    "multiTroveGetter": "${deploymentState["multiTroveGetter"]["address"]}",
    "preonController": "${deploymentState["preonController"]["address"]}",
    "farm": "${deploymentState["farm"]["address"]}",
    "boostedFarm": "${deploymentState["boostedFarm"]["address"]}",
    "vePREON": "${deploymentState["vePREON"]["address"]}",
    "vePREONEmissions": "${deploymentState["vePREONEmissions"]["address"]}",
    "lpToken": "${deploymentState["lpToken"]["address"]}",
    "STARPriceFeed": "${deploymentState["usdPlusPriceFeed"]["address"]}"
  }
  `);

  console.log(`
  -- constants.js (frontend)
  {
      vePREON: {
        address: "${deploymentState["vePREON"]["address"]}",
        txHash: "0xDead"
      },
      vePREONEmissions: {
        address: "${deploymentState["vePREONEmissions"]["address"]}",
        txHash: "0xDead"
      },
      lpToken: {
        address: "${deploymentState["lpToken"]["address"]}",
        txHash: "0xDead"
      },
      boostedFarm: {
        address: "${deploymentState["boostedFarm"]["address"]}",
        txHash: "0xDead"
      },
      preonToken: {
        address: "${deploymentState["preonToken"]["address"]}",
        txHash: "0xDead"
      },
      lptoken: {
        address: "${deploymentState["lpToken"]["address"]}",
      },
      borrowerOperations: {
        address: "${deploymentState["borrowerOperations"]["address"]}",
        txHash: "0xDead"
      },
      starToken: {
        address: "${deploymentState["starToken"]["address"]}",
        txHash: "0xDead"
      },
      stMaticVault: {
        address: "${deploymentState["stMaticVault"]["address"]}",
        txHash: "0xDead"
      },
      usdPlusVault: {
        address: "${deploymentState["usdPlusVault"]["address"]}",
        txHash: "0xDead"
      },
      iWmaticVault: {
        address: "${deploymentState["IWMATICVault"]["address"]}",
        txHash: "0xDead"
      },
      iDaiVault: {
        address: "${deploymentState["IDAIVault"]["address"]}",
        txHash: "0xDead"
      },
      iUsdcVault: {
        address: "${deploymentState["IUSDCVault"]["address"]}",
        txHash: "0xDead"
      }
  }
  `);
}

module.exports = {
  mainnetDeployPolygon,
};
