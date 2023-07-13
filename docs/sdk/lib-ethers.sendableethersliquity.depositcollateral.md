<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-ethers](./lib-ethers.md) &gt; [SendableEthersLiquity](./lib-ethers.sendableethersliquity.md) &gt; [depositCollateral](./lib-ethers.sendableethersliquity.depositcollateral.md)

## SendableEthersLiquity.depositCollateral() method

Adjust existing Trove by depositing more collateral.

<b>Signature:</b>

```typescript
depositCollateral(collaterals: any, ICRWithFees: any, overrides: any): any;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  collaterals | any |  |
|  ICRWithFees | any |  |
|  overrides | any |  |

<b>Returns:</b>

any

## Remarks

Equivalent to:

```typescript
adjustTrove({ depositCollateral: amount })

```
