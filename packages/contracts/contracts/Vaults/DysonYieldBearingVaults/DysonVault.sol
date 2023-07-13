// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.2;

import "../../Dependencies/Initializable.sol";
import "../../Dependencies/OwnableUpgradeable_8.sol";
import "../../Dependencies/ReentrancyGuardUpgradeable.sol";

import {SafeTransferLib} from "../dependencies/SafeTransferLib.sol";
import {ERC20} from "../dependencies/ERC20.sol";
import {ERC20Upgradeable} from "../dependencies/ERC20Upgradeable.sol";

import "./interfaces/IDysonStrategy.sol";

contract DysonVault is
    ERC20Upgradeable,
    Initializable,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable
{
    using SafeTransferLib for ERC20;

    // Min swap to rid of edge cases with untracked rewards for small deposits.
    uint256 public constant MIN_FIRST_MINT = 1e12; // Require substantial first mint to prevent exploits from rounding errors
    uint256 public constant FIRST_DONATION = 1e8; // Lock in first donation to prevent exploits from rounding errors

    address public BOpsAddress;

    IDysonStrategy public strategy;

    event Deposit(
        address indexed caller,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );

    event Withdraw(
        address indexed caller,
        address indexed receiver,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );
    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;

    function initialize(
        string memory _name,
        string memory _symbol
    ) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
        initializeERC20(_name, _symbol, 18);
    }

    function _giveAllowances() internal {
        underlying().safeApprove(address(strategy), 0);
        underlying().safeApprove(address(strategy), type(uint256).max);
    }

    function _removeAllowances() internal {
        underlying().safeApprove(address(strategy), 0);
    }

    // sets strategy contract
    function setStrategy(address _strategy) public onlyOwner {
        if (address(strategy) != address(0)) _removeAllowances();
        strategy = IDysonStrategy(_strategy);
        _giveAllowances();
    }

    // Sets the address of the BorrowerOperations contract which will have permissions to depositFor.
    function setBOps(address _BOpsAddress) public onlyOwner {
        BOpsAddress = _BOpsAddress;
    }

    function deposit(uint256 _amt) public returns (uint256) {
        return deposit(msg.sender, _amt);
    }

    // Deposit underlying for a given amount of vault tokens. Buys in at the current receipt
    // per underlying and then transfers it to the original sender.
    function deposit(
        address _to,
        uint256 _amt
    ) public nonReentrant returns (uint256 receiptTokens) {
        require(_amt > 0, "0 tokens");

        strategy.beforeDepositAndWithdraw();
        receiptTokens = (receiptPerUnderlying() * _amt) / 1e18;
        if (totalSupply == 0) {
            require(receiptTokens >= MIN_FIRST_MINT);
            _mint(strategy.preonTreasury(), FIRST_DONATION);
            receiptTokens -= FIRST_DONATION;
        }
        require(receiptTokens != 0, "0 received");
        SafeTransferLib.safeTransferFrom(
            underlying(),
            msg.sender,
            address(this),
            _amt
        );
        strategy.deposit(_amt);
        _mint(_to, receiptTokens);
        emit Deposit(msg.sender, _to, _amt, receiptTokens);
    }

    // For use in the PREON borrowing protocol, depositFor assumes approval of the underlying token to the router,
    // and it is only callable from the BOps contract.
    function depositFor(
        address _borrower,
        address _to,
        uint256 _amt
    ) public nonReentrant returns (uint256) {
        require(msg.sender == BOpsAddress, "BOps only");
        require(_amt > 0, "0 tokens");

        strategy.beforeDepositAndWithdraw();
        uint256 receiptTokens = (receiptPerUnderlying() * _amt) / 1e18;
        require(
            receiptTokens != 0,
            "Deposit amount too small, you will get 0 receipt tokens"
        );
        SafeTransferLib.safeTransferFrom(
            underlying(),
            _borrower,
            address(this),
            _amt
        );
        strategy.deposit(_amt);
        _mint(_to, receiptTokens);
        emit Deposit(_borrower, _to, _amt, receiptTokens);
        
        return _amt;
    }

    // TODO : Deposit underlying token supporting gasless approvals
    // function depositWithPermit(
    //     uint256 _amt,
    //     uint256 _value,
    //     uint256 _deadline,
    //     uint8 _v,
    //     bytes32 _r,
    //     bytes32 _s
    // ) public returns (uint256 receiptTokens) {
    //     IERC2612(address(underlying)).permit(
    //         msg.sender,
    //         address(this),
    //         _value,
    //         _deadline,
    //         _v,
    //         _r,
    //         _s
    //     );
    //     return deposit(_amt);
    // }

    function redeem(uint256 _amt) public returns (uint256) {
        return redeem(msg.sender, _amt);
    }

    // Withdraw underlying tokens for a given amount of vault tokens
    function redeem(
        address _to,
        uint256 _amt
    ) public nonReentrant returns (uint256 amtToReturn) {
        // require(_amt > 0, "0 tokens");
        amtToReturn = (underlyingPerReceipt() * _amt) / 1e18;

        amtToReturn = _withdraw(amtToReturn);

        _burn(msg.sender, _amt);
        SafeTransferLib.safeTransfer(underlying(), _to, amtToReturn);
        emit Withdraw(msg.sender, _to, msg.sender, amtToReturn, _amt);
    }

    // Bailout in case compound() breaks
    function emergencyRedeem(
        uint256 _amt
    ) public nonReentrant returns (uint256 amtToReturn) {
        amtToReturn = (underlyingPerReceipt() * _amt) / 1e18;
        amtToReturn = _withdraw(amtToReturn);
        _burn(msg.sender, _amt);
        SafeTransferLib.safeTransfer(underlying(), msg.sender, amtToReturn);
        emit Withdraw(msg.sender, msg.sender, msg.sender, amtToReturn, _amt);
    }

    // Withdraw receipt tokens from another user with approval
    function redeemFor(
        uint256 _amt,
        address _from,
        address _to
    ) public nonReentrant returns (uint256 amtToReturn) {
        // require(_amt > 0, "0 tokens");
        uint256 allowed = allowance[_from][msg.sender];
        // Below line should throw if allowance is not enough, or if from is the caller itself.
        if (allowed != type(uint256).max && msg.sender != _from) {
            allowance[_from][msg.sender] = allowed - _amt;
        }
        amtToReturn = (underlyingPerReceipt() * _amt) / 1e18;
        amtToReturn = _withdraw(amtToReturn);
        _burn(_from, _amt);
        SafeTransferLib.safeTransfer(underlying(), _to, amtToReturn);
        emit Withdraw(msg.sender, _to, _from, amtToReturn, _amt);
    }

    function _withdraw(uint256 _amt) internal returns (uint256) {
        strategy.beforeDepositAndWithdraw();
        uint256 b = balanceOfThis();

        if (b < _amt) {
            uint256 _withdraw = _amt - b;
            strategy.withdraw(_withdraw);
            uint256 _after = underlying().balanceOf(address(this));
            uint _diff = _after - b;
            if (_diff < _withdraw) {
                _amt = b + _diff;
            }
        }
        return _amt;
    }

    // TODO : Withdraw receipt tokens from another user with gasless approval
    // function redeemForWithPermit(
    //     uint256 _amt,
    //     address _from,
    //     address _to,
    //     uint256 _value,
    //     uint256 _deadline,
    //     uint8 _v,
    //     bytes32 _r,
    //     bytes32 _s
    // ) public returns (uint256) {
    //     permit(_from, msg.sender, _value, _deadline, _v, _r, _s);
    //     return redeemFor(_amt, _from, _to);
    // }

    function underlying() public view returns (ERC20) {
        return strategy.underlying();
    }

    // How many vault tokens can I get for 1 unit of the underlying * 1e18
    // Can be overriden if underlying balance is not reflected in contract balance
    function receiptPerUnderlying() public view returns (uint256) {
        if (totalSupply == 0) {
            return 10 ** (18 + 18 - strategy.underlyingDecimal());
        }
        return (1e18 * totalSupply) / totalHoldings();
    }

    function underlyingDecimal() public view returns (uint256) {
        return underlying().decimals();
    }

    // How many underlying tokens can I get for 1 unit of the vault token * 1e18
    // Can be overriden if underlying balance is not reflected in contract balance
    function underlyingPerReceipt() public view returns (uint256) {
        if (totalSupply == 0) {
            return 10 ** strategy.underlyingDecimal();
        }
        return (1e18 * totalHoldings()) / totalSupply;
    }

    function totalHoldings() public view returns (uint256) {
        return balanceOfThis() + strategy.balanceOfThis();
    }

    function balanceOfThis() public view returns (uint256) {
        return underlying().balanceOf(address(this));
    }
}
