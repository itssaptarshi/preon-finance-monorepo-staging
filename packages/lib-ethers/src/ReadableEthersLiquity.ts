import { BlockTag } from "@ethersproject/abstract-provider";

import {
  Decimal,
  Fees,
  LiquityStore,
  veYETIStake,
  ReadableLiquity,
  StabilityDeposit,
  Trove,
  TroveListingParams,
  TroveWithPendingRedistribution,
  UserTrove,
  Farm,
  UserTroveStatus
} from "@liquity/lib-base";

import { MultiTroveGetter } from "../types";

import { decimalify, numberify, panic } from "./_utils";
import { EthersCallOverrides, EthersProvider, EthersSigner } from "./types";

import {
  EthersLiquityConnection,
  EthersLiquityConnectionOptionalParams,
  EthersLiquityStoreOption,
  _connect,
  _getBlockTimestamp,
  _getContracts,
  _requireAddress,
  _requireSigner
} from "./EthersLiquityConnection";
import { BlockPolledLiquityStore } from "./BlockPolledLiquityStore";
import { BigNumber } from "ethers";
import { CallOverrides } from "@ethersproject/contracts";
import { BigNumberish } from "@ethersproject/bignumber";
import { _getYetiVaultToken, _getERC20Token, _getLPToken } from "./contracts";

// TODO: these are constant in the contracts, so it doesn't make sense to make a call for them,
// but to avoid having to update them here when we change them in the contracts, we could read
// them once after deployment and save them to LiquityDeployment.
const MINUTE_DECAY_FACTOR = Decimal.from("0.999037758833783000");
const BETA = Decimal.from(2);

enum BackendTroveStatus {
  nonExistent,
  active,
  closedByOwner,
  closedByLiquidation,
  closedByRedemption
}

const userTroveStatusFrom = (backendStatus: BackendTroveStatus): UserTroveStatus =>
  backendStatus === BackendTroveStatus.nonExistent
    ? "nonExistent"
    : backendStatus === BackendTroveStatus.active
    ? "open"
    : backendStatus === BackendTroveStatus.closedByOwner
    ? "closedByOwner"
    : backendStatus === BackendTroveStatus.closedByLiquidation
    ? "closedByLiquidation"
    : backendStatus === BackendTroveStatus.closedByRedemption
    ? "closedByRedemption"
    : panic(new Error(`invalid backendStatus ${backendStatus}`));

const convertToDate = (timestamp: number) => new Date(timestamp * 1000);

const validSortingOptions = ["ascendingCollateralRatio", "descendingCollateralRatio"];

const expectPositiveInt = <K extends string>(obj: { [P in K]?: number }, key: K) => {
  if (obj[key] !== undefined) {
    if (!Number.isInteger(obj[key])) {
      throw new Error(`${key} must be an integer`);
    }

    if (obj[key] < 0) {
      throw new Error(`${key} must not be negative`);
    }
  }
};

function convertToMap(keys: any, values: any): any {
  const r: any = {};
  for (let i = 0; i < keys.length; i++) {
    if (typeof values[i] !== typeof Decimal.ZERO) {
      r[keys[i]] = decimalify(values[i]);
    } else {
      r[keys[i]] = values[i];
    }
  }
  return r;
}
function bntoDec(bigNums: any): any {
  const decimals = [];
  for (let i = 0; i < bigNums.length; i++) {
    decimals.push(decimalify(bigNums[i]));
  }
  return decimals;
}

export class ReadableEthersLiquity implements ReadableLiquity {
  readonly connection: EthersLiquityConnection;

  /** @internal */
  constructor(connection: EthersLiquityConnection) {
    this.connection = connection;
  }

  /** @internal */
  static _from(
    connection: EthersLiquityConnection & { useStore: "blockPolled" }
  ): ReadableEthersLiquityWithStore<BlockPolledLiquityStore>;

  /** @internal */
  static _from(connection: EthersLiquityConnection): ReadableEthersLiquity;

  /** @internal */
  static _from(connection: EthersLiquityConnection): ReadableEthersLiquity {
    const readable = new ReadableEthersLiquity(connection);

    return connection.useStore === "blockPolled"
      ? new _BlockPolledReadableEthersLiquity(readable)
      : readable;
  }

  /** @internal */
  static connect(
    signerOrProvider: EthersSigner | EthersProvider,
    optionalParams: EthersLiquityConnectionOptionalParams & { useStore: "blockPolled" }
  ): Promise<ReadableEthersLiquityWithStore<BlockPolledLiquityStore>>;

  static connect(
    signerOrProvider: EthersSigner | EthersProvider,
    optionalParams?: EthersLiquityConnectionOptionalParams
  ): Promise<ReadableEthersLiquity>;

  /**
   * Connect to the Liquity protocol and create a `ReadableEthersLiquity` object.
   *
   * @param signerOrProvider - Ethers `Signer` or `Provider` to use for connecting to the Ethereum
   *                           network.
   * @param optionalParams - Optional parameters that can be used to customize the connection.
   */
  static async connect(
    signerOrProvider: EthersSigner | EthersProvider,
    optionalParams?: EthersLiquityConnectionOptionalParams
  ): Promise<ReadableEthersLiquity> {
    return ReadableEthersLiquity._from(await _connect(signerOrProvider, optionalParams));
  }

  /**
   * Check whether this `ReadableEthersLiquity` is a {@link ReadableEthersLiquityWithStore}.
   */
  hasStore(): this is ReadableEthersLiquityWithStore;

  /**
   * Check whether this `ReadableEthersLiquity` is a
   * {@link ReadableEthersLiquityWithStore}\<{@link BlockPolledLiquityStore}\>.
   */
  hasStore(store: "blockPolled"): this is ReadableEthersLiquityWithStore<BlockPolledLiquityStore>;

