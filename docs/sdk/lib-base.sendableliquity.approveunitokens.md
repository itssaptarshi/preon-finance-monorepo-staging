<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-base](./lib-base.md) &gt; [SendableLiquity](./lib-base.sendableliquity.md) &gt; [approveUniTokens](./lib-base.sendableliquity.approveunitokens.md)

## SendableLiquity.approveUniTokens() method

Allow the liquidity mining contract to use Uniswap ETH/YUSD LP tokens for [staking](./lib-base.transactableliquity.stakeunitokens.md)<!-- -->.

<b>Signature:</b>

```typescript
approveUniTokens(allowance?: Decimalish): Promise<SentLiquityTransaction<S, LiquityReceipt<R, void>>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  allowance | [Decimalish](./lib-base.decimalish.md) | Maximum amount of LP tokens that will be transferrable to liquidity mining (<code>2^256 - 1</code> by default). |

<b>Returns:</b>

Promise&lt;[SentLiquityTransaction](./lib-base.sentliquitytransaction.md)<!-- -->&lt;S, [LiquityReceipt](./lib-base.liquityreceipt.md)<!-- -->&lt;R, void&gt;&gt;&gt;

## Remarks

Must be performed before calling [stakeUniTokens()](./lib-base.transactableliquity.stakeunitokens.md)<!-- -->.
