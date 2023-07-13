// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

import "./Interfaces/IBorrowerOperations.sol";
import "./Interfaces/IStabilityPool.sol";
import "./Interfaces/IBorrowerOperations.sol";
import "./Interfaces/ITroveManager.sol";
import "./Interfaces/ISTARToken.sol";
import "./Interfaces/ISortedTroves.sol";
import "./Interfaces/ICommunityIssuance.sol";
import "./Interfaces/IPreonController.sol";
import "./Interfaces/IERC20.sol";
import "./Interfaces/IPreonVaultToken.sol";
import "./Interfaces/IPreonLever.sol";
import "./Dependencies/PoolBase.sol";
import "./Dependencies/SafeMath.sol";
import "./Dependencies/PreonSafeMath128.sol";
import "./Dependencies/SafeERC20.sol";
import "./Dependencies/ReentrancyGuardUpgradeable.sol";


/**
 * @title The Stability Pool holds STAR tokens deposited by Stability Pool depositors.
 * @dev When a trove is liquidated, then depending on system conditions, some of its STAR debt gets offset with
 * STAR in the Stability Pool: that is, the offset debt evaporates, and an equal amount of STAR tokens in the Stability Pool is burned.
 *
 * Thus, a liquidation causes each depositor to receive a STAR loss, in proportion to their deposit as a share of total deposits.
 * They also receive an Collateral gain, as the amount of collateral of the liquidated trove is distributed among Stability depositors,
 * in the same proportion.
 *
 * When a liquidation occurs, it depletes every deposit by the same fraction: for example, a liquidation that depletes 40%
 * of the total STAR in the Stability Pool, depletes 40% of each deposit.
 *
 * A deposit that has experienced a series of liquidations is termed a "compounded deposit": each liquidation depletes the deposit,
 * multiplying it by some factor in range ]0,1[
 *
 *
 * --- IMPLEMENTATION ---
 *
 * We use a highly scalable method of tracking deposits and Collateral gains that has O(1) complexity.
 *
 * When a liquidation occurs, rather than updating each depositor's deposit and Collateral gain, we simply update two state variables:
 * a product P, and a sum S. These are kept track for each type of collateral.
 *
 * A mathematical manipulation allows us to factor out the initial deposit, and accurately track all depositors' compounded deposits
 * and accumulated Collateral amount gains over time, as liquidations occur, using just these two variables P and S. When depositors join the
 * Stability Pool, they get a snapshot of the latest P and S: P_t and S_t, respectively.
 *
 * The formula for a depositor's accumulated Collateral amount gain is derived here:
 * https://github.com/liquity/dev/blob/main/packages/contracts/mathProofs/Scalable%20Compounding%20Stability%20Pool%20Deposits.pdf
 *
 * For a given deposit d_t, the ratio P/P_t tells us the factor by which a deposit has decreased since it joined the Stability Pool,
 * and the term d_t * (S - S_t)/P_t gives us the deposit's total accumulated Collateral amount gain.
 *
 * Each liquidation updates the product P and sum S. After a series of liquidations, a compounded deposit and corresponding Collateral amount gain
 * can be calculated using the initial deposit, the depositor’s snapshots of P and S, and the latest values of P and S.
 *
 * Any time a depositor updates their deposit (withdrawal, top-up) their accumulated Collateral amount gain is paid out, their new deposit is recorded
 * (based on their latest compounded deposit and modified by the withdrawal/top-up), and they receive new snapshots of the latest P and S.
 * Essentially, they make a fresh deposit that overwrites the old one.
 *
 *
 * --- SCALE FACTOR ---
 *
 * Since P is a running product in range ]0,1] that is always-decreasing, it should never reach 0 when multiplied by a number in range ]0,1[.
 * Unfortunately, Solidity floor division always reaches 0, sooner or later.
 *
 * A series of liquidations that nearly empty the Pool (and thus each multiply P by a very small number in range ]0,1[ ) may push P
 * to its 18 digit decimal limit, and round it to 0, when in fact the Pool hasn't been emptied: this would break deposit tracking.
 *
 * So, to track P accurately, we use a scale factor: if a liquidation would cause P to decrease to <1e-9 (and be rounded to 0 by Solidity),
 * we first multiply P by 1e9, and increment a currentScale factor by 1.
 *
 * The added benefit of using 1e9 for the scale factor (rather than 1e18) is that it ensures negligible precision loss close to the
 * scale boundary: when P is at its minimum value of 1e9, the relative precision loss in P due to floor division is only on the
 * order of 1e-9.
 *
 * --- EPOCHS ---
 *
 * Whenever a liquidation fully empties the Stability Pool, all deposits should become 0. However, setting P to 0 would make P be 0
 * forever, and break all future reward calculations.
 *
 * So, every time the Stability Pool is emptied by a liquidation, we reset P = 1 and currentScale = 0, and increment the currentEpoch by 1.
 *
 * --- TRACKING DEPOSIT OVER SCALE CHANGES AND EPOCHS ---
 *
 * When a deposit is made, it gets snapshots of the currentEpoch and the currentScale.
 *
 * When calculating a compounded deposit, we compare the current epoch to the deposit's epoch snapshot. If the current epoch is newer,
 * then the deposit was present during a pool-emptying liquidation, and necessarily has been depleted to 0.
 *
 * Otherwise, we then compare the current scale to the deposit's scale snapshot. If they're equal, the compounded deposit is given by d_t * P/P_t.
 * If it spans one scale change, it is given by d_t * P/(P_t * 1e9). If it spans more than one scale change, we define the compounded deposit
 * as 0, since it is now less than 1e-9'th of its initial value (e.g. a deposit of 1 billion STAR has depleted to < 1 STAR).
 *
 *
 *  --- TRACKING DEPOSITOR'S COLLATERAL AMOUNT GAIN OVER SCALE CHANGES AND EPOCHS ---
 *
 * In the current epoch, the latest value of S is stored upon each scale change, and the mapping (scale -> S) is stored for each epoch.
 *
 * This allows us to calculate a deposit's accumulated Collateral amount gain, during the epoch in which the deposit was non-zero and earned Collateral amount.
 *
 * We calculate the depositor's accumulated Collateral amount gain for the scale at which they made the deposit, using the Collateral amount gain formula:
 * e_1 = d_t * (S - S_t) / P_t
 *
 * and also for scale after, taking care to divide the latter by a factor of 1e9:
 * e_2 = d_t * S / (P_t * 1e9)
 *
 * The gain in the second scale will be full, as the starting point was in the previous scale, thus no need to subtract anything.
 * The deposit therefore was present for reward events from the beginning of that second scale.
 *
 *        S_i-S_t + S_{i+1}
 *      .<--------.------------>
 *      .         .
 *      . S_i     .   S_{i+1}
 *   <--.-------->.<----------->
 *   S_t.         .
 *   <->.         .
 *      t         .
 *  |---+---------|-------------|-----...
 *         i            i+1
 *
 * The sum of (e_1 + e_2) captures the depositor's total accumulated Collateral amount gain, handling the case where their
 * deposit spanned one scale change. We only care about gains across one scale change, since the compounded
 * deposit is defined as being 0 once it has spanned more than one scale change.
 *
 *
 * --- UPDATING P WHEN A LIQUIDATION OCCURS ---
 *
 * Please see the implementation spec in the proof document, which closely follows on from the compounded deposit / Collateral amount gain derivations:
 * https://github.com/liquity/liquity/blob/master/papers/Scalable_Reward_Distribution_with_Compounding_Stakes.pdf
 *
 *
 * --- PREON ISSUANCE TO STABILITY POOL DEPOSITORS ---
 *
 * An PREON issuance event occurs at every deposit operation, and every liquidation.
 *
 * All deposits earn a share of the issued PREON in proportion to the deposit as a share of total deposits.
 *
 * Please see the system Readme for an overview:
 * https://github.com/liquity/dev/blob/main/README.md#preon-issuance-to-stability-providers
 *
 * We use the same mathematical product-sum approach to track PREON gains for depositors, where 'G' is the sum corresponding to PREON gains.
 * The product P (and snapshot P_t) is re-used, as the ratio P/P_t tracks a deposit's depletion due to liquidations.
 *
 */