  hasStore(): boolean {
    return false;
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotalRedistributed} */
  async getTotalRedistributed(overrides?: EthersCallOverrides): Promise<Trove> {
    const { troveManager, yetiController } = _getContracts(this.connection);
    const { userAddress } = this.connection;
    const L_collAmounts: any = {};
    let totalDebt = Decimal.ZERO;
    const [troveColls] = await Promise.all([
      troveManager.getTroveColls(userAddress !== null && userAddress !== void 0 ? userAddress : "0")
    ]);
    const L_decimals = await this.getDecimals(troveColls[0]);
    for (let i = 0; i < troveColls[0].length; i++) {
      const [collateral, debt] = await Promise.all([
        troveManager.getL_Coll(troveColls[0][i], { ...overrides }).then(decimalify),
        troveManager.getL_YUSD(troveColls[0][i], { ...overrides }).then(decimalify)
      ]);
      L_collAmounts[troveColls[0][i]] = collateral;
      totalDebt = totalDebt.add(debt);
    }
    return new Trove(L_collAmounts, L_decimals, { debt: totalDebt });
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTroveBeforeRedistribution} */
  async getTroveBeforeRedistribution(
    address?: string,
    overrides?: EthersCallOverrides
  ): Promise<TroveWithPendingRedistribution> {
    address ??= _requireAddress(this.connection);

    const { troveManager, yetiController } = _getContracts(this.connection);
    const [troveStatus, troveDebt, troveColls] = await Promise.all([
      troveManager.getTroveStatus(address, { ...overrides }),
      troveManager.getTroveDebt(address, { ...overrides }),
      troveManager.getTroveColls(address, { ...overrides })
    ]);
    const collaterals: any = {};
    const decimals = await this.getDecimals(troveColls[0]);
    for (let i = 0; i < troveColls[1].length; i++) {
      collaterals[troveColls[0][i]] = decimalify(troveColls[1][i]);
    }
    const decimalDebt = decimalify(troveDebt);
    const debt = { debt: decimalDebt };
    const active = 1;
    const stakes: any = {};
    const snapshotAmounts: any = {};
    let snapshotYUSDDebt = BigNumber.from("0");
    const totalSnapshotYUSDDebt: any = {};
    // Flatten promises
    let promises = troveColls[0].map((coll: CallOverrides | undefined) => {
      return troveManager.getTroveStake(address == undefined ? "" : address, coll);
    });
    const rewardColl = troveColls[0].map((coll: any) => {
      return troveManager.getRewardSnapshotColl(address == undefined ? "" : address, coll);
    });
    const getRewardSnapshotYUSD = troveColls[0].map((coll: any) => {
      return troveManager.getRewardSnapshotYUSD(address == undefined ? "" : address, coll);
    });
    promises = promises.concat(rewardColl);
    promises = promises.concat(getRewardSnapshotYUSD);
    const result: BigNumber[] = await Promise.all(promises);
    for (let i = 0; i < troveColls[0].length; i++) {
      stakes[troveColls[0][i]] = decimalify(result[i * 3]);
      snapshotAmounts[troveColls[0][i]] = decimalify(result[i * 3 + 1]);
      snapshotYUSDDebt = snapshotYUSDDebt.add(result[i * 3 + 2]);
    }
    // for (const key in collaterals) {
    //   const [stake, snapshotAmount, colYUSDDebt] = await Promise.all([
    //     troveManager.getTroveStake(address, key),
    //     troveManager.getRewardSnapshotColl(address, key),
    //     troveManager.getRewardSnapshotYUSD(address, key)
    //   ])
    //   stakes[key] = decimalify(stake)
    //   snapshotAmounts[key] = decimalify(snapshotAmount);
    //   snapshotYUSDDebt = snapshotYUSDDebt.add(colYUSDDebt);
    // }
    totalSnapshotYUSDDebt["debt"] = decimalify(snapshotYUSDDebt);
    if (numberify(troveStatus) == active) {
      return new TroveWithPendingRedistribution(
        address,
        userTroveStatusFrom(numberify(troveStatus)),
        collaterals,
        decimals,
        debt,
        stakes,
        new Trove(snapshotAmounts, decimals, totalSnapshotYUSDDebt)
      );
    } else {
      return new TroveWithPendingRedistribution(
        address,
        userTroveStatusFrom(numberify(troveStatus))
      );
    }
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTrove} */
  async getTrove(address?: string, overrides?: EthersCallOverrides): Promise<UserTrove> {
    const [trove, totalRedistributed] = await Promise.all([
      this.getTroveBeforeRedistribution(address, overrides),
      this.getTotalRedistributed(overrides)
    ]);

    return trove.applyRedistribution(totalRedistributed);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getNumberOfTroves} */
  async getNumberOfTroves(overrides?: EthersCallOverrides): Promise<number> {
    const { troveManager } = _getContracts(this.connection);

    return (await troveManager.getTroveOwnersCount({ ...overrides })).toNumber();
  }

