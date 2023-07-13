const native = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"
const reward = "0x82362ec182db3cf7829014bc61e9be8a2e82868a"
const router = "0x10f4a785f458bc144e3706575924889954946639"
const fee = 2000
const rewardToNativePath = [reward, "0xa3Fa99A148fA48D14Ed51d610c367C61876997F1", native]

const MESH_PARAMS_OBJECT = {
    IWMATIC: {
        Strategy: {
            pool: "0xb880e6ade8709969b9fd2501820e052581ac29cf",
            WNATIVE: native,
            rewardToken: reward,
            router: router,
            fee: fee,
            rewardToNativePath: rewardToNativePath,
            pooltokenToNativePath: [native, native]
        },
        Vault: {
            name: "Dyson Preon IWMATIC Vault",
            symbol: "D-P-IWMATIC"
        }
    },
    IUSDC: {
        Strategy: {
            pool: "0x590cd248e16466f747e74d4cfa6c48f597059704",
            WNATIVE: native,
            rewardToken: reward,
            router: router,
            fee: fee,
            rewardToNativePath: rewardToNativePath,
            pooltokenToNativePath: ["0x2791bca1f2de4661ed88a30c99a7a9449aa84174", native]
        },
        Vault: {
            name: "Dyson Preon IUSDC Vault",
            symbol: "D-P-IUSDC"
        }
    },
    IDAI: {
        Strategy: {
            pool: "0xbe068b517e869f59778b3a8303df2b8c13e05d06",
            WNATIVE: native,
            rewardToken: reward,
            router: router,
            fee: fee,
            rewardToNativePath: rewardToNativePath,
            pooltokenToNativePath: ["0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"]
        },
        Vault: {
            name: "Dyson Preon IDAI Vault",
            symbol: "D-P-IWMATIC"
        }
    },
}

module.exports = { MESH_PARAMS_OBJECT }