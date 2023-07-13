// tested on block number: 38815787

const deployDysonSTMaticVault = require('../../../scripts/deployDysonVaults/deployDysonSTMaticVault')
const { expect } = require('chai')
const { parseUnits } = require("ethers/lib/utils")
const { takeSnapshot, time } = require("@nomicfoundation/hardhat-network-helpers");
const { promisify } = require("util");
const { BigNumber } = require("ethers")

const MAX_UINT = "115792089237316195423570985008687907853269984665640564039457584007913129639935"


const IstMaticConfig = {
    vaultContractName: "DysonVault",
    strategyContractName: "DysonSTMaticStrategy",
    // bigDeposit: parseUnits("1", 28),
    deposit: parseUnits("100", "ether"),
    lowDeposit: parseUnits("0.00001", "ether"),
    whaleAddress: "0xba12222222228d8ba445958a75a0704d566bf2c8",
}

const config = IstMaticConfig

describe("Test", () => {
    let vault, strategy
    let acc1, acc2
    let native
    let snapshot, snapshotBefore
    let sleep

    before(async () => {
        snapshotBefore = await takeSnapshot()

        var deployAddresses = await deployDysonSTMaticVault();
        // TODO:
        [acc1, acc2] = await ethers.getSigners();
        // [acc1, acc2] = await getFixedGasSigners((2**62).toString());
        vault = await ethers.getContractAt(config.vaultContractName, deployAddresses['Vault'])
        strategy = await ethers.getContractAt(config.strategyContractName, await vault.strategy())
        native = await ethers.getContractAt('contracts/Interfaces/IERC20.sol:IERC20', await strategy.WNATIVE())
        underlying = await ethers.getContractAt('contracts/Interfaces/IERC20.sol:IERC20', await strategy.underlying())

        // get underlying balance from whale to acc1 and acc2
        await network.provider.send("hardhat_impersonateAccount", [config.whaleAddress])
        underlyingWhaleSigner = await ethers.getSigner(config.whaleAddress)

        const whaleUnderlyingBalance = await underlying.balanceOf(config.whaleAddress)
        console.log('Whale underlying balance', whaleUnderlyingBalance.toString())
        console.log('transfer underlying balance to acc1 and acc2')
        await underlying.connect(underlyingWhaleSigner).transfer(acc1.address, config.deposit.mul(4))
        await underlying.connect(underlyingWhaleSigner).transfer(acc2.address, config.deposit.mul(4))
        const underlyingBalanceAcc1 = await underlying.balanceOf(acc1.address)
        const underlyingBalanceAcc2 = await underlying.balanceOf(acc2.address)
        console.log('Acc1 underlying balance', underlyingBalanceAcc1.toString())
        console.log('Acc2 underlying balance', underlyingBalanceAcc2.toString())

        await underlying.connect(acc1).approve(vault.address, MAX_UINT)
        await underlying.connect(acc2).approve(vault.address, MAX_UINT)

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

    const getFixedGasSigners = async function (gasLimit) {
        const signers = await ethers.getSigners();
        signers.forEach(signer => {
            let orig = signer.sendTransaction;
            signer.sendTransaction = function (transaction) {
                transaction.gasLimit = BigNumber.from(gasLimit.toString());
                return orig.apply(signer, [transaction]);
            }
        });
        return signers;
    };

    const deposit = async () => {
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

        await vault.connect(acc1)['deposit(uint256)'](config.deposit)
        await vault.connect(acc2)['deposit(uint256)'](config.deposit.mul(2))

        const lastValueOfAllUnderlyingAfter = Number(await strategy.lastValueOfAllUnderlying())

        expect(lastValueOfAllUnderlyingAfter).to.be.above(lastValueOfAllUnderlyingBefore)
    })

    // no need to simulate borrowing as exchange rate seems to increase even without that (rewards dur to interest rate)
    it("compound", async () => {
        await deposit()

        // decrement lastValueOfAllUnderlying for testing purpose
        // getValueOfAllUnderlying() should get incremented organically on mainnet
        const currentLastValueOfAllUnderlying = await strategy.lastValueOfAllUnderlying()
        strategy.setLastValueOfAllUnderlying(currentLastValueOfAllUnderlying.sub(currentLastValueOfAllUnderlying.div(100)))

        const totalHoldingsBefore = Number(await vault.totalHoldings())
        const underlyingBalanceTreasuryBefore = Number(await underlying.balanceOf(await strategy.preonTreasury()))
        const lastValueOfAllUnderlyingBefore = Number(await strategy.lastValueOfAllUnderlying())

        // const estimatedGas = await strategy.estimateGas.compound()
        // console.log('estimatedGas', estimatedGas)
        await strategy.compound()

        const totalHoldingsAfter = Number(await vault.totalHoldings())
        const underlyingBalanceTreasuryAfter = Number(await underlying.balanceOf(await strategy.preonTreasury()))
        const lastValueOfAllUnderlyingAfter = Number(await strategy.lastValueOfAllUnderlying())

        expect(totalHoldingsAfter).to.be.below(totalHoldingsBefore)
        expect(underlyingBalanceTreasuryAfter).to.be.above(underlyingBalanceTreasuryBefore)
        expect(lastValueOfAllUnderlyingAfter).to.be.above(lastValueOfAllUnderlyingBefore)
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