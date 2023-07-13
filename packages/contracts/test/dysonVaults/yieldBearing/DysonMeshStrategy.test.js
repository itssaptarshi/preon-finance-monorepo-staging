// tested on block number: 38866794

// for asset = {'WMATIC', 'USDC', 'IDAI'}
// set `asset` for testing

const deployMeshVault = require('../../../scripts/deployDysonVaults/deployDysonMeshVault')
const { expect } = require('chai')
const { parseUnits } = require("ethers/lib/utils")
const { takeSnapshot, time } = require("@nomicfoundation/hardhat-network-helpers");
const { promisify } = require("util");

const MAX_UINT = "115792089237316195423570985008687907853269984665640564039457584007913129639935"

const IUSDCConfig = {
    vaultContractName: "DysonVault",
    strategyContractName: "DysonMeshStrategy",
    underlyingHolderAddress: "0x29598210ebd25c76b99217fbbad4807f08c04c82", // block number: 38632849
    poolAddress: "0x590cd248e16466f747e74d4cfa6c48f597059704",
    // bigDeposit: parseUnits("1", 28),
    deposit: parseUnits("10000", 6),
    lowDeposit: parseUnits("0.00001", 6),
    whaleAddress: "0xba12222222228d8ba445958a75a0704d566bf2c8",
    whaleAmmount: parseUnits("100000", 6)
}

const IWMATICConfig = {
    vaultContractName: "DysonVault",
    strategyContractName: "DysonMeshStrategy",
    underlyingHolderAddress: "0x35dec3e9887b1d5ac243a39db9c0c65e70756997", // block number: 38588623
    poolAddress: "0xb880e6ade8709969b9fd2501820e052581ac29cf",
    // bigDeposit: parseUnits("1", 28),
    deposit: parseUnits("100", "ether"),
    lowDeposit: parseUnits("0.00001", "ether"),
    whaleAddress: "0xba12222222228d8ba445958a75a0704d566bf2c8", // TODO:
    whaleAmmount: parseUnits("1000", "ether")
}

const IDAIConfig = {
    vaultContractName: "DysonVault",
    strategyContractName: "DysonMeshStrategy",
    poolAddress: "0xbe068b517e869f59778b3a8303df2b8c13e05d06",
    // bigDeposit: parseUnits("1", 28),
    deposit: parseUnits("100", "ether"),
    lowDeposit: parseUnits("0.00001", "ether"),
    whaleAddress: "0xba12222222228d8ba445958a75a0704d566bf2c8", // TODO:
    whaleAmmount: parseUnits("1000", "ether")
}

const configs = { 'IUSDC': IUSDCConfig, 'IWMATIC': IWMATICConfig, 'IDAI': IDAIConfig }

const asset = 'IUSDC';
const config = configs[asset]

