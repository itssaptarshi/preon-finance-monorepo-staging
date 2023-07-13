// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "./lib/Math.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./Interfaces/IVePREON.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "hardhat/console.sol";

contract vePREONEmissions is Initializable {
    using SafeERC20 for IERC20;

    event CheckpointToken(uint time);

    event Claimed(uint tokenId, uint amount, uint claimEpoch, uint maxEpoch);

    struct ClaimCalculationResult {
        uint toDistribute;
        uint userEpoch;
        uint weekCursor;
        uint maxUserEpoch;
        bool success;
    }

    uint constant WEEK = 7 * 86400;

    uint public startTime;
    uint public timeCursor;
    uint public minLockDurationForReward;
    mapping(uint => uint) public timeCursorOf;
    mapping(uint => uint) public userEpochOf;

    uint public lastTokenTime;
    mapping(address => uint[1000000000000000]) public tokensPerWeek;

    address public votingEscrow;
    address public voter;
    mapping(address => uint) tokenLastBalance;

    uint[1000000000000000] public veSupply;
    address[] public rewardTokens;
    mapping(address => bool) public isRewardToken;

    mapping(address => bool) public depositor;

    mapping(address => uint[1000000000000000]) public tokenEmissionPerWeek;

    uint lastEmissionsTime;

    function initialize(
        address _votingEscrow,
        address[] memory _tokens
    ) public initializer {
        uint _t = (block.timestamp / WEEK) * WEEK;
        startTime = _t;
        lastTokenTime = _t;
        timeCursor = _t;
        for (uint i = 0; i < _tokens.length; i++) {
            isRewardToken[_tokens[i]] = true;
            rewardTokens.push(_tokens[i]);
            IERC20(_tokens[i]).safeIncreaseAllowance(
                _votingEscrow,
                type(uint).max
            );
        }
        votingEscrow = _votingEscrow;
        depositor[msg.sender] = true;
    }

    function timestamp() external view returns (uint) {
        return (block.timestamp / WEEK) * WEEK;
    }

    function isDepositor(address _sender) public view returns (bool) {
        return depositor[_sender];
    }

    function _checkpointToken() internal {
        for (uint i = 0; i < rewardTokens.length; i++) {
            uint tokenBalance = IERC20(rewardTokens[i]).balanceOf(
                address(this)
            );
            console.log(
                "@veemissions: token %s, balance: %s",
                rewardTokens[i],
                tokenBalance  / 1e18
            );
            uint toDistribute = tokenBalance -
                tokenLastBalance[rewardTokens[i]];
            console.log("@veemissions: toDistribute", toDistribute / 1e18);
            tokenLastBalance[rewardTokens[i]] = tokenBalance;
            uint t = lastTokenTime;
            uint sinceLast = block.timestamp - t;
            console.log("@veemissions: sinceLastSeconds: %s seconds.", sinceLast);
            lastTokenTime = block.timestamp;
            uint thisWeek = (t / WEEK) * WEEK;
            console.log("@veemissions: this week: %s", thisWeek);
            uint nextWeek = 0;
            for (uint j = 0; j < 20; j++) {
                nextWeek = thisWeek + WEEK;
                if (block.timestamp < nextWeek) {
                    tokensPerWeek[rewardTokens[i]][
                        thisWeek
                    ] += _adjustToDistribute(
                        toDistribute,
                        block.timestamp,
                        t,
                        sinceLast
                    );
                    console.log(
                        "@veemissions: tokensperweek: %s",
                        tokensPerWeek[rewardTokens[i]][thisWeek] / 1e18
                    );
                    break;
                } else {
                    tokensPerWeek[rewardTokens[i]][
                        thisWeek
                    ] += _adjustToDistribute(
                        toDistribute,
                        nextWeek,
                        t,
                        sinceLast
                    );
                }
                t = nextWeek;
                thisWeek = nextWeek;
            }
        }
        console.log("===========================");
        emit CheckpointToken(block.timestamp);
    }

    /// @dev For testing purposes.
    function adjustToDistribute(
        uint toDistribute,
        uint t0,
        uint t1,
        uint sinceLastCall
    ) external pure returns (uint) {
        return _adjustToDistribute(toDistribute, t0, t1, sinceLastCall);
    }

    function _adjustToDistribute(
        uint toDistribute,
        uint t0,
        uint t1,
        uint sinceLast
    ) internal pure returns (uint) {
        if (t0 <= t1 || t0 - t1 == 0 || sinceLast == 0) {
            return toDistribute;
        }
        return (toDistribute * (t0 - t1)) / sinceLast;
    }

    function checkpointToken() external {
        require(isDepositor(msg.sender), "!depositor");
        _checkpointToken();
    }

    function _findTimestampEpoch(
        address ve,
        uint _timestamp
    ) internal view returns (uint) {
        uint _min = 0;
        uint _max = IVePREON(ve).epoch();
        for (uint i = 0; i < 128; i++) {
            if (_min >= _max) break;
            uint _mid = (_min + _max + 2) / 2;
            IVePREON.Point memory pt = IVePREON(ve).pointHistory(_mid);
            if (pt.ts <= _timestamp) {
                _min = _mid;
            } else {
                _max = _mid - 1;
            }
        }
        return _min;
    }

    function findTimestampUserEpoch(
        address ve,
        uint tokenId,
        uint _timestamp,
        uint maxUserEpoch
    ) external view returns (uint) {
        return _findTimestampUserEpoch(ve, tokenId, _timestamp, maxUserEpoch);
    }

    function _findTimestampUserEpoch(
        address ve,
        uint tokenId,
        uint _timestamp,
        uint maxUserEpoch
    ) internal view returns (uint) {
        uint _min = 0;
        uint _max = maxUserEpoch;
        for (uint i = 0; i < 128; i++) {
            if (_min >= _max) break;
            uint _mid = (_min + _max + 2) / 2;
            IVePREON.Point memory pt = IVePREON(ve).userPointHistory(
                tokenId,
                _mid
            );
            if (pt.ts <= _timestamp) {
                _min = _mid;
            } else {
                _max = _mid - 1;
            }
        }
        return _min;
    }

    function veForAt(
        uint _tokenId,
        uint _timestamp
    ) external view returns (uint) {
        address ve = votingEscrow;
        uint maxUserEpoch = IVePREON(ve).userPointEpoch(_tokenId);
        uint epoch = _findTimestampUserEpoch(
            ve,
            _tokenId,
            _timestamp,
            maxUserEpoch
        );
        IVePREON.Point memory pt = IVePREON(ve).userPointHistory(
            _tokenId,
            epoch
        );
        return
            uint(
                int256(
                    Math.positiveInt128(
                        pt.bias -
                            pt.slope *
                            (int128(int256(_timestamp - pt.ts)))
                    )
                )
            );
    }

    function _checkpointTotalSupply() internal {
        address ve = votingEscrow;
        uint t = timeCursor;
        uint roundedTimestamp = (block.timestamp / WEEK) * WEEK;
        IVePREON(ve).checkpoint();

        // assume will be called more frequently than 20 weeks
        for (uint i = 0; i < 20; i++) {
            if (t > roundedTimestamp) {
                break;
            } else {
                uint epoch = _findTimestampEpoch(ve, t);
                IVePREON.Point memory pt = IVePREON(ve).pointHistory(epoch);
                veSupply[t] = _adjustVeSupply(t, pt.ts, pt.bias, pt.slope);
            }
            t += WEEK;
        }
        timeCursor = t;
    }

    function adjustVeSupply(
        uint t,
        uint ptTs,
        int128 ptBias,
        int128 ptSlope
    ) external pure returns (uint) {
        return _adjustVeSupply(t, ptTs, ptBias, ptSlope);
    }

    function _adjustVeSupply(
        uint t,
        uint ptTs,
        int128 ptBias,
        int128 ptSlope
    ) internal pure returns (uint) {
        if (t < ptTs) {
            return 0;
        }
        int128 dt = int128(int256(t - ptTs));
        if (ptBias < ptSlope * dt) {
            return 0;
        }
        return uint(int256(Math.positiveInt128(ptBias - ptSlope * dt)));
    }

    function checkpointTotalSupply() external {
        _checkpointTotalSupply();
    }

    function _claim(
        uint _tokenId,
        address ve,
        uint _lastTokenTime,
        address _token
    ) internal returns (uint) {
        ClaimCalculationResult memory result = _calculateClaim(
            _tokenId,
            ve,
            _lastTokenTime,
            _token
        );
        if (result.success) {
            userEpochOf[_tokenId] = result.userEpoch;
            timeCursorOf[_tokenId] = result.weekCursor;
            emit Claimed(
                _tokenId,
                result.toDistribute,
                result.userEpoch,
                result.maxUserEpoch
            );
        }
        return result.toDistribute;
    }

    function _calculateClaim(
        uint _tokenId,
        address ve,
        uint _lastTokenTime,
        address _token
    ) internal view returns (ClaimCalculationResult memory) {
        uint userEpoch;
        uint toDistribute;
        uint maxUserEpoch = IVePREON(ve).userPointEpoch(_tokenId);
        uint _startTime = startTime;
        console.log("@vePreonEmissions: maxUserEpoch %s, startTime: %s", maxUserEpoch, _startTime);

        if (maxUserEpoch == 0) {
            return ClaimCalculationResult(0, 0, 0, 0, false);
        }

        uint weekCursor = timeCursorOf[_tokenId];

        if (weekCursor == 0) {
            userEpoch = _findTimestampUserEpoch(
                ve,
                _tokenId,
                _startTime,
                maxUserEpoch
            );
        } else {
            userEpoch = userEpochOf[_tokenId];
        }

        if (userEpoch == 0) userEpoch = 1;

        IVePREON.Point memory userPoint = IVePREON(ve).userPointHistory(
            _tokenId,
            userEpoch
        );
        if (weekCursor == 0) {
            weekCursor = ((userPoint.ts + WEEK - 1) / WEEK) * WEEK;
        }
        if (weekCursor >= lastTokenTime) {
            return ClaimCalculationResult(0, 0, 0, 0, false);
        }
        if (weekCursor < _startTime) {
            weekCursor = _startTime;
        }

        IVePREON.Point memory oldUserPoint;
        {
            for (uint i = 0; i < 50; i++) {
                if (weekCursor >= _lastTokenTime) {
                    break;
                }
                if (weekCursor >= userPoint.ts && userEpoch <= maxUserEpoch) {
                    userEpoch += 1;
                    oldUserPoint = userPoint;
                    if (userEpoch > maxUserEpoch) {
                        userPoint = IVePREON.Point(0, 0, 0, 0);
                    } else {
                        userPoint = IVePREON(ve).userPointHistory(
                            _tokenId,
                            userEpoch
                        );
                    }
                } else {
                    int128 dt = int128(int256(weekCursor - oldUserPoint.ts));
                    uint balanceOf = uint(
                        int256(
                            Math.positiveInt128(
                                oldUserPoint.bias - dt * oldUserPoint.slope
                            )
                        )
                    );
                    if (balanceOf == 0 && userEpoch > maxUserEpoch) {
                        break;
                    }
                    toDistribute +=
                        (balanceOf * tokensPerWeek[_token][weekCursor]) /
                        veSupply[weekCursor];
                    console.log("@veemissions: toDistribute: %s, _token: %s", toDistribute, _token);
                    weekCursor += WEEK;
                }
            }
        }
        return
            ClaimCalculationResult(
                toDistribute,
                Math.min(maxUserEpoch, userEpoch - 1),
                weekCursor,
                maxUserEpoch,
                true
            );
    }

    function claimable(
        uint _tokenId,
        address _token
    ) external view returns (uint) {
        uint _lastTokenTime = (lastTokenTime / WEEK) * WEEK;
        ClaimCalculationResult memory result = _calculateClaim(
            _tokenId,
            votingEscrow,
            _lastTokenTime,
            _token
        );
        uint256 tokenBalance = IERC20(_token).balanceOf(address(this));
        console.log(
            "@vePreonEmissions: _token %s balance: %s",
            _token,
            tokenBalance
        );
        console.log(
            "@vePreonEmissions: claimable:",
            _token,
            result.toDistribute
        );

        return result.toDistribute;
    }

    function claim(uint _tokenId, address _token) external returns (uint) {
        if (block.timestamp >= timeCursor) _checkpointTotalSupply();
        uint _lastTokenTime = lastTokenTime;
        _lastTokenTime = (_lastTokenTime / WEEK) * WEEK;
        uint amount = _claim(_tokenId, votingEscrow, _lastTokenTime, _token);
        console.log(
            "@vePreonEmissions: claim: amount %s token %s",
            amount,
            _token
        );
        if (amount != 0) {
            IERC20(_token).safeTransfer(
                IVePREON(votingEscrow).ownerOf(_tokenId),
                amount
            );
            console.log(
                "@vePreonEmissions: claim safeTransfer: amount %s",
                amount
            );
            tokenLastBalance[_token] -= amount;
        }
        return amount;
    }

    function claimMany(
        uint[] memory _tokenIds,
        address _token
    ) external returns (bool) {
        if (block.timestamp >= timeCursor) _checkpointTotalSupply();
        uint _lastTokenTime = lastTokenTime;
        _lastTokenTime = (_lastTokenTime / WEEK) * WEEK;
        address _votingEscrow = votingEscrow;
        uint total = 0;

        for (uint i = 0; i < _tokenIds.length; i++) {
            uint _tokenId = _tokenIds[i];
            if (_tokenId == 0) break;
            uint amount = _claim(
                _tokenId,
                _votingEscrow,
                _lastTokenTime,
                _token
            );
            console.log("vePreonEmissions: claimMany:", _token, amount);
            if (amount != 0) {
                IERC20(_token).safeTransfer(
                    IVePREON(_votingEscrow).ownerOf(_tokenId),
                    amount
                );
                total += amount;
            }
        }
        if (total != 0) {
            tokenLastBalance[_token] -= total;
        }

        return true;
    }

    // Once off event on contract initialize
    function addDepositor(address _depositor) external {
        require(isDepositor(msg.sender), "!depositor");
        depositor[_depositor] = true;
    }

    function removeDepositor(address _depositor) external {
        require(isDepositor(msg.sender), "!depositor");
        delete depositor[_depositor];
    }
}