  // if the collateral is not wrapped, it returns Decimal(1)
  async getUnderlyingPerReceiptRatios(
    addresses: any,
    vaultTokens: any,
    overrides?: any
  ): Promise<any> {
    const ratios: any = {};
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      if (vaultTokens.includes(address)) {
        ratios[address] = await this.getUnderlyingPerReceipt(address);
      } else {
        ratios[address] = Decimal.from(1);
      }
    }
    return ratios;
  }
  // if the collateral is not wrapped, it returns Decimal(1)
  async getReceiptPerUnderlyingRatios(
    addresses: any,
    vaultTokens: any,
    overrides?: any
  ): Promise<any> {
    const ratios: any = {};
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      if (vaultTokens.includes(address)) {
        ratios[address] = await this.getReceiptPerUnderlying(address);
      } else {
        ratios[address] = Decimal.from(1);
      }
    }
    return ratios;
  }
  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getCollPrice} */
  getCollPrice(address: any, overrides?: any): any {
    const { yetiController } = _getContracts(this.connection);
    return yetiController.getPrice(address, { ...overrides }).then(decimalify);
  }
  async getPrices(addresses: any, overrides?: any): Promise<any> {
    const { yetiController } = _getContracts(this.connection);
    const prices: any = {};
    const promises = addresses.map((coll: any) => {
      return yetiController.getPrice(coll);
    });
    // const vaultAddresses: string[] = []
    const result: BigNumber[] = await Promise.all(promises);
    for (let i = 0; i < addresses.length; i++) {
      prices[addresses[i]] = decimalify(result[i]);
    }
    return prices;
  }
  async getUnderlyingDecimals(vaultTokens: string | any[], overrides?: any): Promise<any> {
    const decimals: any = {};
    for (let i = 0; i < vaultTokens.length; i++) {
      const address = vaultTokens[i];
      decimals[address] = await this.getUnderlyingDecimal(address);
    }
    return decimals;
  }

  async getCollPrices(
    addresses: any,
    vaultTokens: any,
    underlyingDecimals: any,
    overrides?: any
  ): Promise<any> {
    const { yetiController } = _getContracts(this.connection);
    const prices: any = {};
    const promises = addresses.map((coll: any) => {
      return yetiController.getPrice(coll);
    });
    // const vaultAddresses: string[] = []
    const result: BigNumber[] = await Promise.all(promises);
    // ToDo change it back
    for (let i = 0; i < addresses.length; i++) {
      prices[addresses[i]] = decimalify(result[i]);
    }
    // console.log("prices before", prices)
    for (let i = 0; i < vaultTokens.length; i++) {
      const address = vaultTokens[i];
      const ratioPrice = await this.getReceiptPerUnderlying(address);
      // console.log("ratioPrice", ratioPrice)
      // console.log("vaultAddresses[i]", vaultAddresses[i])
      // console.log("prices", prices)
      // console.log("underlyingPrices before division", ratioPrice.mul(prices[vaultAddresses[i]]))
      prices[vaultTokens[i]] = ratioPrice
        .mul(prices[address])
        .div(Decimal.from(10 ** (18 - +underlyingDecimals[address].bigNumber)));
      // console.log("priceAfterDivision", prices[vaultAddresses[i]])
    }
    return prices;
  }
  async getBalances(addresses: any, overrides?: any): Promise<any> {
    const balances: any = {};
    const promises = addresses.map((coll: any) => {
      return this.getBalanceERC20(coll);
    });
    const result = await Promise.all(promises);
    for (let i = 0; i < addresses.length; i++) {
      balances[addresses[i]] = result[i];
    }
    return balances;
  }
  async getLPBalances(addresses: any, overrides?: any): Promise<any> {
    addresses !== null && addresses !== void 0
      ? addresses
      : (addresses = _requireAddress(this.connection));
    const { lpToken } = _getContracts(this.connection);
    const balance = lpToken.balanceOf(addresses).then(decimalify);
    return balance;
  }

  /** @internal */
  async _getActivePool(overrides?: EthersCallOverrides): Promise<Trove> {
    const { activePool } = _getContracts(this.connection);
    const [activeDebt] = await Promise.all(
      [activePool.getYUSDDebt({ ...overrides })].map(getBigNumber => getBigNumber.then(decimalify))
    );
    const [activeColls] = await Promise.all([activePool.getAllCollateral()]);
    const decColls = [];
    const decimals = await this.getDecimals(activeColls[0]);
    for (let i = 0; i < activeColls[1].length; i++) {
      decColls.push(decimalify(activeColls[1][i]));
    }
    const collaterals = convertToMap(activeColls[0], decColls);
    // for (const coll in whitelistedColls) {
    //   const [collAmount] = await Promise.all(
    //     [
    //       activePool.getCollateralVC(coll, { ...overrides })
    //     ].map(getBigNumber => getBigNumber.then(decimalify))
    //   );
    //   collaterals[coll] = collAmount;
    // }
    return new Trove(collaterals, decimals, { debt: activeDebt });
  }

  /** @internal */
  async _getDefaultPool(overrides?: EthersCallOverrides): Promise<Trove> {
    const { defaultPool } = _getContracts(this.connection);
    const [defaultDebt] = await Promise.all(
      [defaultPool.getYUSDDebt({ ...overrides })].map(getBigNumber => getBigNumber.then(decimalify))
    );
    const [defaultColls] = await Promise.all([defaultPool.getAllCollateral()]);
    const decColls = [];
    const decimals = await this.getDecimals(defaultColls[0]);
    for (let i = 0; i < defaultColls[1].length; i++) {
      decColls.push(decimalify(defaultColls[1][i]));
    }
    const collaterals = convertToMap(defaultColls[0], decColls);
    // for (const coll in whitelistedColls) {
    //   const [collAmount] = await Promise.all(
    //     [
    //       defaultPool.getCollateral(coll, { ...overrides })
    //     ].map(getBigNumber => getBigNumber.then(decimalify))
    //   );
    //   collaterals[coll] = collAmount;
    // }
    return new Trove(collaterals, decimals, { debt: defaultDebt });
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotal} */
  async getTotal(overrides?: EthersCallOverrides): Promise<Trove> {
    const [activePool, defaultPool] = await Promise.all([
      this._getActivePool(overrides),
      this._getDefaultPool(overrides)
    ]);

    return activePool.add(defaultPool);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getStabilityDeposit} */
  async getStabilityDeposit(
    address?: string,
    overrides?: EthersCallOverrides
  ): Promise<StabilityDeposit> {
    address ??= _requireAddress(this.connection);
    const { stabilityPool } = _getContracts(this.connection);

    const [initialValue, currentYUSD, collateralsGain, yetiReward] = await Promise.all([
      stabilityPool.deposits(address, { ...overrides }),
      stabilityPool.getCompoundedYUSDDeposit(address, { ...overrides }),
      stabilityPool.getDepositorGains(address, { ...overrides }),
      stabilityPool.getDepositorYETIGain(address, { ...overrides })
    ]);
    const collGain = convertToMap(collateralsGain[0], bntoDec(collateralsGain[1]));
    return new StabilityDeposit(
      // @ts-expect-error: Testing
      decimalify(initialValue),
      decimalify(currentYUSD),
      collGain,
      decimalify(yetiReward)
    );
  }

  async getFarm(address: any, overrides?: any): Promise<any> {
    address !== null && address !== void 0 ? address : (address = _requireAddress(this.connection));
    const { farm } = _getContracts(this.connection);
    const [lpTokenBalance, earnedYETI, totalLPStaked, rewardRate] = await Promise.all([
      farm.balanceOf(address, { ...overrides }),
      farm.earned(address, { ...overrides }),
      farm.totalSupply({ ...overrides }),
      farm.rewardRate({ ...overrides })
    ]);
    return new Farm(
      decimalify(lpTokenBalance),
      decimalify(earnedYETI),
      decimalify(totalLPStaked),
      decimalify(rewardRate)
    );
  }
  async getBoostedFarm(address: any, overrides?: any): Promise<any> {
    address !== null && address !== void 0 ? address : (address = _requireAddress(this.connection));
    const { boostedFarm } = _getContracts(this.connection);
    const [lpTokenBalance, earnedYETI, totalLPStaked, rewardRate] = await Promise.all([
      boostedFarm.userInfo(address, { ...overrides }),
      boostedFarm.pendingTokens(address, { ...overrides }),
      boostedFarm.totalSupply({ ...overrides }),
      boostedFarm.rewardRate({ ...overrides })
    ]);
    return new Farm(
      decimalify(lpTokenBalance.amount),
      decimalify(earnedYETI),
      decimalify(totalLPStaked),
      decimalify(rewardRate)
    );
  }
  async getVEYETIStake(address: any, overrides?: any): Promise<any> {
    address !== null && address !== void 0 ? address : (address = _requireAddress(this.connection));
    console.log(address);
    const { veYETI, veYETIEmissions, boostedFarm } = _getContracts(this.connection);
    const boostUserAmount = await boostedFarm.userInfo(address, { ...overrides });
    const [
      yetiStake,
      yetiStakeOnFarm,
      veYetiOnFarm,
      veYETIGain,
      veYETITotal,
      totalUserYeti,
      totalYeti,
      yetiEarned,
      veYETIEmisionsRewardRate,
      accumulationRate,
      boostRewardRate,
      boostBasePartition,
      boostSumOfFactors,
      boostTotalSupply
    ] = await Promise.all([
      veYETI.getUserYetiOnRewarder(address, "0x0000000000000000000000000000000000000000", {
        ...overrides
      }),
      veYETI.getUserYetiOnRewarder(address, "0xAa7C3cC063370B48fcD054bB0F191875209f2eA3", {
        ...overrides
      }),
      veYETI.getVeYetiOnRewarder(address, "0xAa7C3cC063370B48fcD054bB0F191875209f2eA3", {
        ...overrides
      }),
      veYETI.getVeYetiOnRewarder(address, "0x0000000000000000000000000000000000000000", {
        ...overrides
      }),
      veYETI.getTotalVeYeti(address, { ...overrides }),
      veYETI.getTotalYeti(address, { ...overrides }),
      veYETI.totalYeti({ ...overrides }),
      veYETIEmissions.earned(address, { ...overrides }),
      veYETIEmissions.rewardRate({ ...overrides }),
      veYETI.getAccumulationRate({ ...overrides }),
      boostedFarm.rewardRate({ ...overrides }),
      boostedFarm.basePartition({ ...overrides }),
      boostedFarm.sumOfFactors({ ...overrides }),
      boostedFarm.totalSupply({ ...overrides })
    ]);
    return new veYETIStake(
      decimalify(yetiStake),
      decimalify(veYETIGain),
      decimalify(veYETITotal),
      decimalify(totalUserYeti),
      decimalify(totalYeti),
      decimalify(yetiEarned),
      decimalify(veYETIEmisionsRewardRate),
      decimalify(accumulationRate),
      decimalify(boostUserAmount.amount),
      decimalify(boostUserAmount.factor),
      decimalify(boostRewardRate),
      decimalify(boostBasePartition),
      decimalify(yetiStakeOnFarm),
      decimalify(boostSumOfFactors),
      decimalify(veYetiOnFarm),
      decimalify(boostTotalSupply)
    );
  }
  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getRemainingStabilityPoolYETIReward} */
  async getPoolRewardRate(overrides?: any): Promise<any> {
    const { communityIssuance } = _getContracts(this.connection);
    const rewardRate = decimalify(await communityIssuance.getRewardRate({ ...overrides }));
    return rewardRate;
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getRemainingStabilityPoolYETIReward} */
  async getRemainingStabilityPoolYETIReward(overrides?: any): Promise<any> {
    const { communityIssuance } = _getContracts(this.connection);
    const issuanceCap = this.connection.totalStabilityPoolYETIReward;
    //TODO Yeti
    const totalYETIIssued = decimalify(await communityIssuance.totalYetiIssued({ ...overrides }));
    const burnedRewards = 18000000;
    // totalYETIIssued approaches but never reaches issuanceCap
    return issuanceCap.sub(totalYETIIssued).sub(burnedRewards);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getYUSDInStabilityPool} */
  getYUSDInStabilityPool(overrides?: EthersCallOverrides): Promise<Decimal> {
    const { stabilityPool } = _getContracts(this.connection);
    return stabilityPool.getTotalYUSDDeposits({ ...overrides }).then(decimalify);
  }

  // Get Deposit fee for an individual collateral helper function.
  async getDepositFee(
    VCInput: { [x: string]: { hex: any } },
    VCOutput: { [x: string]: { hex: any } },
    overrides?: any
  ): Promise<any> {
    const { borrowerOperations, yetiController, activePool, defaultPool } = _getContracts(
      this.connection
    );
    const [totalVCBalancePre] = await Promise.all([borrowerOperations.getEntireSystemColl()]);
    const allVCDifference = BigNumber.from("0");
    const totalFee: any = {};
    for (const coll in VCInput) {
      const [collateralVCInput] = await Promise.all([
        yetiController.getValueVC(coll, VCInput[coll].hex)
      ]);
      allVCDifference.add(collateralVCInput);
    }
    for (const coll in VCOutput) {
      const [collateralVCInput] = await Promise.all([
        yetiController.getValueVC(coll, VCOutput[coll].hex)
      ]);
      allVCDifference.sub(collateralVCInput);
      totalFee[coll] = Decimal.ZERO;
    }
    for (const coll in VCInput) {
      // console.log('VCInput[coll].hex', coll, VCInput[coll].hex)
      const [collateralVCInput, activePoolVCBalance, defaultPoolVCBalance] = await Promise.all([
        await yetiController.getValueVC(coll, VCInput[coll].hex),
        activePool.getCollateralVC(coll),
        defaultPool.getCollateralVC(coll)
      ]);
      if (collateralVCInput.eq(BigNumber.from("0"))) {
        totalFee[coll] = Decimal.ZERO;
      } else {
        // console.log('111', collateralVCInput)
        // console.log('222', activePoolVCBalance.add(defaultPoolVCBalance))
        // console.log('333', totalVCBalancePre)
        // console.log('444', totalVCBalancePre.add(allVCDifference))
        const [depositFee] = await Promise.all([
          yetiController.getVariableDepositFee(
            coll,
            collateralVCInput,
            activePoolVCBalance.add(defaultPoolVCBalance),
            totalVCBalancePre,
            totalVCBalancePre.add(allVCDifference)
          )
        ]);
        totalFee[coll] = decimalify(depositFee);
      }
    }
    return totalFee;
  }

  async getEstimatedFarmRewards(amount: any, time: any, overrides?: any): Promise<any> {
    const { farm } = _getContracts(this.connection);
    const estimatedRewards = await farm.rewardToEarn(
      Decimal.from(String(amount)).hex,
      Decimal.from(String(time)).hex
    );
    return decimalify(estimatedRewards).div(Decimal.from(1000000000000000000));
  }
  async getEstimatedVeYetiRewards(amount: any, time: any, overrides?: any): Promise<any> {
    const { veYETIEmissions } = _getContracts(this.connection);
    const estimatedRewards = await veYETIEmissions.rewardToEarn(
      Decimal.from(String(amount)).hex,
      Decimal.from(String(time)).hex
    );
    return decimalify(estimatedRewards).div(Decimal.from(1000000000000000000));
  }
  async getEstimatedYETIPoolRewards(amount: any, time: any, overrides?: any): Promise<any> {
    const { stabilityPool } = _getContracts(this.connection);
    const estimatedRewards = await stabilityPool.getEstimatedYETIPoolRewards(
      Decimal.from(String(amount)).hex,
      Decimal.from(String(time)).hex
    );
    return decimalify(estimatedRewards).div(Decimal.from(1000000000000000000));
  }
  async getBalanceERC20(address: any): Promise<any> {
    const signer = _requireSigner(this.connection);
    const userAddress = _requireAddress(this.connection);
    if (address != undefined) {
      const erc20 = _getERC20Token(address, signer);
      const balance = erc20.token.balanceOf(userAddress).then(decimalify);
      return balance;
    }
    return Decimal.ZERO;
  }
  async getLP(address: any): Promise<any> {
    const signer = _requireSigner(this.connection);
    const userAddress = _requireAddress(this.connection);
    if (address != undefined) {
      const erc20 = _getLPToken(address, signer);
      const balance = erc20.token.balanceOf(userAddress).then(decimalify);
    }
    return Decimal.ZERO;
  }
  async getSortedTroveHead(): Promise<any> {
    const { sortedTroves } = _getContracts(this.connection);
    return await sortedTroves.getFirst();
  }
  async getSortedTroveTail(): Promise<any> {
    const { sortedTroves } = _getContracts(this.connection);
    return await sortedTroves.getLast();
  }
  async getSortedTroveSize(): Promise<any> {
    const { sortedTroves } = _getContracts(this.connection);
    return (await sortedTroves.getSize()).toNumber();
  }
  async getSortedTroveNext(id: string): Promise<any> {
    const { sortedTroves } = _getContracts(this.connection);
    return await sortedTroves.getNext(id);
  }
  async getSortedTrovePrev(id: string): Promise<any> {
    const { sortedTroves } = _getContracts(this.connection);
    return await sortedTroves.getPrev(id);
  }
  async getCurrentAICR(borrower: any): Promise<any> {
    const { troveManager } = _getContracts(this.connection);
    return troveManager.getCurrentAICR(borrower).then(decimalify);
  }
  async getTroveDebt(borrower) {
    const { troveManager } = _getContracts(this.connection);
    return troveManager.getTroveDebt(borrower).then(decimalify);
  }
  async getYusdAllowance(from: any, to: any, amount: any): Promise<any> {
    const { yusdToken } = _getContracts(this.connection);
    let result = false;
    const allowanceResult = await yusdToken.allowance(from, to);
    if (decimalify(allowanceResult).gte(amount)) {
      result = true;
    }
    return result;
  }
  async getYETIPrice(): Promise<any> {
    const { priceFeed } = _getContracts(this.connection);
    // @ts-expect-error: testing
    return priceFeed.fetchPrice_v().then(decimalify);
  }
  async getYUSDPrice(): Promise<any> {
    const { YUSDPriceFeed } = _getContracts(this.connection);
    return YUSDPriceFeed.fetchPrice_v().then(decimalify);
  }
  async getGlobalBoostFactor(): Promise<any> {
    const { sortedTroves } = _getContracts(this.connection);
    return sortedTroves.globalBoostFactor().then(decimalify);
  }
  async getDecayedBoost(address: any): Promise<any> {
    address !== null && address !== void 0 ? address : (address = _requireAddress(this.connection));
    const { sortedTroves } = _getContracts(this.connection);
    return sortedTroves.getDecayedBoost(address).then(decimalify);
  }
  async hasClaimableCollateral(address: any, overrides?: any): Promise<any> {
    const { collSurplusPool } = _getContracts(this.connection);
    return collSurplusPool.hasClaimableCollateral(address);
  }
  async getRedemptionBonus(address: any, overrides?: any): Promise<any> {
    const { collSurplusPool } = _getContracts(this.connection);
    return collSurplusPool.getRedemptionBonus(address).then(decimalify);
  }
  async getRedemptionFeeRate(overrides?: any): Promise<any> {
    const { troveManager } = _getContracts(this.connection);
    return troveManager.getRedemptionRateWithDecay().then(decimalify);
  }
  async getReceiptPerUnderlying(address: any): Promise<any> {
    const signer = _requireSigner(this.connection);
    const vault = _getYetiVaultToken(address, signer);
    return vault.vault.receiptPerUnderlying().then(decimalify);
  }
  async getUnderlyingPerReceipt(address: any): Promise<any> {
    const signer = _requireSigner(this.connection);
    const vault = _getYetiVaultToken(address, signer);
    return vault.vault.underlyingPerReceipt().then(decimalify);
  }
  async getUnderlyingDecimal(address: any): Promise<any> {
    const signer = _requireSigner(this.connection);
    const vault = _getYetiVaultToken(address, signer);
    return vault.vault.underlyingDecimal().then(decimalify);
  }
  async getUnderlyingToken(address: any): Promise<any> {
    const signer = _requireSigner(this.connection);
    const vault = _getYetiVaultToken(address, signer);
    return vault.vault.underlying();
  }
  async getAllowanceOf(owner: any, token: any, spender: any, amount: any): Promise<any> {
    const signer = _requireSigner(this.connection);
    let enoughAllowance = false;
    if (owner != undefined && spender != undefined) {
      // console.log("danger zone")
      const erc20 = _getERC20Token(token, signer);
      const result = await erc20.token.allowance(owner, spender);
      // console.log("danger zone result", result)
      // console.log("danger zone result", amount)
      // console.log("decimalify(amount", decimalify(result))
      // console.log("CHECK", decimalify(result) >= amount)
      if (decimalify(result).gte(amount)) {
        // console.log("hit")
        enoughAllowance = true;
      }
    }
    return enoughAllowance;
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getYUSDBalance} */
  getYUSDBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    address ??= _requireAddress(this.connection);
    const { yusdToken } = _getContracts(this.connection);

    return yusdToken.balanceOf(address, { ...overrides }).then(decimalify);
  }
  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getYETIBalance} */
  // @ts-expect-error: Testing
  getYETIBalance(address: any, overrides: { blockTag: any }): any {
    address !== null && address !== void 0 ? address : (address = _requireAddress(this.connection));
    const { yetiToken } = _getContracts(this.connection);
    const balance = yetiToken.balanceOf(address, { ...overrides }).then(decimalify);
    return balance;
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getCollateralSurplusBalancee} */
  async getCollateralSurplusBalancee(overrides?: any): Promise<any> {
    const { collSurplusPool } = _getContracts(this.connection);
    const { userAddress } = this.connection;
    const surplusBalance: any = {};
    if (userAddress != undefined) {
      const [surplusColls] = await Promise.all([
        collSurplusPool.getAmountsClaimable(userAddress, overrides)
      ]);
      for (let i = 0; i < surplusColls[0].length; i++) {
        surplusBalance[surplusColls[0][i]] = decimalify(surplusColls[1][i]);
      }
    }
    return surplusBalance;
    // OLD METHOD
    // const [surplusColls] = await Promise.all([collSurplusPool.getAllCollateral(overrides)]);
    // const surplusBalance: TroveMappings = {}
    // for (let i = 0; i < surplusColls[0].length; i++) {
    //   const [collEarned] = await Promise.all([collSurplusPool.getCollateral(surplusColls[0][i])]);
    //   surplusBalance[surplusColls[0][i]] = decimalify(collEarned)
    // }
    // return surplusBalance;
  }

  /** @internal */
  getTroves(
    params: TroveListingParams & { beforeRedistribution: true },
    overrides?: EthersCallOverrides
  ): Promise<TroveWithPendingRedistribution[]>;

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.(getTroves:2)} */
  getTroves(params: TroveListingParams, overrides?: EthersCallOverrides): Promise<UserTrove[]>;

  async getTroves(
    params: TroveListingParams,
    overrides?: EthersCallOverrides
  ): Promise<UserTrove[]> {
    const { multiTroveGetter } = _getContracts(this.connection);

    expectPositiveInt(params, "first");
    expectPositiveInt(params, "startingAt");

    if (!validSortingOptions.includes(params.sortedBy)) {
      throw new Error(
        `sortedBy must be one of: ${validSortingOptions.map(x => `"${x}"`).join(", ")}`
      );
    }

    const [totalRedistributed, backendTroves] = await Promise.all([
      params.beforeRedistribution ? undefined : this.getTotalRedistributed({ ...overrides }),
      multiTroveGetter.getMultipleSortedTroves(
        params.sortedBy === "descendingCollateralRatio"
          ? params.startingAt ?? 0
          : -((params.startingAt ?? 0) + 1),
        params.first,
        { ...overrides }
      )
    ]);
    const decimals = await this.getDecimals(await this.getWhitelistedCollaterals());
    const troves = mapBackendTroves(backendTroves, decimals);

    if (totalRedistributed) {
      return troves.map(trove => trove.applyRedistribution(totalRedistributed));
    } else {
      return troves;
    }
  }

  /** @internal */
  _getBlockTimestamp(blockTag?: BlockTag): Promise<number> {
    return _getBlockTimestamp(this.connection, blockTag);
  }

  /** @internal */
  async _getFeesFactory(
    overrides?: EthersCallOverrides
  ): Promise<(blockTimestamp: number, recoveryMode: boolean) => Fees> {
    const { troveManager } = _getContracts(this.connection);

    const [lastFeeOperationTime, baseRateWithoutDecay] = await Promise.all([
      troveManager.lastFeeOperationTime({ ...overrides }),
      troveManager.baseRate({ ...overrides }).then(decimalify)
    ]);

    return (blockTimestamp, recoveryMode) =>
      new Fees(
        baseRateWithoutDecay,
        MINUTE_DECAY_FACTOR,
        BETA,
        convertToDate(lastFeeOperationTime.toNumber()),
        convertToDate(blockTimestamp),
        recoveryMode
      );
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getFees} */
  async getFees(overrides?: EthersCallOverrides): Promise<Fees> {
    const [createFees, total, blockTimestamp] = await Promise.all([
      this._getFeesFactory(overrides),
      this.getTotal(overrides),
      this._getBlockTimestamp(
        overrides === null || overrides === void 0 ? void 0 : overrides.blockTag
      )
    ]);
    const recoveryRatios = await this.getRecoveryRatios(Object.keys(total.collaterals));
    const priceMapping: any = {};
    for (const key in Object.keys(total.collaterals)) {
      const [colPrice] = await Promise.all([this.getCollPrice(key)]);
      priceMapping[key] = colPrice;
    }
    return createFees(
      blockTimestamp,
      total.collateralRatioIsBelowCritical(priceMapping, recoveryRatios)
    );
  }

  async getUnderlyingTokens(vaultTokens: string | string[], overrides?: any): Promise<any> {
    const underlyingTokens = [];
    for (let i = 0; i < vaultTokens.length; i++) {
      try {
        underlyingTokens.push(await this.getUnderlyingToken(vaultTokens[i]));
      } catch {
        console.log(vaultTokens[i], "not a vault token");
      }
    }
    return underlyingTokens;
  }
  async getVaultTokens(whitelistedCollaterals: string | any[], overrides?: any): Promise<any> {
    const { yetiController } = _getContracts(this.connection);
    const vaultTokens = [];
    for (let i = 0; i < whitelistedCollaterals.length; i++) {
      // console.log(whitelistedCollaterals[i], )
      if (await yetiController.isWrapped(whitelistedCollaterals[i], { ...overrides })) {
        // console.log(whitelistedCollaterals[i], true)
        vaultTokens.push(whitelistedCollaterals[i]);
      }
      // console.log(whitelistedCollaterals[i], false)
    }
    return vaultTokens;
  }

  async getWhitelistedCollaterals(overrides?: any | undefined): Promise<any> {
    const { yetiController } = _getContracts(this.connection);
    return yetiController.getValidCollateral({ ...overrides });
  }
  // @ts-expect-error: Testing
  async getICR(userAddress: any, overrides: BigNumberish): Promise<any> {
    userAddress !== null && userAddress !== void 0
      ? userAddress
      : (userAddress = _requireAddress(this.connection));
    const { troveManager } = _getContracts(this.connection);
    // @ts-expect-error: overrides is an object
    return troveManager.getCurrentICR(userAddress, { ...overrides }).then(decimalify);
  }
  async getVcValue(userAddress: any, overrides?: any): Promise<any> {
    userAddress !== null && userAddress !== void 0
      ? userAddress
      : (userAddress = _requireAddress(this.connection));
    const { troveManager } = _getContracts(this.connection);
    return troveManager.getTroveVC(userAddress, { ...overrides }).then(decimalify);
  }
  async getSafetyRatios(addresses: any[], overrides?: any): Promise<any> {
    const { yetiController } = _getContracts(this.connection);
    const safetyRatios: any = {};
    const promises = addresses.map((coll: any) => {
      return yetiController.getSafetyRatio(coll);
    });
    const result = await Promise.all(promises);
    for (let i = 0; i < addresses.length; i++) {
      safetyRatios[addresses[i]] = decimalify(result[i]);
    }
    return safetyRatios;
  }
  async getRecoveryRatios(addresses: any[], overrides?: any): Promise<any> {
    const { yetiController } = _getContracts(this.connection);
    const recoveryRatios: any = {};
    const promises = addresses.map((coll: any) => {
      return yetiController.getRecoveryRatio(coll);
    });
    const result = await Promise.all(promises);
    for (let i = 0; i < addresses.length; i++) {
      recoveryRatios[addresses[i]] = decimalify(result[i]);
    }
    return recoveryRatios;
  }

  async getDecimals(addresses: any, overrides?: any): Promise<any> {
    const { yetiController } = _getContracts(this.connection);
    const decimals: any = {};
    const promises = addresses.map((coll: any) => {
      return yetiController.getDecimals(coll);
    });
    const result: BigNumber[] = await Promise.all(promises);
    for (let i = 0; i < addresses.length; i++) {
      decimals[addresses[i]] = decimalify(result[i]);
    }
    return decimals;
  }
}

