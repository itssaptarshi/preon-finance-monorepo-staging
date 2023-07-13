// block number: 38012387
const { mainnetDeploy } = require("./mainnetDeployment.js");
const configParams = require("./deploymentParams.polygon.js");
const { mainnetDeployPolygon } = require("./mainnetDeploymentPolygon.js");
const { ERC20 } = require("./ABIs/ERC20.js");

const ETH_WHALE = "0x51bfacfce67821ec05d3c9bc9a8bc8300fb29564";
const WETH_WHALE = "0xe5ae1736f638b0345020280641e65621217d0a11"; // address with wETH balance
const WETH = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"; // wETH address

const stmatic_WHALE = "0xfb6fe7802ba9290ef8b00ca16af4bc26eb663a28"; // address with stMATIC balance (user)
const stMATIC = "0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4"; // stMATIC address

const usdPlus_WHALE = "0xEfc385059da2BFF717f01882cC0d6e128766fbb9";
const usdPlus = "0x236eeC6359fb44CCe8f97E99387aa7F8cd5cdE1f";

const wBtc_WHALE = "0x3ef940a5363f8fcfb738a5fc88dd935192a52a31";
const wBtc = "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6";

const wEth_WHALE = "0x45dda9cb7c25131df268515131f647d726f50608";
const wEth = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";

const iDAI_WHALE = "0xeedb3396934beb35420d896a6c4eda0015ae6ab2";
const iDAI = "0xbE068B517e869f59778B3a8303DF2B8c13E05d06";

const iUSDC_WHALE = "0xd310a932cb1db29cdeff5a7b6fc34ac7b4f0ed8c";
const iUSDC = "0x590Cd248e16466F747e74D4cfa6C48f597059704";

const iWMATIC_WHALE = "0x182f0766e10137631bce96311908dfcbad6fb79a";
const iWMATIC = "0xb880e6AdE8709969B9FD2501820e052581aC29Cf";

//const TEST_DEPLOYER_PRIVATEKEY = '0xbbfbee4961061d506ffbb11dfea64eba16355cbf1d9c29613126ba7fec0aed5d'

async function getNativeToken(
  addr1,
  addr2,
  addr3,
  addr4,
  addr5,
  addr6,
  weth_whale_addr,
  stmatic_whale_addr,
  addr9,
  addr10,
  addr11,
  addr12,
  addr13,
  addr14,
  addr15
) {
  // Impersonate the whale (artificially assume control of its wMatic for both deployer0 and deployer)
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [ETH_WHALE],
  });
  console.log("\n", "=".repeat(20), "get MATIC", "=".repeat(20));
  // Get the ETH whale signer
  const whale = await ethers.provider.getSigner(ETH_WHALE);
  console.log(`MATIC whale addr : ${await whale.getAddress()}`);
  console.log(
    `whale MATIC balance: ${
      (await ethers.provider.getBalance(whale.getAddress())) / 1e18
    }matic`
  );

  // Send ETH to the deployer's address
  await whale.sendTransaction({
    to: addr1,
    value: ethers.utils.parseEther("200.0"),
  });

  // Send ETH to the deployer's address
  await whale.sendTransaction({
    to: addr2,
    value: ethers.utils.parseEther("200.0"),
  });

  // Send ETH to the deployer's address
  await whale.sendTransaction({
    to: addr3,
    value: ethers.utils.parseEther("200.0"),
  });

  // Send ETH to the deployer's address
  await whale.sendTransaction({
    to: addr4,
    value: ethers.utils.parseEther("200.0"),
  });

  // Send ETH to the deployer's address
  await whale.sendTransaction({
    to: addr5,
    value: ethers.utils.parseEther("200.0"),
  });

  // Send ETH to the deployer's address
  await whale.sendTransaction({
    to: addr6,
    value: ethers.utils.parseEther("200.0"),
  });

  // Send ETH to the weth_whale_addr's address
  await whale.sendTransaction({
    to: weth_whale_addr,
    value: ethers.utils.parseEther("200.0"),
  });

  // Send ETH to the stmatic_whale_addr's address
  await whale.sendTransaction({
    to: stmatic_whale_addr,
    value: ethers.utils.parseEther("200.0"),
  });

  // Send ETH to the addr9
  await whale.sendTransaction({
    to: addr9,
    value: ethers.utils.parseEther("200.0"),
  });
  // Send ETH to the addr10
  await whale.sendTransaction({
    to: addr10,
    value: ethers.utils.parseEther("200.0"),
  });

  // Send ETH to the addr11
  await whale.sendTransaction({
    to: addr11,
    value: ethers.utils.parseEther("200.0"),
  });

  // Send ETH to the addr12
  await whale.sendTransaction({
    to: addr12,
    value: ethers.utils.parseEther("200.0"),
  });

  // Send ETH to the addr13
  await whale.sendTransaction({
    to: addr13,
    value: ethers.utils.parseEther("200.0"),
  });

  // Send ETH to the addr14
  await whale.sendTransaction({
    to: addr14,
    value: ethers.utils.parseEther("200.0"),
  });

  // Send ETH to the addr15
  await whale.sendTransaction({
    to: addr15,
    value: ethers.utils.parseEther("200.0"),
  });

  // Impersonate the whale (artificially assume control of its wMatic for both deployer0 and deployer)
  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [ETH_WHALE],
  });
}

