### Core Contracts & Init Functions

`$YETI`

```constructor(
    address _sYETIAddress,
    address _treasuryAddress,
    address _teamAddress )
```

---

`SortedTroves`

```
    setParams(
        uint256 _size,
        address _troveManagerAddress,
        address _borrowerOperationsAddress,
        address _troveManagerRedemptionsAddress,
        address _yetiControllerAddress
    )
```

---

`$veYETI`

```
    setup(
        IERC20 _yeti,
        address _yetiController,
        uint256 _accumulationRate )
```

---

`$YUSD`

```
    constructor(
        address _troveManagerAddress,
        address _troveManagerLiquidationsAddress,
        address _troveManagerRedemptionsAddress,
        address _stabilityPoolAddress,
        address _borrowerOperationsAddress,
        address _controllerAddress )
```

---

`BorrowerOperations`

```
    setAddresses(
        address _troveManagerAddress,
        address _activePoolAddress,
        address _defaultPoolAddress,
        address _gasPoolAddress,
        address _collSurplusPoolAddress,
        address _sortedTrovesAddress,
        address _yusdTokenAddress,
        address _controllerAddress)
```

---

`TroveManager`

```
    setAddresses(
        address _borrowerOperationsAddress,
        address _activePoolAddress,
        address _defaultPoolAddress,
        address _sortedTrovesAddress,
        address _controllerAddress,
        address _troveManagerRedemptionsAddress,
        address _troveManagerLiquidationsAddress )
```

---

`TroveManagerLiquidations`

```
    setAddresses(
        address _activePoolAddress,
        address _defaultPoolAddress,
        address _stabilityPoolAddress,
        address _gasPoolAddress,
        address _collSurplusPoolAddress,
        address _yusdTokenAddress,
        address _controllerAddress,
        address _troveManagerAddress )
```

---

`TroveManagerRedemptions`

```
    setAddresses(
        address _activePoolAddress,
        address _defaultPoolAddress,
        address _gasPoolAddress,
        address _collSurplusPoolAddress,
        address _yusdTokenAddress,
        address _sortedTrovesAddress,
        address _controllerAddress,
        address _troveManagerAddress )
```

`StabilityPool`

```
    setAddresses(
        address _borrowerOperationsAddress,
        address _troveManagerAddress,
        address _activePoolAddress,
        address _yusdTokenAddress,
        address _sortedTrovesAddress,
        address _communityIssuanceAddress,
        address _controllerAddress,
        address _troveManagerLiquidationsAddress )
```

---

`ActivePool`

```
    setAddresses(
        address _borrowerOperationsAddress,
        address _troveManagerAddress,
        address _stabilityPoolAddress,
        address _defaultPoolAddress,
        address _controllerAddress,
        address _troveManagerLiquidationsAddress,
        address _troveManagerRedemptionsAddress,
        address _collSurplusPoolAddress )
```

---

`DefaultPool`

```
    setAddresses(
        address _troveManagerAddress,
        address _troveManagerLiquidationsAddress,
        address _activePoolAddress,
        address _controllerAddress )
```

---

`CollSurplusPool`

```
    setAddresses(
        address _borrowerOperationsAddress,
        address _troveManagerLiquidationsAddress,
        address _troveManagerRedemptionsAddress,
        address _activePoolAddress,
        address _controllerAddress,
        address _yusdTokenAddress )
```

---

`CommunityIssuance`

```
    setAddresses(
        address _yetiTokenAddress,
        address _stabilityPoolAddress )
```

---

`Curve LP Farm (Old)`

---

`Boosted Curve LP Farm`

---

`veYETI Emissions ​`

```
    initialize(IERC20 _YETI, IveYETI _VEYETI)
```

---

`YetiController ​`

```setAddresses(
    address _activePoolAddress,
    address _defaultPoolAddress,
    address _stabilityPoolAddress,
    address _collSurplusPoolAddress,
    address _borrowerOperationsAddress,
    address _yusdTokenAddress,
    address _YUSDFeeRecipientAddress,
    address _yetiFinanceTreasury,
    address _sortedTrovesAddress,
    address _veYETIAddress,
    address _troveManagerRedemptionsAddress,
    address _claimAddress,
    address _threeDayTimelock,
    address _twoWeekTimelock )
```

---

## coreContracts

1.  priceFeed,
2.  whitelist,
3.  yusdToken,
4.  sortedTroves,
5.  troveManager,
6.  troveManagerLiquidations,
7.  troveManagerRedemptions,
8.  activePool,
9.  stabilityPool,
10. gasPool,
11. defaultPool,
12. collSurplusPool,
13. borrowerOperations,
14. hintHelpers,
15. tellorCaller,
16. yetiController,

## YETI contracts

1. veYETI
2. veYETIEmissions
3. threeDayTimeLock
4. twoWeekTimelock
5. lockupContractFactory
6. communityIssuance
7. yetiToken
8. yetiFinanceTreasury === sYETI

### deploy core contracts

<!-- 1. priceFeed -->

1. sortedTroves
2. troveManager
3. activePool
4. stabilityPool
5. gasPool
6. defaultPool
7. collSurplusPool
8. borrowerOperations
9. hintHelpers
10. tellorCaller
11. troveManagerLiquidations
12. troveManagerRedemptions
13. whitelist
14. yetiController
15. yusdToken

### deploy yeti contracts

1. veYETI
2. veYETIEmissions
3. threeDayTimeLock
4. twoWeekTimelock
5. communityIssuance

### connect core

### connect yeti

### connect yeti to core

<!-- ### Deployment order

[-] 1. priceFeed

[-] 2. sortedTroves

[-] 3. troveManager

[-] 4. activePool

[-] 5. stabilityPool

[-] 6. gasPool

[-] 7. defaultPool

[-] 8. collSurplusPool

[-] 9. borrowerOperations

[-] 10. hintHelpers

[-] 11. tellorCaller

[-] 12. troveManagerLiquidations

[-] 13. troveManagerRedemptions

[-] 14. whitelist

[-] 15. yusdToken

[] 16. YetiFinanceTreasury

[] 17. sYETI

[] 18. lockupContractFactory

[] 19. communityIssuance

[] 20. yetiToken -->
