// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.2;

import "../../Dependencies/Initializable.sol";
import "../../Dependencies/OwnableUpgradeable_8.sol";
import "../../Dependencies/ReentrancyGuardUpgradeable.sol";
import "../dependencies/ERC20.sol";
import {SafeTransferLib} from "../dependencies/SafeTransferLib.sol";
import {ERC20Upgradeable} from "../dependencies/ERC20Upgradeable.sol";

import "./interfaces/meshswap/ISinglePool.sol";
import "./interfaces/meshswap/IMeshRouter.sol";
import {IWAVAX} from "../interfaces/IWAVAX.sol";
import "../../Interfaces/IVePreonEmissions.sol";
import "../../Interfaces/IJoeRouter.sol";

import "hardhat/console.sol";

contract DysonMeshStrategy is
    ERC20Upgradeable,
    Initializable,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable
{
    using SafeTransferLib for ERC20;

    uint256 public underlyingDecimal; //decimal of underlying token
    ERC20 public underlying; // the underlying token

    uint256 public lastReinvestTime; // Timestamp of last reinvestment
    uint256 public fee;
    uint256 public lastValueOfAllUnderlying;
    bool public compoundBeforeDepositAndWithdraw;

    ISinglePool public pool;
    IWAVAX public WNATIVE;
    ERC20 public rewardToken;
    address public vault;
    address public poolToken;
    IMeshRouter public router;

    address[] public rewardToNativePath;
    address[] public poolTokenToNativePath;
    address[] public nativeToPoolTokenPath;

    address public feeRewardToken;
    address public vePreonEmissions;

    address public feeRecipient;
    address public feeRecipient2;
    uint256 public recipientFeeSplit;
    address public uniswapRouter;

    event FeePaid(address payee, uint256 amount);
    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;

    function initialize(
        address _pool,
        address _WNATIVE,
        address _rewardToken,
        address _router,
        uint256 _fee,
        address _vault,
        address[] memory _rewardToNativePath,
        address[] memory _poolTokenToNativePath,
        address _feeRewardToken,
        address _uniswapRouter
    ) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();

        compoundBeforeDepositAndWithdraw = true;
        pool = ISinglePool(_pool);
        WNATIVE = IWAVAX(_WNATIVE);
        rewardToken = ERC20(_rewardToken);
        router = IMeshRouter(_router);
        setFee(_fee);
        vault = _vault;
        poolToken = _poolTokenToNativePath[0];
        rewardToNativePath = _rewardToNativePath;
        poolTokenToNativePath = _poolTokenToNativePath;
        nativeToPoolTokenPath = getArrayReversed(poolTokenToNativePath);

        underlying = ERC20(_pool);
        underlyingDecimal = underlying.decimals();
        feeRewardToken = _feeRewardToken;

        uniswapRouter = _uniswapRouter;
        WNATIVE.approve(uniswapRouter, type(uint256).max);
        _giveAllowances();
    }

    // Sets fee
    function setFee(uint256 _fee) public onlyOwner {
        require(_fee < 10000);
        fee = _fee;
    }

    function setVePreonEmissionsAddr(
        address _vePreonEmissions
    ) public onlyOwner {
        require(
            _vePreonEmissions != address(0),
            "invalid vePreonEmissions address"
        );
        vePreonEmissions = _vePreonEmissions;
    }

    function setCompundingFeeEssentials(
        address _recipient1,
        address _recipient2,
        uint256 _recipientFeeSplit
    ) public onlyOwner {
        require(_recipient1 != address(0), "invalid recipient1 address");
        require(_recipient2 != address(0), "invalid recipient2 address");
        require(_recipientFeeSplit <= 10_000, "invalid split"); // 10_000 = 100%; 5_000 => 50%

        feeRecipient = _recipient1;
        feeRecipient2 = _recipient2;
        recipientFeeSplit = _recipientFeeSplit;
    }

    function rewardToNativePathUpdate(
        address[] memory _path
    ) external onlyOwner {
        rewardToNativePath = _path;
    }

    function poolTokenToNativePathUpdate(
        address[] memory _path
    ) external onlyOwner {
        poolTokenToNativePath = _path;
    }

    function setCompoundBeforeDepositAndWithdraw(
        bool _value
    ) external onlyOwner {
        compoundBeforeDepositAndWithdraw = _value;
    }

    function withdraw(uint256 _amt) external returns (uint256) {
        require(msg.sender == vault, "sender != vault");
        uint256 valueOfAllUnderlyingBefore = getValueOfAllUnderlying();
        uint256 underlyingBalance = underlying.balanceOf(address(this));
        if (underlyingBalance < _amt) _amt = underlyingBalance;
        SafeTransferLib.safeTransfer(underlying, msg.sender, _amt);
        _updateLastValueOfAllUnderlying(valueOfAllUnderlyingBefore);
    }

    // Once underlying has been deposited tokens may need to be invested in a staking thing
    function deposit(uint256 _amt) external {
        require(msg.sender == vault, "sender != vault");
        uint256 valueOfAllUnderlyingBefore = getValueOfAllUnderlying();
        SafeTransferLib.safeTransferFrom(
            underlying,
            msg.sender,
            address(this),
            _amt
        );
        _deposit(_amt);
        _updateLastValueOfAllUnderlying(valueOfAllUnderlyingBefore);
    }

    function _deposit(uint256 _amt) internal {
        return;
    }

    function _depositToPool() internal {
        uint256 valueOfAllUnderlyingBefore = getValueOfAllUnderlying();
        uint256 poolTokenBalance = ERC20(poolToken).balanceOf(address(this));
        if (poolTokenBalance > 0) {
            pool.depositToken(poolTokenBalance);
            _updateLastValueOfAllUnderlying(valueOfAllUnderlyingBefore);
        }
    }

    function _updateLastValueOfAllUnderlying(uint256 valueBefore) internal {
        lastValueOfAllUnderlying =
            lastValueOfAllUnderlying +
            getValueOfAllUnderlying() -
            valueBefore;
    }

    function compound() external nonReentrant {
        _compound();
    }

    function beforeDepositAndWithdraw() external {
        if (compoundBeforeDepositAndWithdraw == true) _compound();
    }

    function _compound() internal {
        if (block.timestamp < lastReinvestTime + 3 hours) return;

        uint256 nativeBalanceBefore;
        uint256 nativeBalanceAfter;
        uint256 feeInNative;

        nativeBalanceBefore = nativeBalanceOfThis();
        // get pool rewards
        pool.claimReward();
        if (
            (rewardToken.balanceOf(address(this)) > 0) &&
            (address(rewardToken) != address(WNATIVE))
        ) {
            // TODO:
            // _zapRewardToNative(rewardToken.balanceOf(address(this)));
            router.swapExactTokensForTokens(
                rewardToken.balanceOf(address(this)),
                0,
                rewardToNativePath,
                address(this),
                block.timestamp + 1 minutes
            );
        }

        nativeBalanceAfter = nativeBalanceOfThis();
        feeInNative +=
            ((nativeBalanceAfter - nativeBalanceBefore) * fee) /
            10000;

        // get rewards due to borrowing interest rate
        uint256 currentValueOfAllUnderlying = getValueOfAllUnderlying();
        // TODO: does it work?
        console.log(
            "currentValueOfAllUnderlying %s",
            currentValueOfAllUnderlying
        );
        console.log("lastValueOfAllUnderlying %s", lastValueOfAllUnderlying);
        if (currentValueOfAllUnderlying > lastValueOfAllUnderlying) {
            uint256 profitInPoolToken = currentValueOfAllUnderlying -
                lastValueOfAllUnderlying;
            nativeBalanceBefore = nativeBalanceOfThis();
            uint256 poolTokenBalanceBefore = ERC20(poolToken).balanceOf(
                address(this)
            );
            // withdraw pool token
            pool.withdrawToken((profitInPoolToken * fee) / 10000);
            uint256 poolTokenBalanceAfter = ERC20(poolToken).balanceOf(
                address(this)
            );
            if (
                (poolTokenBalanceAfter - poolTokenBalanceBefore > 0) &&
                (poolToken != address(WNATIVE))
            ) {
                router.swapExactTokensForTokens(
                    poolTokenBalanceAfter - poolTokenBalanceBefore,
                    0,
                    poolTokenToNativePath,
                    address(this),
                    block.timestamp + 1 minutes
                );
            }
            nativeBalanceAfter = nativeBalanceOfThis();

            if (nativeBalanceAfter - nativeBalanceBefore > 0) {
                // if some profit is made
                feeInNative += nativeBalanceAfter - nativeBalanceBefore;

                // 20% fees in native (wmatic)
                uint256 _feeSplit = feeInNative / 2; // 50%
                if (_feeSplit > 0) {
                    // goes to buy back star and distribute to vePREON holders
                    address[] memory _path = new address[](2);
                    _path[0] = address(WNATIVE);
                    _path[1] = address(feeRewardToken);

                    IJoeRouter(uniswapRouter).swapExactTokensForTokens(
                        _feeSplit,
                        0,
                        _path,
                        address(vePreonEmissions),
                        block.timestamp + 1 minutes
                    );

                    IVePreonEmissions(vePreonEmissions).checkpointToken();
                    IVePreonEmissions(vePreonEmissions).checkpointTotalSupply();

                    uint256 _recipient1Share = (_feeSplit * recipientFeeSplit) /
                        10_000;
                    uint256 _recipient2Share = (_feeSplit *
                        (10_000 - recipientFeeSplit)) / 10_000;

                    if (_recipient1Share > 0) {
                        underlying.approve(feeRecipient, _recipient1Share);
                        console.log(
                            "@UNDERLING BALANCE: ",
                            underlying.balanceOf(address(this))
                        );
                        console.log("@UNDERLING SHARE: ", _recipient1Share);

                        SafeTransferLib.safeTransfer(
                            underlying,
                            feeRecipient,
                            _recipient1Share
                        );
                        emit FeePaid(feeRecipient, _recipient1Share);
                        lastReinvestTime = block.timestamp;
                    }

                    if (_recipient2Share > 0) {
                        underlying.approve(feeRecipient2, _recipient2Share);
                        SafeTransferLib.safeTransfer(
                            underlying,
                            feeRecipient2,
                            _recipient2Share
                        );
                        emit FeePaid(feeRecipient2, _recipient2Share);
                        lastReinvestTime = block.timestamp;
                    }
                }
            }
        }

        if ((nativeBalanceOfThis() > 0) && (address(WNATIVE) != poolToken)) {
            // how much input to get atleast 2 wei output
            uint256[] memory amountsOut = router.getAmountsIn(
                2,
                nativeToPoolTokenPath
            );
            uint256 minSwapAmount = amountsOut[0];

            if (nativeBalanceOfThis() > minSwapAmount) {
                router.swapExactTokensForTokens(
                    nativeBalanceOfThis(),
                    0,
                    nativeToPoolTokenPath,
                    address(this),
                    block.timestamp + 1 minutes
                );
            }
        }

        // compounding
        _depositToPool();

        lastValueOfAllUnderlying = getValueOfAllUnderlying();
    }

    // TODO:
    // function _zapRewardToNative(uint256 rewardBalance) internal {
    //     router.swapExactTokensForTokens(
    //         rewardBalance,
    //         0,
    //         rewardToNativePath,
    //         address(this),
    //         block.timestamp + 1 minutes
    //     );
    // }

    function _giveAllowances() internal {
        rewardToken.safeApprove(address(router), 0);
        rewardToken.safeApprove(address(router), type(uint256).max);

        ERC20(poolToken).safeApprove(address(router), 0);
        ERC20(poolToken).safeApprove(address(router), type(uint256).max);

        ERC20(address(WNATIVE)).safeApprove(address(router), 0);
        ERC20(address(WNATIVE)).safeApprove(address(router), type(uint256).max);

        ERC20(poolToken).safeApprove(address(pool), 0);
        ERC20(poolToken).safeApprove(address(pool), type(uint256).max);
    }

    function getArrayReversed(
        address[] memory _array
    ) public pure returns (address[] memory) {
        uint256 length = _array.length;
        address[] memory reversed = new address[](length);
        for (uint256 i = 0; i < length; ) {
            reversed[i] = _array[length - 1 - i];
            unchecked {
                i++;
            }
        }
        return reversed;
    }

    function balanceOfThis() public view returns (uint256) {
        return underlying.balanceOf(address(this));
    }

    function nativeBalanceOfThis() public view returns (uint256) {
        return WNATIVE.balanceOf(address(this));
    }

    // in terms of poolToken
    function getValueOfAllUnderlying() internal view returns (uint256) {
        return
            (pool.balanceOf(address(this)) * pool.exchangeRateStored()) /
            1 ether;
    }
}
