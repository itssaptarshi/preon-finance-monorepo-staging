<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-ethers](./lib-ethers.md)

## lib-ethers package

## Classes

|  Class | Description |
|  --- | --- |
|  [BlockPolledLiquityStore](./lib-ethers.blockpolledliquitystore.md) | Ethers-based [LiquityStore](./lib-base.liquitystore.md) that updates state whenever there's a new block. |
|  [EthersLiquity](./lib-ethers.ethersliquity.md) | Convenience class that combines multiple interfaces of the library in one object. |
|  [EthersTransactionCancelledError](./lib-ethers.etherstransactioncancellederror.md) | Thrown when a transaction is cancelled or replaced by a different transaction. |
|  [EthersTransactionFailedError](./lib-ethers.etherstransactionfailederror.md) | Thrown by [EthersLiquity](./lib-ethers.ethersliquity.md) in case of transaction failure. |
|  [PopulatableEthersLiquity](./lib-ethers.populatableethersliquity.md) |  |
|  [PopulatedEthersLiquityTransaction](./lib-ethers.populatedethersliquitytransaction.md) | A transaction that has been prepared for sending. |
|  [PopulatedEthersRedemption](./lib-ethers.populatedethersredemption.md) | A redemption transaction that has been prepared for sending. |
|  [ReadableEthersLiquity](./lib-ethers.readableethersliquity.md) |  |
|  [SendableEthersLiquity](./lib-ethers.sendableethersliquity.md) | Ethers-based implementation of [SendableLiquity](./lib-base.sendableliquity.md)<!-- -->. |
|  [SentEthersLiquityTransaction](./lib-ethers.sentethersliquitytransaction.md) | A transaction that has already been sent. |
|  [UnsupportedNetworkError](./lib-ethers.unsupportednetworkerror.md) | Thrown when trying to connect to a network where Liquity is not deployed. |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [BlockPolledLiquityStoreExtraState](./lib-ethers.blockpolledliquitystoreextrastate.md) | Extra state added to [LiquityStoreState](./lib-base.liquitystorestate.md) by [BlockPolledLiquityStore](./lib-ethers.blockpolledliquitystore.md)<!-- -->. |
|  [BorrowingOperationOptionalParams](./lib-ethers.borrowingoperationoptionalparams.md) | Optional parameters of a transaction that borrows YUSD. |
|  [EthersCallOverrides](./lib-ethers.etherscalloverrides.md) | Optional parameters taken by [ReadableEthersLiquity](./lib-ethers.readableethersliquity.md) functions. |
|  [EthersLiquityConnection](./lib-ethers.ethersliquityconnection.md) | Information about a connection to the Liquity protocol. |
|  [EthersLiquityConnectionOptionalParams](./lib-ethers.ethersliquityconnectionoptionalparams.md) | Optional parameters of [ReadableEthersLiquity.connect()](./lib-ethers.readableethersliquity.connect_1.md) and [EthersLiquity.connect()](./lib-ethers.ethersliquity.connect_1.md)<!-- -->. |
|  [EthersLiquityWithStore](./lib-ethers.ethersliquitywithstore.md) | Variant of [EthersLiquity](./lib-ethers.ethersliquity.md) that exposes a [LiquityStore](./lib-base.liquitystore.md)<!-- -->. |
|  [EthersTransactionOverrides](./lib-ethers.etherstransactionoverrides.md) | Optional parameters taken by [EthersLiquity](./lib-ethers.ethersliquity.md) transaction functions. |
|  [ReadableEthersLiquityWithStore](./lib-ethers.readableethersliquitywithstore.md) | Variant of [ReadableEthersLiquity](./lib-ethers.readableethersliquity.md) that exposes a [LiquityStore](./lib-base.liquitystore.md)<!-- -->. |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [BlockPolledLiquityStoreState](./lib-ethers.blockpolledliquitystorestate.md) | The type of [BlockPolledLiquityStore](./lib-ethers.blockpolledliquitystore.md)<!-- -->'s [state](./lib-base.liquitystore.state.md)<!-- -->. |
|  [EthersLiquityStoreOption](./lib-ethers.ethersliquitystoreoption.md) | Possible values for the optional [useStore](./lib-ethers.ethersliquityconnectionoptionalparams.usestore.md) connection parameter. |
|  [EthersPopulatedTransaction](./lib-ethers.etherspopulatedtransaction.md) | Alias of Ethers' <code>PopulatedTransaction</code> type, which implements [UnsignedTransaction](https://docs.ethers.io/v5/api/utils/transactions/#UnsignedTransaction)<!-- -->. |
|  [EthersProvider](./lib-ethers.ethersprovider.md) | Alias of Ethers' abstract [Provider](https://docs.ethers.io/v5/api/providers/) type. |
|  [EthersSigner](./lib-ethers.etherssigner.md) | Alias of Ethers' abstract [Signer](https://docs.ethers.io/v5/api/signer/) type. |
|  [EthersTransactionReceipt](./lib-ethers.etherstransactionreceipt.md) | Alias of Ethers' [TransactionReceipt](https://docs.ethers.io/v5/api/providers/types/#providers-TransactionReceipt) type. |
|  [EthersTransactionResponse](./lib-ethers.etherstransactionresponse.md) | Alias of Ethers' [TransactionResponse](https://docs.ethers.io/v5/api/providers/types/#providers-TransactionResponse) type. |
