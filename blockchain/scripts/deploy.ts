import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Hivagora contracts...");

  // 1. Deploy AgentRegistry
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const registry = await AgentRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`AgentRegistry deployed to: ${registryAddress}`);

  // 2. Deploy ReputationScore
  const ReputationScore = await ethers.getContractFactory("ReputationScore");
  const reputation = await ReputationScore.deploy(registryAddress);
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log(`ReputationScore deployed to: ${reputationAddress}`);

  // 3. Deploy DealRecord
  const DealRecord = await ethers.getContractFactory("DealRecord");
  const dealRecord = await DealRecord.deploy(reputationAddress);
  await dealRecord.waitForDeployment();
  const dealRecordAddress = await dealRecord.getAddress();
  console.log(`DealRecord deployed to: ${dealRecordAddress}`);

  // 4. Deploy Escrow
  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`Escrow deployed to: ${escrowAddress}`);

  // 5. Setup permissions
  console.log("Setting up permissions...");
  await (registry as any).setReputationContract(reputationAddress);
  await (reputation as any).setDealRecordContract(dealRecordAddress);

  console.log("All contracts deployed and configured!");
  
  console.log({
    AgentRegistry: registryAddress,
    ReputationScore: reputationAddress,
    DealRecord: dealRecordAddress,
    Escrow: escrowAddress
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
