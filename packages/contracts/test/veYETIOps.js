const TestDeploymentHelper = require("../utils/testDeploymentHelpers.js");
const testHelpers = require("../utils/testHelpers.js");

const BorrowerOperationsTester = artifacts.require("./BorrowerOperations.sol");
// const NonPayable = artifacts.require("NonPayable.sol");
const TroveManagerTester = artifacts.require("TroveManager");
// const STARTokenTester = artifacts.require("./STARTokenTester");

const th = testHelpers.TestHelper;

const dec = th.dec;
const toBN = th.toBN;
const mv = testHelpers.MoneyValues;
const timeValues = testHelpers.TimeValues;

const ZERO_ADDRESS = th.ZERO_ADDRESS;
const assertRevert = th.assertRevert;

/* NOTE: Some of the borrowing tests do not test for specific STAR fee values. They only test that the
 * fees are non-zero when they should occur, and that they decay over time.
 *
 * Specific STAR fee values will depend on the final fee schedule used, and the final choice for
 *  the parameter MINUTE_DECAY_FACTOR in the TroveManager, which is still TBD based on economic
 * modelling.
 *
 */

contract("BorrowerOperations", async (accounts) => {
  const [
    owner,
    alice,
    bob,
    carol,
    dennis,
    whale,
    A,
    B,
    C,
    D,
    E,
    F,
    G,
    H,
    // defaulter_1, defaulter_2,
    frontEnd_1,
    frontEnd_2,
    frontEnd_3,
  ] = accounts;

  const [bountyAddress, lpRewardsAddress, multisig] = accounts.slice(997, 1000);

  // const frontEnds = [frontEnd_1, frontEnd_2, frontEnd_3]

  let priceFeed;
  let starToken;
  let sortedTroves;
  let troveManager;
  let activePool;
  let stabilityPool;
  let defaultPool;
  let borrowerOperations;
  let sPREON;
  let preonToken;
  let ve;

  let contracts;
  let wethIDX;

  // const getOpenTroveSTARAmount = async (totalDebt) =>
  //   th.getOpenTroveSTARAmount(contracts, totalDebt);
  // const getNetBorrowingAmount = async (debtWithFee) =>
  //   th.getNetBorrowingAmount(contracts, debtWithFee);
  // const getActualDebtFromComposite = async (compositeDebt) =>
  //   th.getActualDebtFromComposite(compositeDebt, contracts);
  // const openTrove = async (params) => th.openTrove(contracts, params);
  // const getTroveEntireColl = async (trove) =>
  //   th.getTroveEntireColl(contracts, trove);
  // const getTroveEntireDebt = async (trove) =>
  //   th.getTroveEntireDebt(contracts, trove);
  // const getTroveStake = async (trove) => th.getTroveStake(contracts, trove);
  // const addERC20 = async (trove) => th.addERC20(contracts, token, account, addressToApprove, collateralAmount, extraParams)

  let STAR_GAS_COMPENSATION;
  let MIN_NET_DEBT;
  let BORROWING_FEE_FLOOR;

  before(async () => {});

  const testCorpus = ({ withProxy = false }) => {
    beforeEach(async () => {
      contracts = await TestDeploymentHelper.deployLiquityCore();
      contracts.borrowerOperations = await BorrowerOperationsTester.new();
      contracts.troveManager = await TroveManagerTester.new();
      contracts = await TestDeploymentHelper.deploySTARToken(contracts);
      const PREONContracts = await TestDeploymentHelper.deployPREONContractsHardhat(
        bountyAddress,
        lpRewardsAddress,
        multisig
      );

      await TestDeploymentHelper.connectPREONContracts(PREONContracts);
      await TestDeploymentHelper.connectCoreContracts(
        contracts,
        PREONContracts
      );
      await TestDeploymentHelper.connectPREONContractsToCore(
        PREONContracts,
        contracts
      );

      // if (withProxy) {
      //   const users = [alice, bob, carol, dennis, whale, A, B, C, D, E];
      //   await deploymentHelper.deployProxyScripts(
      //     contracts,
      //     PREONContracts,
      //     owner,
      //     users
      //   );
      // }

      // priceFeed = contracts.priceFeedTestnet
      priceFeedAVAX = contracts.priceFeedAVAX;
      priceFeedETH = contracts.priceFeedETH;
      priceFeed = priceFeedETH;
      starToken = contracts.starToken;
      sortedTroves = contracts.sortedTroves;
      troveManager = contracts.troveManager;
      activePool = contracts.activePool;
      stabilityPool = contracts.stabilityPool;
      defaultPool = contracts.defaultPool;
      borrowerOperations = contracts.borrowerOperations;
      hintHelpers = contracts.hintHelpers;
      whitelist = contracts.whitelist;

      sPREON = PREONContracts.sPREON;
      preonToken = PREONContracts.preonToken;
      communityIssuance = PREONContracts.communityIssuance;
      lockupContractFactory = PREONContracts.lockupContractFactory;

      vePreonNew = contracts.vePreonNew;
      // STAR_GAS_COMPENSATION = await borrowerOperations.STAR_GAS_COMPENSATION();
      // MIN_NET_DEBT = await borrowerOperations.MIN_NET_DEBT();
      // BORROWING_FEE_FLOOR = await borrowerOperations.BORROWING_FEE_FLOOR();

      // wethIDX = await whitelist.getIndex(contracts.weth.address);
    });

    // if (!withProxy) {
    //   it('closeTrove(): fails if owner cannot receive ETH', async () => {
    //     const nonPayable = await NonPayable.new()

    //     // we need 2 troves to be able to close 1 and have 1 remaining in the system
    //     await contracts.borrowerOperations.openTrove(th._100pct, dec(100000, 18), alice, alice, [contracts.weth.address], [dec(1000, 18)], {from: alice})
    //     // await borrowerOperations.openTrove(th._100pct, dec(100000, 18), alice, alice, { from: alice, value: dec(1000, 18) })

    //     // Alice sends STAR to NonPayable so its STAR balance covers its debt
    //     await starToken.transfer(nonPayable.address, dec(10000, 18), { from: alice })

    //     // open trove from NonPayable proxy contract
    //     const _100pctHex = '0xde0b6b3a7640000'
    //     const _1e25Hex = '0xd3c21bcecceda1000000'
    //     const openTroveData = th.getTransactionData('openTrove(uint256,uint256,address,address)', [_100pctHex, _1e25Hex, '0x0', '0x0'])
    //     await nonPayable.forward(borrowerOperations.address, openTroveData, { value: dec(10000, 'ether') })
    //     assert.equal((await troveManager.getTroveStatus(nonPayable.address)).toString(), '1', 'NonPayable proxy should have a trove')
    //     assert.isFalse(await th.checkRecoveryMode(contracts), 'System should not be in Recovery Mode')
    //     // open trove from NonPayable proxy contract
    //     const closeTroveData = th.getTransactionData('closeTrove()', [])
    //     await th.assertRevert(nonPayable.forward(borrowerOperations.address, closeTroveData), 'ActivePool: sending ETH failed')
    //   })
    // }
  };

  describe("Without proxy", async () => {
    testCorpus({ withProxy: false });

    it("transferFrom not owner revert test", async function () {});
  });

  // describe('With proxy', async () => {
  //   testCorpus({ withProxy: true })
  // })
});

contract("Reset chain state", async (accounts) => {});

/* TODO:

 1) Test SortedList re-ordering by ICR. ICR ratio
 changes with addColl, withdrawColl, withdrawSTAR, repaySTAR, etc. Can split them up and put them with
 individual functions, or give ordering it's own 'describe' block.

 2)In security phase:
 -'Negative' tests for all the above functions.
 */
