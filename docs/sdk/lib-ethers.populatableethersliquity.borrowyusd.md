<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-ethers](./lib-ethers.md) &gt; [PopulatableEthersLiquity](./lib-ethers.populatableethersliquity.md) &gt; [borrowYUSD](./lib-ethers.populatableethersliquity.borrowyusd.md)

## PopulatableEthersLiquity.borrowYUSD() method

Adjust existing Trove by borrowing more YUSD.

<b>Signature:</b>

```typescript
borrowYUSD(amount: any, ICRWithFees: any, maxBorrowingRate: any, overrides: any): any;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  amount | any | The amount of YUSD to borrow. |
|  ICRWithFees | any |  |
|  maxBorrowingRate | any | Maximum acceptable [borrowing rate](./lib-base.fees.borrowingrate.md)<!-- -->. |
|  overrides | any |  |

<b>Returns:</b>

any

## Remarks

Equivalent to:

```typescript
adjustTrove({ borrowYUSD: amount }, maxBorrowingRate)

```
