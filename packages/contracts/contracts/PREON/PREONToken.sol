// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "../Dependencies/SafeMath.sol";
import "../Interfaces/IPREONToken.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/*
 * Brought to you by @PreonFinance
 *
 * Based upon OpenZeppelin's ERC20 contract:
 * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol
 *
 * and their EIP2612 (ERC20Permit / ERC712) functionality:
 * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/53516bc555a454862470e7860a9b5254db4d00f5/contracts/token/ERC20/ERC20Permit.sol
 *
 *
 *  --- Functionality added specific to the PREONToken ---
 *
 * 1) Transfer protection: Prevent accidentally sending PREON to directly to this address
 *
 * 2) sendToSPREON(): Only callable by the SPREON contract to transfer PREON for staking.
 *
 * 3) Supply hard-capped at 500 million
 *
 * 4) Preon Finance Treasury and Preon Finance Team addresses set at deployment
 *
 * 5) 365 million tokens are minted at deployment to the Preon Finance Treasury
 *
 * 6) 135 million tokens are minted at deployment to the Preon Finance Team
 *
 */
contract PREONToken is IPREONToken, Initializable, ERC20Upgradeable {
    using SafeMath for uint256;

    // --- ERC20 Data ---

    string internal constant _NAME = "Preon Finance";
    string internal constant _SYMBOL = "PREON";
    string internal constant _VERSION = "1";
    uint8 internal constant _DECIMALS = 18;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint private _totalSupply;
    address public minter;

    // --- EIP 2612 Data ---

    bytes32 private constant _PERMIT_TYPEHASH =
        keccak256(
            "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
        );
    bytes32 private constant _TYPE_HASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );

    // Cache the domain separator as an immutable value, but also store the chain id that it corresponds to, in order to
    // invalidate the cached domain separator if the chain id changes.
    bytes32 private _CACHED_DOMAIN_SEPARATOR;
    uint256 private _CACHED_CHAIN_ID;

    bytes32 private _HASHED_NAME;
    bytes32 private _HASHED_VERSION;

    mapping(address => uint256) private _nonces;

    // --- PREONToken specific data ---

    // uint for use with SafeMath
    uint internal _1_MILLION; // 1e6 * 1e18 = 1e24

    uint internal deploymentStartTime;

    address public sPREONAddress;

    // --- Functions ---

    // constructor(
    //     address _sPREONAddress,
    //     address _treasuryAddress,
    //     address _teamAddress
    // ) {
    //     deploymentStartTime = block.timestamp;

    //     sPREONAddress = _sPREONAddress;

    //     bytes32 hashedName = keccak256(bytes(_NAME));
    //     bytes32 hashedVersion = keccak256(bytes(_VERSION));

    //     _HASHED_NAME = hashedName;
    //     _HASHED_VERSION = hashedVersion;
    //     _CACHED_CHAIN_ID = _chainID();
    //     _CACHED_DOMAIN_SEPARATOR = _buildDomainSeparator(
    //         _TYPE_HASH,
    //         hashedName,
    //         hashedVersion
    //     );

    //     // --- Initial PREON allocations ---

    //     // Allocate 365 million for Preon Finance Treasury
    //     uint treasuryEntitlement = _1_MILLION.mul(365);
    //     _totalSupply = _totalSupply.add(treasuryEntitlement);
    //     _balances[_treasuryAddress] = _balances[_treasuryAddress].add(
    //         treasuryEntitlement
    //     );

    //     // Allocate 135 million for Preon Finance Team
    //     uint teamEntitlement = _1_MILLION.mul(135);
    //     _totalSupply = _totalSupply.add(teamEntitlement);
    //     _balances[_teamAddress] = _balances[_teamAddress].add(teamEntitlement);
    // }

    // Initializer function
    //  constructor() {
    //     _disableInitializers();
    // }

    function initialize(
        address _sPREONAddress,
        address _treasuryAddress,
        address _teamAddress
    ) public initializer {
        __ERC20_init(_NAME, _SYMBOL);
        // __ERC20Permit_init(_NAME);
        _1_MILLION = 1e24;
        deploymentStartTime = block.timestamp;

        sPREONAddress = _sPREONAddress;

        bytes32 hashedName = keccak256(bytes(_NAME));
        bytes32 hashedVersion = keccak256(bytes(_VERSION));

        _HASHED_NAME = hashedName;
        _HASHED_VERSION = hashedVersion;
        _CACHED_CHAIN_ID = _chainID();
        _CACHED_DOMAIN_SEPARATOR = _buildDomainSeparator(
            _TYPE_HASH,
            hashedName,
            hashedVersion
        );

        // --- Initial PREON allocations ---

        // Allocate 365 million for Preon Finance Treasury
        uint treasuryEntitlement = _1_MILLION.mul(365);
        _totalSupply = _totalSupply.add(treasuryEntitlement);
        _balances[_treasuryAddress] = _balances[_treasuryAddress].add(
            treasuryEntitlement
        );

        // Allocate 135 million for Preon Finance Team
        uint teamEntitlement = _1_MILLION.mul(135);
        _totalSupply = _totalSupply.add(teamEntitlement);
        _balances[_teamAddress] = _balances[_teamAddress].add(teamEntitlement);
        minter = msg.sender;
    }

    // --- External functions ---

    function transfer(
        address recipient,
        uint256 amount
    ) public override(ERC20Upgradeable, IERC20) returns (bool) {
        _requireValidRecipient(recipient);

        // Otherwise, standard transfer functionality
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function approve(
        address spender,
        uint256 amount
    ) public override(ERC20Upgradeable, IERC20) returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override(ERC20Upgradeable, IERC20) returns (bool) {
        _requireValidRecipient(recipient);
        _transfer(sender, recipient, amount);
        _approve(
            sender,
            msg.sender,
            _allowances[sender][msg.sender].sub(
                amount,
                "PREON: transfer amount exceeds allowance"
            )
        );
        return true;
    }

    function increaseAllowance(
        address spender,
        uint256 addedValue
    ) public override(ERC20Upgradeable, IERC20) returns (bool) {
        _approve(
            msg.sender,
            spender,
            _allowances[msg.sender][spender].add(addedValue)
        );
        return true;
    }

    function decreaseAllowance(
        address spender,
        uint256 subtractedValue
    ) public override(ERC20Upgradeable, IERC20) returns (bool) {
        _approve(
            msg.sender,
            spender,
            _allowances[msg.sender][spender].sub(
                subtractedValue,
                "PREON: decreased allowance below zero"
            )
        );
        return true;
    }

    // --- EIP 2612 Functionality ---

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public override {
        require(deadline >= block.timestamp, "STAR: expired deadline");
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                domainSeparator(),
                keccak256(
                    abi.encode(
                        _PERMIT_TYPEHASH,
                        owner,
                        spender,
                        value,
                        _nonces[owner]++,
                        deadline
                    )
                )
            )
        );
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress == owner, "STAR: invalid signature");
        _approve(owner, spender, value);
    }

    function domainSeparator() public view override returns (bytes32) {
        if (_chainID() == _CACHED_CHAIN_ID) {
            return _CACHED_DOMAIN_SEPARATOR;
        } else {
            return
                _buildDomainSeparator(
                    _TYPE_HASH,
                    _HASHED_NAME,
                    _HASHED_VERSION
                );
        }
    }

    function nonces(address owner) public view override returns (uint256) {
        // FOR EIP 2612
        return _nonces[owner];
    }

    // --- Internal functions ---

    function _chainID() private view returns (uint256 chainID) {
        assembly {
            chainID := chainid()
        }
    }

    function _buildDomainSeparator(
        bytes32 typeHash,
        bytes32 nameHash,
        bytes32 versionHash
    ) private view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    typeHash,
                    nameHash,
                    versionHash,
                    block.chainid,
                    address(this)
                )
            );
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override {
        require(sender != address(0), "PREON: transfer from the zero address");

        _balances[sender] = _balances[sender].sub(
            amount,
            "PREON: transfer amount exceeds balance"
        );
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }

    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal override {
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    // --- 'require' functions ---

    function _requireValidRecipient(address _recipient) internal view {
        require(
            _recipient != address(this),
            "PREON: Cannot transfer tokens directly to the PREON token contract"
        );
    }

    function _requireCallerIsSPREON() internal view {
        require(
            msg.sender == sPREONAddress,
            "PREON: caller must be the SPREON contract"
        );
    }

    // --- External View functions ---

    function balanceOf(
        address account
    ) public view override(ERC20Upgradeable, IERC20) returns (uint256) {
        return _balances[account];
    }

    function allowance(
        address owner,
        address spender
    ) public view override(ERC20Upgradeable, IERC20) returns (uint256) {
        return _allowances[owner][spender];
    }

    function totalSupply()
        public
        view
        override(ERC20Upgradeable, IERC20)
        returns (uint256)
    {
        return _totalSupply;
    }

    function getDeploymentStartTime() external view override returns (uint256) {
        return deploymentStartTime;
    }

    function name()
        public
        pure
        override(ERC20Upgradeable, IERC20)
        returns (string memory)
    {
        return _NAME;
    }

    function symbol()
        public
        pure
        override(ERC20Upgradeable, IERC20)
        returns (string memory)
    {
        return _SYMBOL;
    }

    function decimals()
        public
        pure
        override(ERC20Upgradeable, IERC20)
        returns (uint8)
    {
        return _DECIMALS;
    }

    function version() external pure override returns (string memory) {
        return _VERSION;
    }

    function permitTypeHash() external pure override returns (bytes32) {
        return _PERMIT_TYPEHASH;
    }

    function setMinter(address _newMinter) external {
        require(msg.sender == minter);
        minter = _newMinter;
    }

    function mint(address _account, uint _amount) external {
        require(msg.sender == minter, "!minter");

        _totalSupply = _totalSupply.add(_amount);
        _balances[_account] = _balances[_account].add(_amount);
    }
}