async function getERC20Token(name, contractAddr, whaleAddr, addr1, addr2) {
  // Impersonate the whale (artificially assume control of its wMatic for both deployer0 and deployer)
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [whaleAddr],
  });
  console.log("\n", "=".repeat(20), name, "=".repeat(20));

  // Get the WETH whale signer
  const whale = await ethers.provider.getSigner(whaleAddr);
  console.log(`whale addr : ${await whale.getAddress()}`);
  console.log(
    `${name.toUpperCase()} whale ETH balance: ${
      +(await ethers.provider.getBalance(whale.getAddress())) / 1e18
    }`
  );

  const wEthContract = new ethers.Contract(contractAddr, ERC20.abi, whale);
  let wEthBalance = await wEthContract.balanceOf(whale.getAddress());
  console.log(`🐣 whale ${name.toUpperCase()} balance: ${+wEthBalance / 1e18}`);

  await wEthContract.transfer(addr1, wEthBalance.div(2));
  console.log(
    `deployer0 ${name.toUpperCase()} balance: ${
      +(await wEthContract.balanceOf(addr1)) / 1e18
    }`
  );

  wEthBalance = await wEthContract.balanceOf(whale.getAddress());
  console.log(`whale ${name.toUpperCase()} balance: ${+wEthBalance / 1e18}`);

  await wEthContract.transfer(addr2, wEthBalance);
  console.log(
    `deployer1 ${name.toUpperCase()} balance: ${
      +(await wEthContract.balanceOf(addr2)) / 1e18
    }`
  );
  // Stop impersonating whale
  await network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [whaleAddr],
  });
}

async function main() {
  const deployerWallet0 = (await ethers.getSigners())[0];
  const deployerWallet1 = (await ethers.getSigners())[1];

  // let deployer1Addr = deployerWallet0.address;
  // let deployer2Addr = deployerWallet1.address;

  // ? deployer1Addr & deployer2Addr will get all ERC-20 Funds.
  let deployer1Addr = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // ak
  // let deployer2Addr = "0x31c57298578f7508B5982062cfEc5ec8BD346247"; // ak
  let deployer2Addr = "0x31c57298578f7508B5982062cfEc5ec8BD346247"; // ak
  let deployer3Addr = "0x31c57298578f7508B5982062cfEc5ec8BD346247"; // sapt 2
  let deployer4Addr = "0xFBdF1C9ac750aDd0a6Bd2B3566B19aE4874d072A"; // sapt 1
  let deployer5Addr = "0xa81b0E6B64D1AD8DAe8793990991F8fA2095d48b"; // ad
  let deployer6Addr = "0xf401040Af134815cc73e53994474ffea3B8A3514"; //ng

  let _day = 86400;
  let _week = _day * 7;
  let seconds = _week * 16; // 2 week

  let curr_block = await (await hre.ethers.provider.getBlock("latest"))
    .timestamp;
  console.log("📦 curr block:", curr_block);

  const advanceTime = async (seconds) => {
    await hre.ethers.provider.send("evm_increaseTime", [seconds]);
    await hre.ethers.provider.send("evm_mine");
    console.log(`evm time increased by ${seconds / 86400} days`);
  };

  // ? will advance blocks
  // await advanceTime(seconds);

  await getNativeToken(
    deployer1Addr,
    deployer2Addr,
    deployer3Addr,
    deployer4Addr,
    deployer5Addr,
    deployer6Addr,
    deployer1Addr,
    WETH_WHALE,
    stmatic_WHALE,
    usdPlus_WHALE,
    wBtc_WHALE,
    deployer1Addr,
    iUSDC_WHALE,
    iDAI_WHALE,
    iWMATIC_WHALE
  );
  await getERC20Token("wmatic", WETH, WETH_WHALE, deployer1Addr, deployer2Addr);
  await getERC20Token(
    "stmatic",
    stMATIC,
    stmatic_WHALE,
    deployer1Addr,
    deployer2Addr
  );
  await getERC20Token(
    "usd+",
    usdPlus,
    usdPlus_WHALE,
    deployer1Addr,
    deployer2Addr
  );
  await getERC20Token("wbtc", wBtc, wBtc_WHALE, deployer1Addr, deployer2Addr);
  await getERC20Token("weth", wEth, wEth_WHALE, deployer1Addr, deployer2Addr);
  await getERC20Token(
    "iusdc",
    iUSDC,
    iUSDC_WHALE,
    deployer1Addr,
    deployer2Addr
  );
  await getERC20Token("idai", iDAI, iDAI_WHALE, deployer1Addr, deployer2Addr);
  await getERC20Token("iwmatic", iWMATIC, iWMATIC_WHALE, deployer1Addr, deployer2Addr);

  curr_block = await (await hre.ethers.provider.getBlock("latest")).timestamp;
  console.log("📦 ended curr block:", curr_block);

  // ? set blank object in "finalDeploymentPolygon.json" else it will use deployed contracts.
  console.log("\n", "=".repeat(20), "deploying contracts", "=".repeat(20));
  await mainnetDeployPolygon(configParams); // 🟢 entry point for deployment
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
