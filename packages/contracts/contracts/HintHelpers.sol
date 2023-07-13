// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.2;

import "./Interfaces/ITroveManager.sol";
import "./Interfaces/ISortedTroves.sol";
import "./Interfaces/IPreonController.sol";
import "./Dependencies/LiquityBase.sol";
import "./Dependencies/Ownable.sol";
import "./Dependencies/SafeMath.sol";

/**
 * Hint helpers is a contract for giving approximate insert positions for a trove after
 * an operation, such as partial redemption re-insert, adjust trove, etc.
 */

contract HintHelpers is LiquityBase, Ownable {
    using SafeMath for uint;

    bytes32 public constant NAME = "HintHelpers";

    ISortedTroves internal sortedTroves;
    ITroveManager internal troveManager;

    // --- Events ---

    // --- Dependency setters ---

    function setAddresses(
        address _sortedTrovesAddress,
        address _troveManagerAddress,
        address _controllerAddress
    ) external onlyOwner {
        sortedTroves = ISortedTroves(_sortedTrovesAddress);
        troveManager = ITroveManager(_troveManagerAddress);
        controller = IPreonController(_controllerAddress);

        renounceOwnership();
    }

    // --- Functions ---

    /* getRedemptionHints() - Helper function for finding the right hints to pass to redeemCollateral().
     *
     * It simulates a redemption of `_STARamount` to figure out where the redemption sequence will start and what state the final Trove
     * of the sequence will end up in.
     *
     * Returns three hints:
     *  - `firstRedemptionHint` is the address of the first Trove with AICR >= MCR (i.e. the first Trove that will be redeemed).
     *  - `partialRedemptionHintAICR` is the final AICR of the last Trove of the sequence after being hit by partial redemption,
     *     or zero in case of no partial redemption.
     *  - `truncatedSTARamount` is the maximum amount that can be redeemed out of the the provided `_STARamount`. This can be lower than
     *    `_STARamount` when redeeming the full amount would leave the last Trove of the redemption sequence with less net debt than the
     *    minimum allowed value (i.e. MIN_NET_DEBT).
     *
     * The number of Troves to consider for redemption can be capped by passing a non-zero value as `_maxIterations`, while passing zero
     * will leave it uncapped.
     */

    function getRedemptionHints(uint _STARamount, uint _maxIterations)
        external
        view
        returns (
            address firstRedemptionHint,
            uint partialRedemptionHintAICR,
            uint truncatedSTARamount
        )
    {
        ISortedTroves sortedTrovesCached = sortedTroves;

        uint remainingSTAR = _STARamount;
        address currentTroveuser = sortedTrovesCached.getLast();

        while (
            currentTroveuser != address(0) &&
            sortedTrovesCached.getOldBoostedAICR(currentTroveuser) < MCR
        ) {
            currentTroveuser = sortedTrovesCached.getPrev(currentTroveuser);
        }

        firstRedemptionHint = currentTroveuser;

        if (_maxIterations == 0) {
            _maxIterations = type(uint).max;
        }

        while (
            currentTroveuser != address(0) &&
            remainingSTAR != 0 &&
            _maxIterations-- != 0
        ) {
            uint netSTARDebt = _getNetDebt(
                troveManager.getTroveDebt(currentTroveuser)
            ).add(troveManager.getPendingSTARDebtReward(currentTroveuser));

            if (netSTARDebt > remainingSTAR) {
                // Partial redemption
                if (netSTARDebt > MIN_NET_DEBT) {
                    // MIN NET DEBT = 1800
                    uint maxRedeemableSTAR = PreonMath._min(
                        remainingSTAR,
                        netSTARDebt.sub(MIN_NET_DEBT)
                    );

                    uint newColl = _calculateRVCAfterRedemption(
                        currentTroveuser,
                        maxRedeemableSTAR
                    );
                    uint newDebt = netSTARDebt.sub(maxRedeemableSTAR);

                    uint compositeDebt = _getCompositeDebt(newDebt);
                    partialRedemptionHintAICR = _computeCR(
                        newColl,
                        compositeDebt
                    );

                    remainingSTAR = remainingSTAR.sub(maxRedeemableSTAR);
                }
                break;
            } else {
                // Full redemption in this case
                remainingSTAR = remainingSTAR.sub(netSTARDebt);
            }

            currentTroveuser = sortedTrovesCached.getPrev(currentTroveuser);
        }

        truncatedSTARamount = _STARamount.sub(remainingSTAR);
    }

    // Function for calculating the RVC of a trove after a redemption, since the value is given out proportionally to the
    // USD Value of the collateral. Same function is used in TroveManagerRedemptions for the same purpose.
    function _calculateRVCAfterRedemption(address _borrower, uint _STARAmount)
        internal
        view
        returns (uint newCollRVC)
    {
        newColls memory colls;
        (colls.tokens, colls.amounts, ) = troveManager.getCurrentTroveState(
            _borrower
        );

        uint256[] memory finalAmounts = new uint256[](colls.tokens.length);

        uint totalCollUSD = _getUSDColls(colls);
        uint baseLot = _STARAmount.mul(DECIMAL_PRECISION);

        // redemption addresses are the same as coll addresses for trove
        uint256 tokensLen = colls.tokens.length;
        for (uint256 i; i < tokensLen; ++i) {
            uint tokenAmount = colls.amounts[i];
            uint tokenAmountToRedeem = baseLot
                .mul(tokenAmount)
                .div(totalCollUSD)
                .div(DECIMAL_PRECISION);
            finalAmounts[i] = tokenAmount.sub(tokenAmountToRedeem);
        }

        newCollRVC = _getRVC(colls.tokens, finalAmounts);
    }

    /* getApproxHint() - return address of a Trove that is, on average, (length / numTrials) positions away in the 
    sortedTroves list from the correct insert position of the Trove to be inserted. 
    
    Note: The output address is worst-case O(n) positions away from the correct insert position, however, the function 
    is probabilistic. Input can be tuned to guarantee results to a high degree of confidence, e.g:

    Submitting numTrials = k * sqrt(length), with k = 15 makes it very, very likely that the ouput address will 
    be <= sqrt(length) positions away from the correct insert position.
    */
    function getApproxHint(
        uint _CR,
        uint _numTrials,
        uint _inputRandomSeed
    )
        external
        view
        returns (
            address hintAddress,
            uint diff,
            uint latestRandomSeed
        )
    {
        uint arrayLength = troveManager.getTroveOwnersCount();

        if (arrayLength == 0) {
            return (address(0), 0, _inputRandomSeed);
        }

        hintAddress = sortedTroves.getLast();
        diff = PreonMath._getAbsoluteDifference(
            _CR,
            sortedTroves.getOldBoostedAICR(hintAddress)
        );
        latestRandomSeed = _inputRandomSeed;

        uint i = 1;

        while (i < _numTrials) {
            latestRandomSeed = uint(
                keccak256(abi.encodePacked(latestRandomSeed))
            );

            uint arrayIndex = latestRandomSeed % arrayLength;
            address currentAddress = troveManager.getTroveFromTroveOwnersArray(
                arrayIndex
            );
            uint currentAICR = sortedTroves.getOldBoostedAICR(currentAddress);

            // check if abs(current - CR) > abs(closest - CR), and update closest if current is closer
            uint currentDiff = PreonMath._getAbsoluteDifference(
                currentAICR,
                _CR
            );

            if (currentDiff < diff) {
                diff = currentDiff;
                hintAddress = currentAddress;
            }
            ++i;
        }
    }
}
