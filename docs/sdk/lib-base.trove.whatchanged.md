<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-base](./lib-base.md) &gt; [Trove](./lib-base.trove.md) &gt; [whatChanged](./lib-base.trove.whatchanged.md)

## Trove.whatChanged() method

Calculate the difference between this Trove and another.

<b>Signature:</b>

```typescript
whatChanged(that: Trove, borrowingRate?: Decimal): any;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  that | [Trove](./lib-base.trove.md) | The other Trove. |
|  borrowingRate | [Decimal](./lib-base.decimal.md) | Borrowing rate to use when calculating a borrowed amount. |

<b>Returns:</b>

any

An object representing the change, or `undefined` if the Troves are equal.
