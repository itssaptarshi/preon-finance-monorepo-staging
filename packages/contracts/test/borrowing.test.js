// TODO: currently only supports iDAI
// need to just update params of others

const MainnetDeploymentHelper = require("../utils/mainnetDeploymentHelpers.js");
const configParams = require("../mainnetDeployment/deploymentParams.polygon.js");
const { ERC20 } = require("../mainnetDeployment/ABIs/ERC20.js");
const { parseUnits } = require("ethers/lib/utils");

async function main() {
  const deployerWallet = (await ethers.getSigners())[0];
  const { TestHelper: th } = require("../utils/testHelpers.js");
  const mdh = new MainnetDeploymentHelper(configParams, deployerWallet);
  const deploymentState = mdh.loadPreviousDeployment();
  const toBigNum = ethers.BigNumber.from;
  const basefee = await ethers.provider.getGasPrice();
  const gasPrice = toBigNum(basefee).add(toBigNum("20000000000")); // add tip

  // Deploy core logic contracts
  let liquityCore = await mdh.deployLiquityCoreMainnet(
    configParams.externalAddrs.TELLOR_MASTER,
    deploymentState
  );
  console.log("Deployed liquity core mainnet");
  await mdh.logContractObjects(liquityCore);
  // -------------------------------------------------------

  // Deploy PREON Contracts
  const PREONContracts = await mdh.deployPREONContractsMainnet(
    configParams.liquityAddrs.GENERAL_SAFE, // bounty address
    // unipool.address, // lp rewards address
    configParams.liquityAddrs.PREON_SAFE, // multisig PREON endowment address
    deploymentState
  );
  console.log("Deployed PREON Contracts");
  // -------------------------------------------------------

  // Connect all core contracts up
  await mdh.connectCoreContractsMainnet(
    liquityCore,
    PREONContracts,
    configParams.externalAddrs.CHAINLINK_ETHUSD_PROXY
  );
  console.log("Connected Core Contracts");
  // -------------------------------------------------------

  // deploy yield bearing vaults e.g.PREON stMATIC vault (YstMATIC)
  await mdh.deployYieldBearingVaults(deploymentState);
  console.log("Deployed all Yield Vaults");
  // -------------------------------------------------------

  const multiTroveGetter = await mdh.deployMultiTroveGetterMainnet(
    liquityCore,
    deploymentState
  );

  // --- TroveManager ---

  const liqReserve = await liquityCore.troveManager.getSTAR_GAS_COMPENSATION();
  const minNetDebt = await liquityCore.troveManager.getMIN_NET_DEBT();

  th.logBN("system liquidation reserve", liqReserve);
  th.logBN("system min net debt      ", minNetDebt);

  // TODO:
  const wavaxLeverAdd = await mdh.deployLever(deploymentState);
  // done so that `deployJlpVaultOracle` can be executed
  const jlpVault = await mdh.deployJLPVault(deploymentState);

  const dysonVaultFactory = await mdh.getFactory("DysonVault");
  const dysonIDAIVault = await mdh.loadOrDeploy(
    dysonVaultFactory,
    "DysonIDAIVault",
    deploymentState
  );

  // TODO:
  const jlpFeeCurveAddr = await mdh.deployJlpFeeCurve(deploymentState);
  const jlpVaultOracle = await mdh.deployJlpVaultOracle(deploymentState);

  // Add collateral
  console.log("Adding IDAI as collateral");
  await mdh.sendAndWaitForTransaction(
    liquityCore.preonController.addCollateral(
      dysonIDAIVault.address,
      "956521739130434784",
      "956521739130434784",
      jlpVaultOracle, // TODO:
      18,
      jlpFeeCurveAddr, //TODO: Fee curve dep
      true,
      wavaxLeverAdd //TODO: Router
    )
  );
  console.log("IDAI Collateral added");

  // Open trove if not yet opened
  let troveStatus = await liquityCore.troveManager.getTroveStatus(
    deployerWallet.address
  );
  if (troveStatus.toString() != "1") {
    // erc20 gice allowance to borroweroperations

    // TODO:
    console.log(
      "await dysonIDAIVault.underlying()",
      await dysonIDAIVault.underlying()
    );

    const WETH_ERC20 = new ethers.Contract(
      await dysonIDAIVault.underlying(),
      ERC20.abi,
      deployerWallet
    );

    // to get iDai in the wallet
    const whaleAmmount = parseUnits("1000", "ether");
    const poolAddress = "0xbe068b517e869f59778b3a8303df2b8c13e05d06";
    const poolToken = await ethers.getContractAt(
      "contracts/Interfaces/IERC20.sol:IERC20",
      "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"
    );
    await network.provider.send("hardhat_impersonateAccount", [
      "0xba12222222228d8ba445958a75a0704d566bf2c8",
    ]);
    const poolTokenWhaleHolderSigner = await ethers.getSigner(
      "0xba12222222228d8ba445958a75a0704d566bf2c8"
    );
    console.log(
      "Whale poolToken balance",
      Number(await poolToken.balanceOf(poolTokenWhaleHolderSigner.address))
    );
    await poolToken
      .connect(poolTokenWhaleHolderSigner)
      .transfer(deployerWallet.address, whaleAmmount);
    const abi = ["function depositToken(uint256 depositAmount) external"];
    pool = await ethers.getContractAt(abi, poolAddress);
    await poolToken.approve(poolAddress, parseUnits("1000000", "18"));
    await pool.depositToken(whaleAmmount);

    const WETH_BALANCE = await WETH_ERC20.balanceOf(deployerWallet.address);
    th.logBN("WETH Balance", WETH_BALANCE);

    await mdh.sendAndWaitForTransaction(
      WETH_ERC20.approve(
        liquityCore.activePool.address,
        th.dec(10000000, "ether")
      )
    );
    await mdh.sendAndWaitForTransaction(
      WETH_ERC20.approve(
        deploymentState["DysonIDAIVault"].address,
        th.dec(10000000, "ether")
      )
    );
    await mdh.sendAndWaitForTransaction(
      WETH_ERC20.approve(
        liquityCore.borrowerOperations.address,
        th.dec(10000000, "ether")
      )
    );
    console.log("Providing first deposit");

    let _3kSTARWithdrawal = th.dec(3000, 18); // 3000 STAR
    let _3ETHcoll = th.dec(3, 18); // set according to the available balance in the account

    console.log("Opening trove...");
    await mdh.sendAndWaitForTransaction(
      liquityCore.borrowerOperations.openTrove(
        th.dec(5, 17), // max fee percentage
        _3kSTARWithdrawal, // star amt
        th.ZERO_ADDRESS,
        th.ZERO_ADDRESS,
        [deploymentState["DysonIDAIVault"].address],
        [_3ETHcoll], // collateral amt
        { gasPrice }
      )
    );
  } else {
    console.log("Deployer already has an active trove");
  }

  // Check deployer now has an open trove
  console.log(
    `deployer is in sorted list after making trove: ${await liquityCore.sortedTroves.contains(
      deployerWallet.address
    )}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
