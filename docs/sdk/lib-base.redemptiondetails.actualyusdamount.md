<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-base](./lib-base.md) &gt; [RedemptionDetails](./lib-base.redemptiondetails.md) &gt; [actualYUSDAmount](./lib-base.redemptiondetails.actualyusdamount.md)

## RedemptionDetails.actualYUSDAmount property

Amount of YUSD that was actually redeemed by the transaction.

<b>Signature:</b>

```typescript
actualYUSDAmount: Decimal;
```

## Remarks

This can end up being lower than `attemptedYUSDAmount` due to interference from another transaction that modifies the list of Troves.
