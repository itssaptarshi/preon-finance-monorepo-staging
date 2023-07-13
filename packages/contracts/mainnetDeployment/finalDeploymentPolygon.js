const configParams = require("./deploymentParams.polygon.js");
const { finalDeployPolygon } = require("./finalDeployPolygon ");

async function main() {
  await finalDeployPolygon(configParams); // 🟢 entry point for final deployment on Polygon Mainnet
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