contract StabilityPool is PoolBase, ReentrancyGuardUpgradeable, IStabilityPool {
    using PreonSafeMath128 for uint128;
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    string public constant NAME = "StabilityPool";

    address internal troveManagerLiquidationsAddress;

    IBorrowerOperations internal borrowerOperations;
    ITroveManager internal troveManager;
    ISTARToken internal starToken;
    ICommunityIssuance internal communityIssuance;
    // Needed to check if there are pending liquidations
    ISortedTroves internal sortedTroves;

    // Tracker for STAR held in the pool. Changes when users deposit/withdraw, and when Trove debt is offset.
    uint256 internal totalSTARDeposits;

    // totalColl.tokens and totalColl.amounts should be the same length and
    // always be the same length as controller.validCollaterals().
    // Anytime a new collateral is added to controller, both lists are lengthened
    newColls internal totalColl;

    // --- Data structures ---

    struct Snapshots {
        mapping(address => uint256) S;
        uint256 P;
        uint256 G;
        uint128 scale;
        uint128 epoch;
    }

    mapping(address => uint256) public deposits; // depositor address -> deposit amount

    /*
     * depositSnapshots maintains an entry for each depositor
     * that tracks P, S, G, scale, and epoch.
     * depositor's snapshot is updated only when they
     * deposit or withdraw from stability pool
     * depositSnapshots are used to allocate PREON rewards, calculate compoundedSTARDepositAmount
     * and to calculate how much Collateral amount the depositor is entitled to
     */
    mapping(address => Snapshots) public depositSnapshots; // depositor address -> snapshots struct

    /*  Product 'P': Running product by which to multiply an initial deposit, in order to find the current compounded deposit,
     * after a series of liquidations have occurred, each of which cancel some STAR debt with the deposit.
     *
     * During its lifetime, a deposit's value evolves from d_t to d_t * P / P_t , where P_t
     * is the snapshot of P taken at the instant the deposit was made. 18-digit decimal.
     */
    uint256 public P;

    uint256 public constant SCALE_FACTOR = 1e9;

    // Each time the scale of P shifts by SCALE_FACTOR, the scale is incremented by 1
    uint128 public currentScale;

    // With each offset that fully empties the Pool, the epoch is incremented by 1
    uint128 public currentEpoch;

    /* Collateral amount Gain sum 'S': During its lifetime, each deposit d_t earns an Collateral amount gain of ( d_t * [S - S_t] )/P_t,
     * where S_t is the depositor's snapshot of S taken at the time t when the deposit was made.
     *
     * The 'S' sums are stored in a nested mapping (epoch => scale => sum):
     *
     * - The inner mapping records the (scale => sum)
     * - The middle mapping records (epoch => (scale => sum))
     * - The outer mapping records (collateralType => (epoch => (scale => sum)))
     */
    mapping(address => mapping(uint128 => mapping(uint128 => uint256)))
        public epochToScaleToSum;

    /*
     * Similarly, the sum 'G' is used to calculate PREON gains. During it's lifetime, each deposit d_t earns a PREON gain of
     *  ( d_t * [G - G_t] )/P_t, where G_t is the depositor's snapshot of G taken at time t when  the deposit was made.
     *
     *  PREON reward events occur are triggered by depositor operations (new deposit, topup, withdrawal), and liquidations.
     *  In each case, the PREON reward is issued (i.e. G is updated), before other state changes are made.
     */
    mapping(uint128 => mapping(uint128 => uint256)) public epochToScaleToG;

    // Error tracker for the error correction in the PREON issuance calculation
    uint256 public lastPREONError;
    // Error trackers for the error correction in the offset calculation
    uint256[] public lastAssetError_Offset;
    uint256 public lastSTARLossError_Offset;

    // --- Events ---

    event StabilityPoolBalanceUpdated(address[] assets, uint256[] amounts);
    event StabilityPoolBalancesUpdated(address[] assets, uint256[] amounts);
    // event StabilityPoolSTARBalanceUpdated(uint256 _newBalance);

    // event P_Updated(uint256 _P);
    event S_Updated(address _asset, uint256 _S, uint128 _epoch, uint128 _scale);
    // event G_Updated(uint256 _G, uint128 _epoch, uint128 _scale);
    // event EpochUpdated(uint128 _currentEpoch);
    // event ScaleUpdated(uint128 _currentScale);

    event DepositSnapshotUpdated(
        address indexed _depositor,
        uint256 _P,
        uint256 _G
    );
    // event UserDepositChanged(address indexed _depositor, uint256 _newDeposit);

    event GainsWithdrawn(
        address indexed _depositor,
        address[] _collaterals,
        uint256[] _amounts,
        uint256 _STARLoss
    );
    // event PREONPaidToDepositor(address indexed _depositor, uint256 _PREON);
    event CollateralSent(
        address _to,
        address[] _collaterals,
        uint256[] _amounts
    );

    // --- Contract setters ---
    bool private addressSet;

    function setAddresses(
        address _borrowerOperationsAddress,
        address _troveManagerAddress,
        address _activePoolAddress,
        address _starTokenAddress,
        address _sortedTrovesAddress,
        address _communityIssuanceAddress,
        address _controllerAddress,
        address _troveManagerLiquidationsAddress
    ) external override {
        require(addressSet == false, "Addresses already set");
        addressSet = true;
        // __ReentrancyGuard_init();

        borrowerOperations = IBorrowerOperations(_borrowerOperationsAddress);
        troveManager = ITroveManager(_troveManagerAddress);
        activePool = IActivePool(_activePoolAddress);
        starToken = ISTARToken(_starTokenAddress);
        sortedTroves = ISortedTroves(_sortedTrovesAddress);
        communityIssuance = ICommunityIssuance(_communityIssuanceAddress);
        controller = IPreonController(_controllerAddress);
        P = DECIMAL_PRECISION;
        troveManagerLiquidationsAddress = _troveManagerLiquidationsAddress;
    }

    // --- Getters for public variables. Required by IPool interface ---

    /**
     * @notice Get total VC value of collateral in SP
     * @dev calls getVCColls which handles everything
     * @return VC of collateral in stability pool
     */
    function getVC() external view override returns (uint256) {
        return _getVCColls(totalColl);
    }

    /**
     * @notice get collateral balance in the SP for a given collateral type
     * @dev Not necessarily this contract's actual collateral balance;
     * just what is stored in state
     * @param _collateral address of the collateral to get amount of
     * @return amount of this specific collateral
     */
    function getCollateral(address _collateral)
        external
        view
        override
        returns (uint256)
    {
        uint256 collateralIndex = controller.getIndex(_collateral);
        return totalColl.amounts[collateralIndex];
    }

    /**
     * @notice getter function
     * @dev gets collateral from totalColl
     * This is not necessarily the contract's actual collateral balance;
     * just what is stored in state
     * @return tokens and amounts
     */
    function getAllCollateral()
        external
        view
        override
        returns (address[] memory, uint256[] memory)
    {
        return (totalColl.tokens, totalColl.amounts);
    }

    /**
     * @notice getter function
     * @dev gets total star from deposits
     * @return totalSTARDeposits
     */
    function getTotalSTARDeposits() external view override returns (uint256) {
        return totalSTARDeposits;
    }

    // --- External Depositor Functions ---

    /**
     * @notice Used to provide STAR to a stability Pool
     * @dev Sends depositor's accumulated gains (collateral assets) to depositor
     * - Increases deposit stake, and takes new snapshots for each.
     * @param _amount amount of asset provided
     */
    function provideToSP(uint256 _amount) external override nonReentrant {
        _requireNonZeroAmount(_amount);

        uint256 initialDeposit = deposits[msg.sender];

        // ICommunityIssuance communityIssuanceCached = communityIssuance;

        // _triggerPREONIssuance(communityIssuanceCached);

        (address[] memory assets, uint256[] memory amounts) = getDepositorGains(
            msg.sender
        );
        uint256 compoundedSTARDeposit = getCompoundedSTARDeposit(msg.sender);
        uint256 STARLoss = initialDeposit.sub(compoundedSTARDeposit); // Needed only for event log

        // // First pay out any PREON gains
        // _payOutPREONGains(communityIssuanceCached, msg.sender);

        // just pulls STAR into the pool, updates totalSTARDeposits variable for the stability pool
        // and throws an event
        _sendSTARtoStabilityPool(msg.sender, _amount);

        uint256 newDeposit = compoundedSTARDeposit.add(_amount);
        _updateDepositAndSnapshots(msg.sender, newDeposit);
        emit UserDepositChanged(msg.sender, newDeposit);

        emit GainsWithdrawn(msg.sender, assets, amounts, STARLoss); // STAR Loss required for event log

        // send any collateral gains accrued to the depositor
        _sendGainsToDepositor(msg.sender, assets, amounts);
    }

    /**
     * @notice withdraw your position from a stability Pool
     * @dev Sends all depositor's accumulated gains (collateral assets) to depositor
     * - Decreases deposit and takes new snapshots.
     *
     * If _amount > userDeposit, the user withdraws all of their compounded deposit.
     * Users can execute a withdrawal with _amount = 0 to simply acquire
     * any pending Collateral Gains from your SP deposit.
     * @param _amount Amount to withdraw
     */
    function withdrawFromSP(uint256 _amount) external override nonReentrant {
        (address[] memory assets, uint256[] memory amounts) = _withdrawFromSP(
            _amount
        );
        _sendGainsToDepositor(msg.sender, assets, amounts);
    }

    /**
     * @notice withdraw from a stability pool
     * @dev see withdrawFromSPAndSwap
     * @param _amount amount to withdraw
     * @return assets , amounts address of assets withdrawn, amount of asset withdrawn
     */
    function _withdrawFromSP(uint256 _amount)
        internal
        returns (address[] memory assets, uint256[] memory amounts)
    {
        if (_amount != 0) {
            _requireNoUnderCollateralizedTroves();
        }
        uint256 initialDeposit = deposits[msg.sender];
        _requireUserHasDeposit(initialDeposit);

        // ICommunityIssuance communityIssuanceCached = communityIssuance;

        // _triggerPREONIssuance(communityIssuanceCached);

        (assets, amounts) = getDepositorGains(msg.sender);

        uint256 compoundedSTARDeposit = getCompoundedSTARDeposit(msg.sender);

        uint256 STARtoWithdraw = PreonMath._min(_amount, compoundedSTARDeposit);
        uint256 STARLoss = initialDeposit.sub(compoundedSTARDeposit); // Needed only for event log

        // // First pay out any PREON gains
        // _payOutPREONGains(communityIssuanceCached, msg.sender);

        _sendSTARToDepositor(msg.sender, STARtoWithdraw);

        // Update deposit
        uint256 newDeposit = compoundedSTARDeposit.sub(STARtoWithdraw);
        _updateDepositAndSnapshots(msg.sender, newDeposit);
        emit UserDepositChanged(msg.sender, newDeposit);

        emit GainsWithdrawn(msg.sender, assets, amounts, STARLoss); // STAR Loss required for event log
    }

    /**
     * @notice Claim rewards and swap to STAR.
     * @dev Sends all depositor's accumulated gains (collateral assets) to depositor
     * - For these collateral asset rewards, they are first swapped to STAR first
     *   and then sent back to the user
     * @param _starMinAmountTotal STAR min amount from all swaps to receive
     */
    function claimRewardsSwap(uint256 _starMinAmountTotal)
        external
        override
        nonReentrant
        returns (uint256 amountFromSwap)
    {
        // issues PREON and gets asset rewards for the msg.sender's SP deposit
        (address[] memory assets, uint256[] memory amounts) = _withdrawFromSP(
            0
        );
        // swaps all collateral rewards to STAR and sends back to msg.sender
        amountFromSwap = _sendGainsToDepositorSwap(assets, amounts);
        require(
            amountFromSwap >= _starMinAmountTotal,
            "SP:Insufficient STAR Transferred"
        );
    }

    // // --- PREON issuance functions ---
    // /**
    //  * @notice triggers Preon issuance
    //  * @dev Updates G and issues Preon
    //  * @param _communityIssuance is the contract to issue Preon
    //  */
    // function _triggerPREONIssuance(ICommunityIssuance _communityIssuance)
    //     internal
    // {
    //     uint256 PREONIssuance = _communityIssuance.issuePREON();
    //     _updateG(PREONIssuance);
    // }

    // /**
    //  * @notice Updates for preon issuance
    //  * @dev When total deposits is 0, G is not updated. In this case, the PREON issued can not be obtained by later
    //  * depositors - it is missed out on, and remains in the balanceof the CommunityIssuance contract.
    //  * @param _PREONIssuance amount of preon to issue
    //  */
    // function _updateG(uint256 _PREONIssuance) internal {
    //     uint256 totalSTAR = totalSTARDeposits; // cached to save an SLOAD
    //     if (totalSTAR == 0 || _PREONIssuance == 0) {
    //         return;
    //     }

    //     uint256 PREONPerUnitStaked = _computePREONPerUnitStaked(
    //         _PREONIssuance,
    //         totalSTAR
    //     );

    //     uint256 marginalPREONGain = PREONPerUnitStaked.mul(P);
    //     epochToScaleToG[currentEpoch][currentScale] = epochToScaleToG[
    //         currentEpoch
    //     ][currentScale].add(marginalPREONGain);

    //     emit G_Updated(
    //         epochToScaleToG[currentEpoch][currentScale],
    //         currentEpoch,
    //         currentScale
    //     );
    // }

    /**
     * @notice computePREONPerUnitStaked
     * @dev Calculate the PREON-per-unit staked.  Division uses a "feedback" error correction, to keep the
     * cumulative error low in the running total G:
     *
     * 1) Form a numerator which compensates for the floor division error that occurred the last time this
     * function was called.
     * 2) Calculate "per-unit-staked" ratio.
     * 3) Multiply the ratio back by its denominator, to reveal the current floor division error.
     * 4) Store this error for use in the next correction when this function is called.
     * 5) Note: static analysis tools complain about this "division before multiplication", however, it is intended.
     * @param _PREONIssuance amount of preon to issue
     * @param _totalSTARDeposits Amount of STAR to deposit
     * @return Preon per unit staked
     */
    // function _computePREONPerUnitStaked(
    //     uint256 _PREONIssuance,
    //     uint256 _totalSTARDeposits
    // ) internal returns (uint256) {
    //     uint256 PREONNumerator = _PREONIssuance.mul(DECIMAL_PRECISION).add(
    //         lastPREONError
    //     );

    //     uint256 PREONPerUnitStaked = PREONNumerator.div(_totalSTARDeposits);
    //     lastPREONError = PREONNumerator.sub(
    //         PREONPerUnitStaked.mul(_totalSTARDeposits)
    //     );

    //     return PREONPerUnitStaked;
    // }

    // --- Liquidation functions ---

    /**
     * @notice sets the offset for liquidation
     * @dev Cancels out the specified debt against the STAR contained in the Stability Pool (as far as possible)
     * and transfers the Trove's collateral from ActivePool to StabilityPool.
     * Only called by liquidation functions in the TroveManager.
     * @param _debtToOffset how much debt to offset
     * @param _tokens array of token addresses
     * @param _amountsAdded array of amounts as uint256
     */
    function offset(
        uint256 _debtToOffset,
        address[] memory _tokens,
        uint256[] memory _amountsAdded
    ) external override {
        _requireCallerIsTML();
        uint256 totalSTAR = totalSTARDeposits; // cached to save an SLOAD
        if (totalSTAR == 0 || _debtToOffset == 0) {
            return;
        }

        // _triggerPREONIssuance(communityIssuance);

        (
            uint256[] memory AssetGainPerUnitStaked,
            uint256 STARLossPerUnitStaked
        ) = _computeRewardsPerUnitStaked(
                _tokens,
                _amountsAdded,
                _debtToOffset,
                totalSTAR
            );

        _updateRewardSumAndProduct(
            _tokens,
            AssetGainPerUnitStaked,
            STARLossPerUnitStaked
        ); // updates S and P
        _moveOffsetCollAndDebt(_tokens, _amountsAdded, _debtToOffset);
    }

    // --- Offset helper functions ---

    /**
     * @notice Compute the STAR and Collateral amount rewards. Uses a "feedback" error correction, to keep
     * the cumulative error in the P and S state variables low:
     *
     * @dev 1) Form numerators which compensate for the floor division errors that occurred the last time this
     * function was called.
     * 2) Calculate "per-unit-staked" ratios.
     * 3) Multiply each ratio back by its denominator, to reveal the current floor division error.
     * 4) Store these errors for use in the next correction when this function is called.
     * 5) Note: static analysis tools complain about this "division before multiplication", however, it is intended.
     * @param _tokens Address of tokens
     * @param _amountsAdded array of amounts as uint256
     * @param _debtToOffset amount of debt to offset
     * @param _totalSTARDeposits How much user has deposited
     */
    function _computeRewardsPerUnitStaked(
        address[] memory _tokens,
        uint256[] memory _amountsAdded,
        uint256 _debtToOffset,
        uint256 _totalSTARDeposits
    )
        internal
        returns (
            uint256[] memory AssetGainPerUnitStaked,
            uint256 STARLossPerUnitStaked
        )
    {
        uint256 amountsLen = _amountsAdded.length;
        uint256[] memory CollateralNumerators = new uint256[](amountsLen);
        uint256 currentP = P;

        uint256[] memory indices = controller.getIndices(_tokens);
        for (uint256 i; i < amountsLen; ++i) {
            CollateralNumerators[i] = _amountsAdded[i]
                .mul(DECIMAL_PRECISION)
                .add(lastAssetError_Offset[indices[i]]);
        }

        require(
            _debtToOffset <= _totalSTARDeposits,
            "SP:This debt less than totalSTAR"
        );
        if (_debtToOffset == _totalSTARDeposits) {
            STARLossPerUnitStaked = DECIMAL_PRECISION; // When the Pool depletes to 0, so does each deposit
            lastSTARLossError_Offset = 0;
        } else {
            uint256 STARLossNumerator = _debtToOffset
                .mul(DECIMAL_PRECISION)
                .sub(lastSTARLossError_Offset);
            /*
             * Add 1 to make error in quotient positive. We want "slightly too much" STAR loss,
             * which ensures the error in any given compoundedSTARDeposit favors the Stability Pool.
             */
            STARLossPerUnitStaked = (STARLossNumerator.div(_totalSTARDeposits))
                .add(1);
            lastSTARLossError_Offset = (
                STARLossPerUnitStaked.mul(_totalSTARDeposits)
            ).sub(STARLossNumerator);
        }

        AssetGainPerUnitStaked = new uint256[](_amountsAdded.length);
        for (uint256 i; i < amountsLen; ++i) {
            AssetGainPerUnitStaked[i] = CollateralNumerators[i]
                .mul(currentP)
                .div(_totalSTARDeposits);
        }

        for (uint256 i; i < amountsLen; ++i) {
            lastAssetError_Offset[indices[i]] = CollateralNumerators[i].sub(
                AssetGainPerUnitStaked[i].mul(_totalSTARDeposits).div(currentP)
            );
        }
    }

    /**
     * @notice Update the Stability Pool reward sum S and product P
     * @dev The newProductFactor is the factor by which to change all deposits
     * due to the depletion of Stability Pool STAR in the liquidation.
     * We make the product factor 0 if there was a pool-emptying. Otherwise, it is (1 - STARLossPerUnitStaked)
     * @param _assets array of addresses
     * @param _AssetGainPerUnitStaked array of uint256 gains per staked STAR
     * @param _STARLossPerUnitStaked amount of loss per unit
     */
    function _updateRewardSumAndProduct(
        address[] memory _assets,
        uint256[] memory _AssetGainPerUnitStaked,
        uint256 _STARLossPerUnitStaked
    ) internal {
        uint256 currentP = P;
        uint256 newP;

        require(
            _STARLossPerUnitStaked <= DECIMAL_PRECISION,
            "SP: STARLoss < 1"
        );
        /*
         *
         */
        uint256 newProductFactor = uint256(DECIMAL_PRECISION).sub(
            _STARLossPerUnitStaked
        );

        uint128 currentScaleCached = currentScale;
        uint128 currentEpochCached = currentEpoch;

        /*
         * Calculate the new S first, before we update P.
         * The Collateral amount gain for any given depositor from a liquidation depends on the value of their deposit
         * (and the value of totalDeposits) prior to the Stability being depleted by the debt in the liquidation.
         *
         * Since S corresponds to Collateral amount gain, and P to deposit loss, we update S first.
         */
        uint256 assetsLen = _assets.length;
        for (uint256 i; i < assetsLen; ++i) {
            address asset = _assets[i];

            uint256 currentAssetS = epochToScaleToSum[asset][
                currentEpochCached
            ][currentScaleCached];
            uint256 newAssetS = currentAssetS.add(_AssetGainPerUnitStaked[i]);

            epochToScaleToSum[asset][currentEpochCached][
                currentScaleCached
            ] = newAssetS;
            emit S_Updated(
                asset,
                newAssetS,
                currentEpochCached,
                currentScaleCached
            );
        }

        // If the Stability Pool was emptied, increment the epoch, and reset the scale and product P
        if (newProductFactor == 0) {
            currentEpoch = currentEpochCached.add(1);
            emit EpochUpdated(currentEpoch);
            currentScale = 0;
            emit ScaleUpdated(currentScale);
            newP = DECIMAL_PRECISION;

            // If multiplying P by a non-zero product factor would reduce P below the scale boundary, increment the scale
        } else if (
            currentP.mul(newProductFactor).div(DECIMAL_PRECISION) < SCALE_FACTOR
        ) {
            newP = currentP.mul(newProductFactor).mul(SCALE_FACTOR).div(
                DECIMAL_PRECISION
            );
            currentScale = currentScaleCached.add(1);
            emit ScaleUpdated(currentScale);
        } else {
            newP = currentP.mul(newProductFactor).div(DECIMAL_PRECISION);
        }

        require(newP != 0, "SP: P = 0");
        P = newP;
        emit P_Updated(newP);
    }

    /**
     * @notice Internal function to move offset collateral and debt between pools.
     * @dev Cancel the liquidated STAR debt with the STAR in the stability pool,
     * Burn the debt that was successfully offset. Collateral is moved from
     * the ActivePool to this contract.
     * @param _collsToAdd array of addresses
     * @param _amountsToAdd array of uint256
     * @param _debtToOffset uint256
     */
    function _moveOffsetCollAndDebt(
        address[] memory _collsToAdd,
        uint256[] memory _amountsToAdd,
        uint256 _debtToOffset
    ) internal {
        IActivePool activePoolCached = activePool;
        activePoolCached.decreaseSTARDebt(_debtToOffset);
        _decreaseSTAR(_debtToOffset);

        starToken.burn(address(this), _debtToOffset);

        activePoolCached.sendCollaterals(
            address(this),
            _collsToAdd,
            _amountsToAdd
        );
    }

    /**
     * @notice Decreases STAR Stability pool balance.
     * @dev Used on offset and on withdraw; Also throws an event.
     * @param _amount uint256 of STAR to decrease totalSTARDeposits by.
     */
    function _decreaseSTAR(uint256 _amount) internal {
        uint256 newTotalSTARDeposits = totalSTARDeposits.sub(_amount);
        totalSTARDeposits = newTotalSTARDeposits;
        emit StabilityPoolSTARBalanceUpdated(newTotalSTARDeposits);
    }

    // --- Reward calculator functions for depositor ---

    /**
     * @notice Calculates the gains earned by the deposit since its last snapshots were taken.
     * @dev Given by the formula:  E = d0 * (S - S(0))/P(0)
     * where S(0) and P(0) are the depositor's snapshots of the sum S and product P, respectively.
     * d0 is the last recorded deposit value.
     * @param _depositor address of depositor in question
     * @return assets, amounts
     */
    function getDepositorGains(address _depositor)
        public
        view
        override
        returns (address[] memory, uint256[] memory)
    {
        uint256 initialDeposit = deposits[_depositor];

        if (initialDeposit == 0) {
            address[] memory emptyAddress = new address[](0);
            uint256[] memory emptyUint = new uint256[](0);
            return (emptyAddress, emptyUint);
        }

        Snapshots storage snapshots = depositSnapshots[_depositor];

        return _calculateGains(initialDeposit, snapshots);
    }

    /**
     * @notice get gains on each possible asset by looping through
     * @dev assets with _getGainFromSnapshots function
     * @param initialDeposit Amount of initial deposit
     * @param snapshots struct snapshots
     */
    function _calculateGains(
        uint256 initialDeposit,
        Snapshots storage snapshots
    )
        internal
        view
        returns (address[] memory assets, uint256[] memory amounts)
    {
        assets = controller.getValidCollateral();
        uint256 assetsLen = assets.length;
        amounts = new uint256[](assetsLen);
        for (uint256 i; i < assetsLen; ++i) {
            amounts[i] = _getGainFromSnapshots(
                initialDeposit,
                snapshots,
                assets[i]
            );
        }
    }

    /**
     * @notice gets the gain in S for a given asset
     * @dev for a user who deposited initialDeposit
     * @param initialDeposit Amount of initialDeposit
     * @param snapshots struct snapshots
     * @param asset asset to gain snapshot
     * @return uint256 the gain
     */
    function _getGainFromSnapshots(
        uint256 initialDeposit,
        Snapshots storage snapshots,
        address asset
    ) internal view returns (uint256) {
        /*
         * Grab the sum 'S' from the epoch at which the stake was made. The Collateral amount gain may span up to one scale change.
         * If it does, the second portion of the Collateral amount gain is scaled by 1e9.
         * If the gain spans no scale change, the second portion will be 0.
         */
        uint256 S_Snapshot = snapshots.S[asset];
        uint256 P_Snapshot = snapshots.P;

        uint256 firstPortion = epochToScaleToSum[asset][snapshots.epoch][
            snapshots.scale
        ].sub(S_Snapshot);
        uint256 secondPortion = epochToScaleToSum[asset][snapshots.epoch][
            snapshots.scale.add(1)
        ].div(SCALE_FACTOR);

        uint256 assetGain = initialDeposit
            .mul(firstPortion.add(secondPortion))
            .div(P_Snapshot)
            .div(DECIMAL_PRECISION);

        return assetGain;
    }

    /**
     * @notice Calculate the PREON gain earned by a deposit since its last snapshots were taken.
     * @dev Given by the formula:  PREON = d0 * (G - G(0))/P(0)
     * where G(0) and P(0) are the depositor's snapshots of the sum G and product P, respectively.
     * d0 is the last recorded deposit value.
     * @param _depositor Address
     * @return uint256
     */
    function getDepositorPREONGain(address _depositor)
        public
        view
        override
        returns (uint256)
    {
        // uint256 initialDeposit = deposits[_depositor];
        // if (initialDeposit == 0) {
        //     return 0;
        // }
        // Snapshots storage snapshots = depositSnapshots[_depositor];

        // return _getPREONGainFromSnapshots(initialDeposit, snapshots);
        return 0;
    }

    /**
     * @notice Grab the sum 'G' from the epoch at which the stake was made. The PREON gain may span up to one scale change.
     * @dev If it does, the second portion of the PREON gain is scaled by 1e9.
     * If the gain spans no scale change, the second portion will be 0.
     * @param initialStake uint256
     * @param snapshots struct Snapshots
     * @return uint256
     */
    // function _getPREONGainFromSnapshots(
    //     uint256 initialStake,
    //     Snapshots storage snapshots
    // ) internal view returns (uint256) {
    //     uint128 epochSnapshot = snapshots.epoch;
    //     uint128 scaleSnapshot = snapshots.scale;
    //     uint256 G_Snapshot = snapshots.G;
    //     uint256 P_Snapshot = snapshots.P;

    //     uint256 firstPortion = epochToScaleToG[epochSnapshot][scaleSnapshot]
    //         .sub(G_Snapshot);
    //     uint256 secondPortion = epochToScaleToG[epochSnapshot][
    //         scaleSnapshot.add(1)
    //     ].div(SCALE_FACTOR);

    //     uint256 PREONGain = initialStake
    //         .mul(firstPortion.add(secondPortion))
    //         .div(P_Snapshot)
    //         .div(DECIMAL_PRECISION);

    //     return PREONGain;
    // }

    // --- Compounded deposit stake ---

    /**
     * @notice Return the user's compounded deposit. Given by the formula:  d = d0 * P/P(0)
     * where P(0) is the depositor's snapshot of the product P, taken when they last updated their deposit.
     * @dev see notice
     * @param _depositor address
     * @return uint256
     */
    function getCompoundedSTARDeposit(address _depositor)
        public
        view
        override
        returns (uint256)
    {
        uint256 initialDeposit = deposits[_depositor];
        if (initialDeposit == 0) {
            return 0;
        }

        Snapshots storage snapshots = depositSnapshots[_depositor];

        uint256 compoundedDeposit = _getCompoundedStakeFromSnapshots(
            initialDeposit,
            snapshots
        );
        return compoundedDeposit;
    }

    /**
     * @notice Internal function, used to calculate compounded deposit stakes.
     * @dev returns 0 if the snapshots were taken prior to a a pool-emptying event
     * also returns zero if scaleDiff (currentScale.sub(scaleSnapshot)) is more than 2 or
     * If the scaleDiff is 0 or 1,
     * then adjust for changes in P and scale changes to calculate a compoundedStake.
     * IF the final compoundedStake isn't less than a billionth of the initial stake, return it.this
     * otherwise, just return 0.
     * @param initialStake uint256
     * @param snapshots Struct snapshots
     * @return uint256
     */
    function _getCompoundedStakeFromSnapshots(
        uint256 initialStake,
        Snapshots storage snapshots
    ) internal view returns (uint256) {
        uint256 snapshot_P = snapshots.P;
        uint128 scaleSnapshot = snapshots.scale;
        uint128 epochSnapshot = snapshots.epoch;

        // If stake was made before a pool-emptying event, then it has been fully cancelled with debt -- so, return 0
        if (epochSnapshot < currentEpoch) {
            return 0;
        }

        uint256 compoundedStake;
        uint128 scaleDiff = currentScale.sub(scaleSnapshot);

        /* Compute the compounded stake. If a scale change in P was made during the stake's lifetime,
         * account for it. If more than one scale change was made, then the stake has decreased by a factor of
         * at least 1e-9 -- so return 0.
         */
        if (scaleDiff == 0) {
            compoundedStake = initialStake.mul(P).div(snapshot_P);
        } else if (scaleDiff == 1) {
            compoundedStake = initialStake.mul(P).div(snapshot_P).div(
                SCALE_FACTOR
            );
        } else {
            // if scaleDiff >= 2
            compoundedStake = 0;
        }

        /*
         * If compounded deposit is less than a billionth of the initial deposit, return 0.
         *
         * NOTE: originally, this line was in place to stop rounding errors making the deposit too large. However, the error
         * corrections should ensure the error in P "favors the Pool", i.e. any given compounded deposit should slightly less
         * than it's theoretical value.
         *
         * Thus it's unclear whether this line is still really needed.
         */
        if (compoundedStake < initialStake.div(1e9)) {
            return 0;
        }

        return compoundedStake;
    }

    // --- Sender functions for STAR deposit, Collateral gains and PREON gains ---

    /**
     * @notice Transfer the STAR tokens from the user to the Stability Pool's address, and update its recorded STAR
     * @dev see notice
     * @param _address Sender of STAR
     * @param _amount uint256
     */
    function _sendSTARtoStabilityPool(address _address, uint256 _amount)
        internal
    {
        starToken.sendToPool(_address, address(this), _amount);
        uint256 newTotalSTARDeposits = totalSTARDeposits.add(_amount);
        totalSTARDeposits = newTotalSTARDeposits;
        emit StabilityPoolSTARBalanceUpdated(newTotalSTARDeposits);
    }

    /**
     * @notice transfer collateral gains to the depositor
     * @dev this function also unwraps wrapped assets
     * before sending to depositor
     * @param _to address
     * @param assets array of address
     * @param amounts array of uint256
     */
    function _sendGainsToDepositor(
        address _to,
        address[] memory assets,
        uint256[] memory amounts
    ) internal {
        uint256 assetsLen = assets.length;
        require(assetsLen == amounts.length, "SP:Length mismatch");
        IPreonController controllerCached = controller;
        for (uint256 i; i < assetsLen; ++i) {
            uint256 amount = amounts[i];
            if (amount == 0) {
                continue;
            }
            address asset = assets[i];
            if (controllerCached.isWrapped(asset)) {
                // Unwraps wrapped tokens and sends back underlying tokens to depositor
                // for vault tokens, _amounts[i] is in terms of the vault token, and
                // the user will receive back the underlying based on the current exchange rate
                IPreonVaultToken(asset).redeem(_to, amount);
            } else {
                IERC20(asset).safeTransfer(_to, amount);
            }
        }
        totalColl.amounts = _leftSubColls(totalColl, assets, amounts);
    }

    /**
     * @notice Sends gains to depositor after swapping to STAR.
     * @dev Intended for SP withdraw and swap function, to use default router to perform swap and withdraw.
     * @param assets array of address
     * @param amounts array of uint256
     */
    function _sendGainsToDepositorSwap(
        address[] memory assets,
        uint256[] memory amounts
    ) internal returns (uint256 totalSTAR) {
        uint256 assetsLen = assets.length;
        require(assetsLen == amounts.length, "SP:Length mismatch");
        ISTARToken starTokenCached = starToken;
        uint256 balanceBefore = starTokenCached.balanceOf(msg.sender);
        for (uint256 i; i < assetsLen; ++i) {
            uint256 amount = amounts[i];
            if (amount == 0) {
                continue;
            }
            address asset = assets[i];
            address router = controller.getDefaultRouterAddress(asset);
            // Whether or not it is wrapped, the router will handle the potential unwrapping. The
            // Final unwrapped token will be sent back to this contract to handle that situation.
            IERC20(asset).safeTransfer(router, amount);
            totalSTAR = totalSTAR.add(
                IPreonLever(router).unRoute(
                    msg.sender,
                    asset,
                    address(starTokenCached),
                    amount,
                    1
                )
            );
        }
        require(
            starTokenCached.balanceOf(msg.sender) ==
                balanceBefore.add(totalSTAR),
            "SP:unRoute Failed"
        );
        totalColl.amounts = _leftSubColls(totalColl, assets, amounts);
    }

    /**
     * @notice Send STAR to user and decrease STAR in Pool
     * @dev see notice
     * @param _depositor address
     * @param STARWithdrawal uint256
     */
    function _sendSTARToDepositor(address _depositor, uint256 STARWithdrawal)
        internal
    {
        if (STARWithdrawal == 0) {
            return;
        }

        starToken.returnFromPool(address(this), _depositor, STARWithdrawal);
        _decreaseSTAR(STARWithdrawal);
    }

    // --- Stability Pool Deposit Functionality ---

    /**
     * @notice updates deposit and snapshots internally
     * @dev if _newValue is zero, delete snapshot for given _depositor and emit event
     * otherwise, add an entry or update existing entry for _depositor in the depositSnapshots
     * with current values for P, S, G, scale and epoch and then emit event.
     * @param _depositor address
     * @param _newValue uint256
     */
    function _updateDepositAndSnapshots(address _depositor, uint256 _newValue)
        internal
    {
        deposits[_depositor] = _newValue;

        if (_newValue == 0) {
            address[] memory colls = controller.getValidCollateral();
            uint256 collsLen = colls.length;
            for (uint256 i; i < collsLen; ++i) {
                depositSnapshots[_depositor].S[colls[i]] = 0;
            }
            depositSnapshots[_depositor].P = 0;
            depositSnapshots[_depositor].G = 0;
            depositSnapshots[_depositor].epoch = 0;
            depositSnapshots[_depositor].scale = 0;
            emit DepositSnapshotUpdated(_depositor, 0, 0);
            return;
        }
        uint128 currentScaleCached = currentScale;
        uint128 currentEpochCached = currentEpoch;
        uint256 currentP = P;

        address[] memory allColls = controller.getValidCollateral();

        // Get S and G for the current epoch and current scale
        uint256 allCollsLen = allColls.length;
        for (uint256 i; i < allCollsLen; ++i) {
            address token = allColls[i];
            uint256 currentSForToken = epochToScaleToSum[token][
                currentEpochCached
            ][currentScaleCached];
            depositSnapshots[_depositor].S[token] = currentSForToken;
        }

        uint256 currentG = epochToScaleToG[currentEpochCached][
            currentScaleCached
        ];

        // Record new snapshots of the latest running product P, sum S, and sum G, for the depositor
        depositSnapshots[_depositor].P = currentP;
        depositSnapshots[_depositor].G = currentG;
        depositSnapshots[_depositor].scale = currentScaleCached;
        depositSnapshots[_depositor].epoch = currentEpochCached;

        emit DepositSnapshotUpdated(_depositor, currentP, currentG);
    }

    /**
     * @notice pays preon gains out to depositors
     * @dev see notice
     * @param _communityIssuance Interface
     * @param _depositor address
     */
    // function _payOutPREONGains(
    //     ICommunityIssuance _communityIssuance,
    //     address _depositor
    // ) internal {
    //     // Pay out depositor's PREON gain
    //     uint256 depositorPREONGain = getDepositorPREONGain(_depositor);
    //     _communityIssuance.sendPREON(_depositor, depositorPREONGain);
    //     emit PREONPaidToDepositor(_depositor, depositorPREONGain);
    // }

    // --- 'require' functions ---
    /**
     * @notice check ICR of bottom trove in SortedTroves
     * as well as the under-collateralized troves list
     */
    function _requireNoUnderCollateralizedTroves() internal view {
        ISortedTroves sortedTrovesCached = sortedTroves;
        address lowestTrove = sortedTrovesCached.getLast();
        uint256 ICR = troveManager.getCurrentICR(lowestTrove);
        require(
            ICR >= MCR &&
                sortedTrovesCached.getUnderCollateralizedTrovesSize() == 0,
            "SP: No Withdraw when there are under-collateralized troves"
        );
    }

    /**
     * @notice require nonzero deposit
     * @dev could be a modifier
     * @param _initialDeposit uint256
     */
    function _requireUserHasDeposit(uint256 _initialDeposit) internal pure {
        require(_initialDeposit != 0, "SP: require nonzero deposit");
    }

    /**
     * @notice make sure amount is nonzero
     * @dev see notice
     * @param _amount make sure amount is nonzero
     */
    function _requireNonZeroAmount(uint256 _amount) internal pure {
        require(_amount != 0, "SP: Amount must be non-zero");
    }

    /**
     * @notice Make sure caller is ActivePool
     * @dev see notice
     */
    function _requireCallerIsActivePool() internal view {
        if (msg.sender != address(activePool)) {
            _revertWrongFuncCaller();
        }
    }

    /**
     * @notice Make sure msg.sender is TroveManagerLiquidations Contract
     * @dev see notice
     */
    function _requireCallerIsTML() internal view {
        if (msg.sender != address(troveManagerLiquidationsAddress)) {
            _revertWrongFuncCaller();
        }
    }

    /**
     * @notice Should be called by ActivePool
     * @dev __after__ collateral is transferred to this contract from Active Pool
     * @param _tokens array of addresses
     * @param _amounts array of amounts
     */
    function receiveCollateral(
        address[] memory _tokens,
        uint256[] memory _amounts
    ) external override {
        _requireCallerIsActivePool();
        totalColl.amounts = _leftSumColls(totalColl, _tokens, _amounts);
        emit StabilityPoolBalancesUpdated(_tokens, _amounts);
    }

    /**
     * @notice add a collateral
     * @dev should be called anytime a collateral is added to controller
     * keeps all arrays the correct length
     * @param _collateral address of collateral to add
     */
    function addCollateralType(address _collateral) external override {
        _requireCallerIsPreonController();
        lastAssetError_Offset.push(0);
        totalColl.tokens.push(_collateral);
        totalColl.amounts.push(0);
    }

    /**
     * @notice get deposit snapshot
     * @dev Gets reward snapshot S for certain collateral and depositor.
     * @param _depositor address of depositor
     * @param _collateral address of collateral
     * @return uint256
     */
    function getDepositSnapshotS(address _depositor, address _collateral)
        external
        view
        override
        returns (uint256)
    {
        return depositSnapshots[_depositor].S[_collateral];
    }

    /**
     * @notice get how much Preon you would earn depositing _amount for _time
     * @dev this calculation is based on the rewardRate from CommunityIssuance
     * @param _amount amount of STAR deposited
     * @param _time time in seconds it is deposited
     * @return uint256
     */
    function getEstimatedPREONPoolRewards(uint _amount, uint _time)
        external
        view
        override
        returns (uint256)
    {
        uint rewardRate = communityIssuance.getRewardRate();
        if (totalSTARDeposits == 0) {
            return rewardRate.mul(_time);
        }
        return rewardRate.mul(_time).mul(_amount).div(totalSTARDeposits);
    }
}
