async function main() {
  const date = new Date();
  console.log(date.toUTCString());
  const deployerWallet = (await ethers.getSigners())[0];
  console.log(`deployer address: ${deployerWallet.address}`);

  await deployerWallet.sendTransaction({
    to: "0x9BA330C652001d0617367B05189D4Ad038CE89e9",
    value: ethers.utils.parseEther("10000.0"),
  });
  await deployerWallet.sendTransaction({
    to: "0x1b1E98f4912aE9014064a70537025EF338e6aD67",
    value: ethers.utils.parseEther("10000.0"),
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
