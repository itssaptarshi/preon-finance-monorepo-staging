// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.2;

import "../dependencies/ERC20.sol";
import "../../Dependencies/Initializable.sol";
import "../../Dependencies/OwnableUpgradeable_8.sol";
import "../../Dependencies/ReentrancyGuardUpgradeable.sol";
import {SafeTransferLib} from "../dependencies/SafeTransferLib.sol";
import {ERC20Upgradeable} from "../dependencies/ERC20Upgradeable.sol";

import "../interfaces/IDystPair.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IDystopiaRouter.sol";
import "../../Interfaces/IVePreonEmissions.sol";

import {IWAVAX} from "../interfaces/IWAVAX.sol";
import "../../Interfaces/IJoeRouter.sol";

contract DysonUSDPlusStrategy is
    ERC20Upgradeable,
    Initializable,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable
{
    using SafeTransferLib for IERC20;
    using SafeTransferLib for ERC20;

    uint256 public underlyingDecimal; //decimal of underlying token
    ERC20 public underlying; // the underlying token

    uint256 public lastReinvestTime; // Timestamp of last reinvestment
    uint256 public fee;
    uint256 public lastValueOfAllUnderlying;
    bool public compoundBeforeDepositAndWithdraw;
    address public vePreonEmissions;

    address public feeRecipient;
    address public feeRecipient2;
    uint256 public recipientFeeSplit;

    IWAVAX public WNATIVE;
    address public vault;
    address public dystRouter;
    address public uniswapRouter;
    address public rewardToken;

    event FeePaid(address payee, uint256 amount);
    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;

    function initialize(
        address _underlying,
        address _WNATIVE,
        address _dystopiaRouter,
        uint256 _fee,
        address _vault,
        address _uniswapRouter,
        address _rewardToken
    ) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
        require(_dystopiaRouter != address(0), "Zero address not allowed");
        require(_uniswapRouter != address(0), "Zero address not allowed");
        require(_rewardToken != address(0), "Zero address not allowed");

        compoundBeforeDepositAndWithdraw = true;
        underlying = ERC20(_underlying);
        underlyingDecimal = underlying.decimals();
        WNATIVE = IWAVAX(_WNATIVE);

        uniswapRouter = _uniswapRouter;

        setFee(_fee);
        underlying.approve(uniswapRouter, type(uint256).max);
        rewardToken = _rewardToken;

        vault = _vault;
        dystRouter = _dystopiaRouter;
    }

    // Sets fee
    function setFee(uint256 _fee) public onlyOwner {
        require(_fee < 10000, "invalid fees");
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

    function setCompoundBeforeDepositAndWithdraw(
        bool _value
    ) external onlyOwner {
        compoundBeforeDepositAndWithdraw = _value;
    }

    function setLastValueOfAllUnderlying(uint256 _value) external onlyOwner {
        lastValueOfAllUnderlying = _value;
    }

    function withdraw(uint256 _amt) external returns (uint256) {
        require(msg.sender == vault, "sender != vault");
        uint256 valueOfAllUnderlyingBefore = getValueOfAllUnderlying();
        uint256 underlyingBalance = underlying.balanceOf(address(this));
        if (underlyingBalance < _amt) _amt = underlyingBalance;
        SafeTransferLib.safeTransfer(underlying, msg.sender, _amt);
        _updateLastValueOfAllUnderlying(valueOfAllUnderlyingBefore);
    }

    function balanceOfThis() public view returns (uint256) {
        return underlying.balanceOf(address(this));
    }

    // In terms of native
    function getValueOfAllUnderlying() internal view returns (uint256) {
        return underlying.balanceOf(address(this));
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
        _updateLastValueOfAllUnderlying(valueOfAllUnderlyingBefore);
    }

    function _updateLastValueOfAllUnderlying(uint256 valueBefore) internal {
        lastValueOfAllUnderlying =
            lastValueOfAllUnderlying +
            getValueOfAllUnderlying() -
            valueBefore;
    }

    function beforeDepositAndWithdraw() external {
        if (compoundBeforeDepositAndWithdraw == true) _compound();
    }

    function compound() external nonReentrant {
        _compound();
    }

    // no compounding happens; only charges fee to be sent to the treasury
    function _compound() internal {
        if (block.timestamp < lastReinvestTime + 3 hours) return;
        require(vePreonEmissions != address(0), "veEmissions is not set");

        uint256 currentValueOfAllUnderlying = getValueOfAllUnderlying();

        if (currentValueOfAllUnderlying > lastValueOfAllUnderlying) {
            uint256 profitInUnderlying = currentValueOfAllUnderlying -
                lastValueOfAllUnderlying;

            if (profitInUnderlying > 0) {
                uint256 _compoundingFee = (profitInUnderlying * fee) / 10_000; // default: 20% compounding fees

                uint256 _feeSplit = _compoundingFee / 2; // 50%
                if (_feeSplit > 0) {
                    // goes to buy back star and distribute to vePREON holders
                    address[] memory _path = new address[](3);
                    _path[0] = address(underlying);
                    _path[1] = address(WNATIVE);
                    _path[2] = address(rewardToken);

                    // * swap reward token
                    IJoeRouter(uniswapRouter).swapExactTokensForTokens(
                        _feeSplit,
                        0,
                        _path,
                        address(vePreonEmissions),
                        block.timestamp + 2 minutes
                    );

                    IVePreonEmissions(vePreonEmissions).checkpointToken();
                    IVePreonEmissions(vePreonEmissions).checkpointTotalSupply();

                    // * rest, goes to _recipient1 & _recipient2 in ratio
                    uint256 _recipient1Share = (_feeSplit * recipientFeeSplit) /
                        10_000;
                    uint256 _recipient2Share = (_feeSplit *
                        (10_000 - recipientFeeSplit)) / 10_000;

                    if (_recipient1Share > 0) {
                        underlying.approve(feeRecipient, _recipient1Share);
                        SafeTransferLib.safeTransfer(
                            underlying,
                            feeRecipient,
                            _recipient1Share
                        );
                        emit FeePaid(feeRecipient, _recipient1Share);
                    }

                    if (_recipient2Share > 0) {
                        underlying.approve(feeRecipient2, _recipient2Share);
                        SafeTransferLib.safeTransfer(
                            underlying,
                            feeRecipient2,
                            _recipient2Share
                        );
                        emit FeePaid(feeRecipient2, _recipient2Share);
                    }
                }

                lastValueOfAllUnderlying = getValueOfAllUnderlying();
                lastReinvestTime = block.timestamp;
            }
        }
    }
}