type Resolved<T> = T extends Promise<infer U> ? U : T;
type BackendTroves = Resolved<ReturnType<MultiTroveGetter["getMultipleSortedTroves"]>>;

const mapBackendTroves = (troves: any, decimals: any): TroveWithPendingRedistribution[] =>
  troves.map(
    trove =>
      new TroveWithPendingRedistribution(
        trove.owner,
        "open", // These Troves are coming from the SortedTroves list, so they must be open
        convertToMap(trove.colls, trove.amounts),
        decimals,
        { debt: decimalify(trove.debt) },
        convertToMap(trove.allColls, trove.stakeAmounts),
        //check whether we should return total snapshot YUSD debt instead of per collateral
        new Trove(
          convertToMap(trove.allColls, trove.snapshotAmounts),
          decimals,
          convertToMap(trove.allColls, trove.snapshotYUSDDebts)
        )
      )
  );

/**
 * Variant of {@link ReadableEthersLiquity} that exposes a {@link @liquity/lib-base#LiquityStore}.
 *
 * @public
 */
export interface ReadableEthersLiquityWithStore<T extends LiquityStore = LiquityStore>
  extends ReadableEthersLiquity {
  /** An object that implements LiquityStore. */
  readonly store: T;
}

class _BlockPolledReadableEthersLiquity
  implements ReadableEthersLiquityWithStore<BlockPolledLiquityStore> {
  readonly connection: EthersLiquityConnection;
  readonly store: BlockPolledLiquityStore;

  private readonly _readable: ReadableEthersLiquity;

  constructor(readable: ReadableEthersLiquity) {
    const store = new BlockPolledLiquityStore(readable);

    this.store = store;
    this.connection = readable.connection;
    this._readable = readable;
  }

  private _blockHit(overrides?: EthersCallOverrides): boolean {
    return (
      !overrides ||
      overrides.blockTag === undefined ||
      overrides.blockTag === this.store.state.blockTag
    );
  }

  private _userHit(address?: string, overrides?: EthersCallOverrides): boolean {
    return (
      this._blockHit(overrides) &&
      (address === undefined || address === this.store.connection.userAddress)
    );
  }

  hasStore(store?: EthersLiquityStoreOption): boolean {
    return store === undefined || store === "blockPolled";
  }

  async getTotalRedistributed(overrides?: EthersCallOverrides): Promise<Trove> {
    return this._blockHit(overrides)
      ? this.store.state.totalRedistributed
      : this._readable.getTotalRedistributed(overrides);
  }

  async getTroveBeforeRedistribution(
    address?: string,
    overrides?: EthersCallOverrides
  ): Promise<TroveWithPendingRedistribution> {
    return this._userHit(address, overrides)
      ? this.store.state.troveBeforeRedistribution
      : this._readable.getTroveBeforeRedistribution(address, overrides);
  }

  async getTrove(address?: string, overrides?: EthersCallOverrides): Promise<UserTrove> {
    return this._userHit(address, overrides)
      ? this.store.state.trove
      : this._readable.getTrove(address, overrides);
  }

  async getNumberOfTroves(overrides?: EthersCallOverrides): Promise<number> {
    return this._blockHit(overrides)
      ? this.store.state.numberOfTroves
      : this._readable.getNumberOfTroves(overrides);
  }

  async getCollPrice(address: any, overrides: any): Promise<any> {
    return this._blockHit(overrides)
      ? this.store.state.underlyingPrices[address]
      : this._readable.getCollPrice(address, overrides);
  }
  async getUnderlyingDecimals(vaultTokens: any, overrides: any): Promise<any> {
    return this._blockHit(overrides)
      ? this.store.state.underlyingDecimals
      : this._readable.getUnderlyingDecimals(vaultTokens);
  }
  async getUnderlyingTokens(vaultTokens: any, overrides: any): Promise<any> {
    return this._blockHit(overrides)
      ? this.store.state.underlyingTokens
      : this._readable.getUnderlyingTokens(vaultTokens);
  }
  async getCollPrices(
    addresses: any,
    vaultTokens: any,
    underlyingDecimals: any,
    overrides: any
  ): Promise<any> {
    // const prices:TroveMappings = {};
    // for (let i = 0; i < addresses.length; i++) {
    //   // double check this
    //   prices[addresses[i]] = await this._readable.getCollPrice(addresses[i]);
    // }
    return this._blockHit(overrides)
      ? this.store.state.underlyingPrices
      : this._readable.getCollPrices(addresses, vaultTokens, underlyingDecimals, overrides);
  }
  async getPrices(addresses: any, overrides: any): Promise<any> {
    // const prices:TroveMappings = {};
    // for (let i = 0; i < addresses.length; i++) {
    //   // double check this
    //   prices[addresses[i]] = await this._readable.getCollPrice(addresses[i]);
    // }
    return this._blockHit(overrides) ? this.store.state.prices : this._readable.getPrices(addresses);
  }

  async getTotal(overrides?: EthersCallOverrides): Promise<Trove> {
    return this._blockHit(overrides) ? this.store.state.total : this._readable.getTotal(overrides);
  }

  async getReceiptPerUnderlyingRatios(
    addresses: any,
    vaultTokens: any,
    overrides: any
  ): Promise<any> {
    return this._blockHit(overrides)
      ? this.store.state.receiptPerUnderlyingRatios
      : this._readable.getReceiptPerUnderlyingRatios(addresses, vaultTokens);
  }
  async getUnderlyingPerReceiptRatios(
    addresses: any,
    vaultTokens: any,
    overrides: any
  ): Promise<any> {
    return this._blockHit(overrides)
      ? this.store.state.underlyingPerReceiptRatios
      : this._readable.getUnderlyingPerReceiptRatios(addresses, vaultTokens);
  }
  async getBalances(addresses: any, overrides: any): Promise<any> {
    return this._blockHit(overrides)
      ? this.store.state.tokenBalances
      : this._readable.getBalances(addresses);
  }
  async getLPBalances(addresses: any, overrides: any): Promise<any> {
    return this._blockHit(overrides)
      ? this.store.state.lpTokenBalance
      : this._readable.getLPBalances(addresses);
  }
  async getStabilityDeposit(address: any, overrides: any): Promise<any> {
    return this._userHit(address, overrides)
      ? this.store.state.stabilityDeposit
      : this._readable.getStabilityDeposit(address, overrides);
  }
  async getFarm(address: any, overrides: any): Promise<any> {
    return this._userHit(address, overrides)
      ? this.store.state.farm
      : this._readable.getFarm(address, overrides);
  }
  async getBoostedFarm(address: any, overrides: any): Promise<any> {
    return this._userHit(address, overrides)
      ? this.store.state.boostedFarm
      : this._readable.getBoostedFarm(address, overrides);
  }
  async getVEYETIStake(address: any, overrides: any): Promise<any> {
    return this._userHit(address, overrides)
      ? this.store.state.veYETIStaked
      : this._readable.getVEYETIStake(address, overrides);
  }
  async getPoolRewardRate(overrides: any): Promise<any> {
    return this._blockHit(overrides)
      ? this.store.state.poolRewardRate
      : this._readable.getPoolRewardRate(overrides);
  }
  async getRemainingStabilityPoolYETIReward(overrides: any): Promise<any> {
    return this._blockHit(overrides)
      ? this.store.state.remainingStabilityPoolYETIReward
      : this._readable.getRemainingStabilityPoolYETIReward(overrides);
  }

  async getYUSDInStabilityPool(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._blockHit(overrides)
      ? this.store.state.yusdInStabilityPool
      : this._readable.getYUSDInStabilityPool(overrides);
  }

  getDepositFee(VCInput: any, VCOutput: any, overrides: any): any {
    return this._readable.getDepositFee(VCInput, VCOutput, overrides);
  }
  getEstimatedFarmRewards(amount: any, time: any, overrides: any): any {
    return this._readable.getEstimatedFarmRewards(amount, time, overrides);
  }
  async getEstimatedVeYetiRewards(amount: any, time: any, overrides: any): Promise<any> {
    return this._readable.getEstimatedVeYetiRewards(amount, time, overrides);
  }
  getEstimatedYETIPoolRewards(amount: any, time: any, overrides: any): any {
    return this._readable.getEstimatedYETIPoolRewards(amount, time, overrides);
  }

  async getBalanceERC20(address: any, overrides?: any): Promise<any> {
    const { userAddress } = this.connection;
    return this._userHit(userAddress, overrides)
      ? this.store.state.tokenBalances[address !== null && address !== void 0 ? address : "0"]
      : this._readable.getBalanceERC20(address);
  }
  async getLP(address: any, overrides?: any): Promise<any> {
    const { userAddress } = this.connection;
    return this._userHit(userAddress, overrides)
      ? this.store.state.tokenBalances[address !== null && address !== void 0 ? address : "0"]
      : this._readable.getLP(address);
  }

  async hasClaimableCollateral(address: any, overrides: any): Promise<any> {
    return this._readable.hasClaimableCollateral(address);
  }
  async getRedemptionBonus(address: any, overrides: any): Promise<any> {
    return this._readable.getRedemptionBonus(address);
  }
  async getRedemptionFeeRate(overrides) {
    return this._readable.getRedemptionFeeRate();
  }
  async getReceiptPerUnderlying(address: any): Promise<any> {
    return this._readable.getReceiptPerUnderlying(address);
  }
  async getUnderlyingPerReceipt(address: any): Promise<any> {
    return this._readable.getUnderlyingPerReceipt(address);
  }
  async getUnderlyingDecimal(address: any): Promise<any> {
    return this._readable.getUnderlyingDecimal(address);
  }
  async getUnderlyingToken(address: any): Promise<any> {
    return this._readable.getUnderlyingToken(address);
  }
  async getSortedTroveHead(): Promise<any> {
    return this._readable.getSortedTroveHead();
  }
  async getSortedTroveTail(): Promise<any> {
    return this._readable.getSortedTroveTail();
  }
  async getSortedTroveSize(): Promise<any> {
    return this._readable.getSortedTroveSize();
  }
  async getSortedTroveNext(id: any): Promise<any> {
    return this._readable.getSortedTroveNext(id);
  }
  async getSortedTrovePrev(id: any): Promise<any> {
    return this._readable.getSortedTrovePrev(id);
  }
  async getCurrentAICR(borrower: any): Promise<any> {
    return this._readable.getCurrentAICR(borrower);
  }
  async getTroveDebt(borrower) {
    return this._readable.getTroveDebt(borrower);
  }
  async getAllowanceOf(owner: any, token: any, spender: any, amount: any): Promise<any> {
    return this._readable.getAllowanceOf(owner, token, spender, amount);
  }
  async getYusdAllowance(from: any, to: any, amount: any): Promise<any> {
    return this._readable.getYusdAllowance(from, to, amount);
  }
  async getYETIPrice(): Promise<any> {
    return this._readable.getYETIPrice();
  }
  async getYUSDPrice(): Promise<any> {
    return this._readable.getYUSDPrice();
  }
  async getGlobalBoostFactor(): Promise<any> {
    return this._readable.getGlobalBoostFactor();
  }
  async getDecayedBoost(address: any): Promise<any> {
    return this._readable.getDecayedBoost(address);
  }

  async getYUSDBalance(address: any, overrides: any): Promise<any> {
    return this._userHit(address, overrides)
      ? this.store.state.yusdBalance
      : this._readable.getYUSDBalance(address, overrides);
  }

  async getYETIBalance(address: any, overrides: any): Promise<any> {
    return this._userHit(address, overrides)
      ? this.store.state.yetiBalance
      : this._readable.getYETIBalance(address, overrides);
  }
  async getCollateralSurplusBalancee(overrides: any): Promise<any> {
    return this._blockHit(overrides)
      ? this.store.state.collateralSurplusBalance
      : this._readable.getCollateralSurplusBalancee(overrides);
  }

  async getVaultTokens(whitelistedCollaterals: any, overrides: any): Promise<any> {
    return this._blockHit(overrides)
      ? this.store.state.vaultTokens
      : this._readable.getVaultTokens(whitelistedCollaterals, overrides);
  }
  async getWhitelistedCollaterals(overrides: any): Promise<any> {
    return this._blockHit(overrides)
      ? this.store.state.whitelistedCollaterals
      : this._readable.getWhitelistedCollaterals(overrides);
  }
  async getICR(address: any, overrides: any): Promise<any> {
    return this._userHit(address, overrides)
      ? this.store.state.icr
      : this._readable.getICR(address, overrides);
  }
  async getVcValue(address: any, overrides: any): Promise<any> {
    return this._userHit(address, overrides)
      ? this.store.state.vcValue
      : this._readable.getVcValue(address, overrides);
  }
  async getSafetyRatios(addresses: any, overrides: any): Promise<any> {
    return this._blockHit(overrides)
      ? this.store.state.safetyRatios
      : this._readable.getSafetyRatios(addresses, overrides);
  }
  async getRecoveryRatios(addresses: any, overrides: any): Promise<any> {
    return this._blockHit(overrides)
      ? this.store.state.recoveryRatios
      : this._readable.getRecoveryRatios(addresses, overrides);
  }
  async getDecimals(addresses: any, overrides: any): Promise<any> {
    return this._blockHit(overrides)
      ? this.store.state.decimals
      : this._readable.getDecimals(addresses, overrides);
  }

  async _getBlockTimestamp(blockTag?: BlockTag): Promise<number> {
    return this._blockHit({ blockTag })
      ? this.store.state.blockTimestamp
      : this._readable._getBlockTimestamp(blockTag);
  }

  async _getFeesFactory(
    overrides?: EthersCallOverrides
  ): Promise<(blockTimestamp: number, recoveryMode: boolean) => Fees> {
    return this._blockHit(overrides)
      ? this.store.state._feesFactory
      : this._readable._getFeesFactory(overrides);
  }

  async getFees(overrides?: EthersCallOverrides): Promise<Fees> {
    return this._blockHit(overrides) ? this.store.state.fees : this._readable.getFees(overrides);
  }

  getTroves(
    params: TroveListingParams & { beforeRedistribution: true },
    overrides?: EthersCallOverrides
  ): Promise<TroveWithPendingRedistribution[]>;

  getTroves(params: TroveListingParams, overrides?: EthersCallOverrides): Promise<UserTrove[]>;

  getTroves(params: TroveListingParams, overrides?: EthersCallOverrides): Promise<UserTrove[]> {
    return this._readable.getTroves(params, overrides);
  }

  _getActivePool(): Promise<Trove> {
    throw new Error("Method not implemented.");
  }

  _getDefaultPool(): Promise<Trove> {
    throw new Error("Method not implemented.");
  }
}