describe("Test", () => {
    let vault, strategy, pool
    let acc1, acc2, underlyingHolderSigner, poolTokenWhaleHolderSigner
    let native, reward, poolToken
    let snapshot, snapshotBefore
    let sleep

    before(async () => {
        snapshotBefore = await takeSnapshot()

        var deployAddresses = await deployMeshVault(asset);
        [acc1, acc2] = await ethers.getSigners();
        vault = await ethers.getContractAt(config.vaultContractName, deployAddresses['Vault'])
        strategy = await ethers.getContractAt(config.strategyContractName, await vault.strategy())
        native = await ethers.getContractAt('contracts/Interfaces/IERC20.sol:IERC20', await strategy.WNATIVE())
        underlying = await ethers.getContractAt('contracts/Interfaces/IERC20.sol:IERC20', await strategy.underlying())
        reward = await ethers.getContractAt('contracts/Interfaces/IERC20.sol:IERC20', await strategy.rewardToken())
        poolToken = await ethers.getContractAt('contracts/Interfaces/IERC20.sol:IERC20', await strategy.poolToken())

        // *** get underlying balance of deposit of poolToken ***
        // first transfer poolToken from whale to acc
        await network.provider.send("hardhat_impersonateAccount", [config.whaleAddress])
        poolTokenWhaleHolderSigner = await ethers.getSigner(config.whaleAddress)
        console.log('Whale poolToken balance', Number(await poolToken.balanceOf(poolTokenWhaleHolderSigner.address)))
        // TODO:
        console.log('transfer amount', Number(config.whaleAmmount))
        await poolToken.connect(poolTokenWhaleHolderSigner).transfer(acc1.address, config.whaleAmmount)
        await poolToken.connect(poolTokenWhaleHolderSigner).transfer(acc2.address, config.whaleAmmount)
        console.log('Acc1 poolToken balance', Number(await poolToken.balanceOf(acc1.address)))
        console.log('Acc2 poolToken balance', Number(await poolToken.balanceOf(acc2.address)))

        // now deposit poolToken to the pool
        const abi = ['function depositToken(uint256 depositAmount) external']
        pool = await ethers.getContractAt(abi, config.poolAddress);
        await poolToken.connect(acc1).approve(config.poolAddress, MAX_UINT)
        await poolToken.connect(acc2).approve(config.poolAddress, MAX_UINT)
        // TODO:
        console.log('acc1 deposit to pool...')
        await pool.connect(acc1).depositToken(config.whaleAmmount)
        console.log('acc2 deposit to pool...')
        await pool.connect(acc2).depositToken(config.whaleAmmount)

        await underlying.connect(acc1).approve(vault.address, MAX_UINT)
        await underlying.connect(acc2).approve(vault.address, MAX_UINT)



        // // get underlying balance from holder to acc1
        // await network.provider.send("hardhat_impersonateAccount", [config.underlyingHolderAddress])
        // underlyingHolderSigner = await ethers.getSigner(config.underlyingHolderAddress)

        // const underlyingBalanceHolder = await underlying.balanceOf(config.underlyingHolderAddress)
        // console.log('Holder underlying balance', underlyingBalanceHolder.toString())
        // console.log('transfer underlying balance to acc1 and acc2')
        // await underlying.connect(underlyingHolderSigner).transfer(acc1.address, config.deposit.mul(4))
        // await underlying.connect(underlyingHolderSigner).transfer(acc2.address, config.deposit.mul(4))
        // const underlyingBalanceAcc1 = await underlying.balanceOf(acc1.address)
        // const underlyingBalanceAcc2 = await underlying.balanceOf(acc2.address)
        // console.log('Acc1 underlying balance', underlyingBalanceAcc1.toString())
        // console.log('Acc2 underlying balance', underlyingBalanceAcc2.toString())

        sleep = promisify(setTimeout)
    })

    after(async function () {
        await snapshotBefore.restore()
    })

    beforeEach(async function () {
        snapshot = await takeSnapshot()
    })

    afterEach(async function () {
        await snapshot.restore()
    })

    const deposit = async () => {
        const nativeBalanceTreasuryBefore = Number(await native.balanceOf(await strategy.preonTreasury()))
        await sleep(5000)
        await vault.connect(acc1)['deposit(uint256)'](config.deposit)
        console.log('acc1 deposited')
        await sleep(5000)
        await time.increase(5 * 60 * 60)
        await vault.connect(acc2)['deposit(uint256)'](config.deposit.mul(2))
        console.log('acc2 deposited')
        await time.increase(24 * 60 * 60)
        await sleep(5000)
        await vault.connect(acc1)['deposit(uint256)'](config.deposit)
        console.log('acc1 deposited')
        await sleep(5000)
        await time.increase(24 * 60 * 60)
        const nativeBalanceTreasuryAfter = Number(await native.balanceOf(await strategy.preonTreasury()))
    }

    it("deposit", async () => {
        const underlyingAcc1Before = Number(await underlying.balanceOf(acc1.address))
        const underlyingAcc2Before = Number(await underlying.balanceOf(acc2.address))
        const totalHoldingsBefore = Number(await vault.totalHoldings())
        const receiptsAcc1Before = Number(await vault.balanceOf(acc1.address))
        const receiptsAcc2Before = Number(await vault.balanceOf(acc2.address))

        await deposit()

        const underlyingAcc1After = Number(await underlying.balanceOf(acc1.address))
        const underlyingAcc2After = Number(await underlying.balanceOf(acc2.address))
        const totalHoldingsAfter = Number(await vault.totalHoldings())
        const receiptsAcc1After = Number(await vault.balanceOf(acc1.address))
        const receiptsAcc2After = Number(await vault.balanceOf(acc2.address))

        expect(underlyingAcc1After).to.be.below(underlyingAcc1Before)
        expect(underlyingAcc2After).to.be.below(underlyingAcc2Before)
        expect(totalHoldingsAfter).to.be.above(totalHoldingsBefore)
        expect(receiptsAcc1After).to.be.above(receiptsAcc1Before)
        expect(receiptsAcc2After).to.be.above(receiptsAcc2Before)
    })

    it("lastValueOfAllUnderlying", async () => {
        await strategy.setCompoundBeforeDepositAndWithdraw(false);

        const lastValueOfAllUnderlyingBefore = Number(await strategy.lastValueOfAllUnderlying())

        await underlying.connect(acc1).approve(vault.address, MAX_UINT)
        await underlying.connect(acc2).approve(vault.address, MAX_UINT)
        await vault.connect(acc1)['deposit(uint256)'](config.deposit)
        await vault.connect(acc2)['deposit(uint256)'](config.deposit.mul(2))

        const lastValueOfAllUnderlyingAfter = Number(await strategy.lastValueOfAllUnderlying())

        expect(lastValueOfAllUnderlyingAfter).to.be.above(lastValueOfAllUnderlyingBefore)
    })

    // no need to simulate borrowing as exchange rate seems to increase even without that (rewards dur to interest rate)
    it("compound", async () => {
        await deposit()

        const totalHoldingsBefore = Number(await vault.totalHoldings())
        const nativeBalanceTreasuryBefore = Number(await native.balanceOf(await strategy.preonTreasury()))

        await strategy.compound()
        await sleep(3000)

        const totalHoldingsAfter = Number(await vault.totalHoldings())
        const nativeBalanceTreasuryAfter = Number(await native.balanceOf(await strategy.preonTreasury()))

        expect(totalHoldingsAfter).to.be.above(totalHoldingsBefore)
        expect(nativeBalanceTreasuryAfter).to.be.above(nativeBalanceTreasuryBefore)
    })

    it("redeem", async () => {
        await deposit()

        const totalHoldingsBefore = Number(await vault.totalHoldings())
        const underlyingAcc1Before = Number(await underlying.balanceOf(acc1.address))
        const underlyingAcc2Before = Number(await underlying.balanceOf(acc2.address))
        const receiptsAcc1Before = Number(await vault.balanceOf(acc1.address))
        const receiptsAcc2Before = Number(await vault.balanceOf(acc2.address))

        const acc1RedeemShares = Math.floor(receiptsAcc1Before / 10).toString()
        const acc2RedeemShares = Math.floor(receiptsAcc2Before / 10).toString()

        await vault.connect(acc1)['redeem(uint256)'](acc1RedeemShares)
        console.log('acc1 withdrew')
        await vault.connect(acc2)['redeem(uint256)'](acc2RedeemShares)
        console.log('acc2 withdrew')

        const underlyingAcc1After = Number(await underlying.balanceOf(acc1.address))
        const underlyingAcc2After = Number(await underlying.balanceOf(acc2.address))
        const receiptsAcc1After = Number(await vault.balanceOf(acc1.address))
        const receiptsAcc2After = Number(await vault.balanceOf(acc2.address))

        expect(underlyingAcc1After).to.be.above(underlyingAcc1Before)
        expect(underlyingAcc2After).to.be.above(underlyingAcc2Before)
        expect(receiptsAcc1After).to.be.below(receiptsAcc1Before)
        expect(receiptsAcc2After).to.be.below(receiptsAcc2Before)

        await vault.connect(acc1)['redeem(uint256)'](await vault.balanceOf(acc1.address))
        console.log('acc1 withdrew all')
        await vault.connect(acc2)['redeem(uint256)'](await vault.balanceOf(acc2.address))
        console.log('acc2 withdrew all')
    })
})

// test compound
// does it work? if (currentValueOfAllUnderlying > lastValueOfAllUnderlying)