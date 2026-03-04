import { ethers } from "ethers"
import crypto from "crypto"

// DeedRegistry smart contract ABI - covers registering and verifying deeds on-chain
const DEED_REGISTRY_ABI = [
  "function registerDeed(string deedNumber, bytes32 documentHash) external",
  "function verifyDeed(string deedNumber) external view returns (bytes32 documentHash, uint256 timestamp, address registeredBy)",
  "function isDeedRegistered(string deedNumber) external view returns (bool)",
  "event DeedRegistered(string indexed deedNumber, bytes32 documentHash, address registeredBy, uint256 timestamp)",
]

// Solidity source for deployment reference
export const DEED_REGISTRY_SOLIDITY = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DeedRegistry {
    struct Deed {
        bytes32 documentHash;
        uint256 timestamp;
        address registeredBy;
        bool exists;
    }

    mapping(string => Deed) private deeds;
    address public owner;
    uint256 public totalDeeds;

    event DeedRegistered(string indexed deedNumber, bytes32 documentHash, address registeredBy, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function registerDeed(string calldata deedNumber, bytes32 documentHash) external onlyOwner {
        require(!deeds[deedNumber].exists, "Deed already registered");
        require(documentHash != bytes32(0), "Invalid document hash");

        deeds[deedNumber] = Deed({
            documentHash: documentHash,
            timestamp: block.timestamp,
            registeredBy: msg.sender,
            exists: true
        });

        totalDeeds++;
        emit DeedRegistered(deedNumber, documentHash, msg.sender, block.timestamp);
    }

    function verifyDeed(string calldata deedNumber) external view returns (bytes32 documentHash, uint256 timestamp, address registeredBy) {
        require(deeds[deedNumber].exists, "Deed not found");
        Deed memory deed = deeds[deedNumber];
        return (deed.documentHash, deed.timestamp, deed.registeredBy);
    }

    function isDeedRegistered(string calldata deedNumber) external view returns (bool) {
        return deeds[deedNumber].exists;
    }
}
`

function getProvider() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL
  if (!rpcUrl) throw new Error("SEPOLIA_RPC_URL not configured")
  return new ethers.JsonRpcProvider(rpcUrl)
}

function getSigner() {
  const privateKey = process.env.SEPOLIA_PRIVATE_KEY
  if (!privateKey) throw new Error("SEPOLIA_PRIVATE_KEY not configured")
  return new ethers.Wallet(privateKey, getProvider())
}

function getContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const contractAddress = process.env.SEPOLIA_CONTRACT_ADDRESS
  if (!contractAddress) throw new Error("SEPOLIA_CONTRACT_ADDRESS not configured")
  return new ethers.Contract(
    contractAddress,
    DEED_REGISTRY_ABI,
    signerOrProvider || getProvider()
  )
}

// Create a SHA-256 hash of deed data for on-chain storage
export function hashDeedData(data: {
  deedNumber: string
  ownerName: string
  propertyLocation: string
  issueDate?: string
  nationalId?: string
  landSize?: string
}): string {
  const canonical = JSON.stringify({
    deedNumber: data.deedNumber,
    ownerName: data.ownerName,
    propertyLocation: data.propertyLocation,
    issueDate: data.issueDate || "",
    nationalId: data.nationalId || "",
    landSize: data.landSize || "",
  })
  return crypto.createHash("sha256").update(canonical).digest("hex")
}

// Register a deed hash on the Ethereum Sepolia blockchain
export async function registerDeedOnChain(
  deedNumber: string,
  documentHash: string
): Promise<{ txHash: string; blockNumber: number }> {
  const signer = getSigner()
  const contract = getContract(signer)

  // Convert hex hash to bytes32
  const hashBytes32 = "0x" + documentHash

  const tx = await contract.registerDeed(deedNumber, hashBytes32)
  const receipt = await tx.wait()

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  }
}

// Verify a deed on the blockchain - returns the stored hash and metadata
export async function verifyDeedOnChain(
  deedNumber: string
): Promise<{
  isRegistered: boolean
  documentHash?: string
  timestamp?: number
  registeredBy?: string
} | null> {
  try {
    const contract = getContract()

    const isRegistered = await contract.isDeedRegistered(deedNumber)

    if (!isRegistered) {
      return { isRegistered: false }
    }

    const [documentHash, timestamp, registeredBy] =
      await contract.verifyDeed(deedNumber)

    return {
      isRegistered: true,
      documentHash: documentHash.slice(2), // Remove 0x prefix
      timestamp: Number(timestamp),
      registeredBy,
    }
  } catch (error) {
    console.error("Blockchain verification error:", error)
    return null
  }
}

// Check if blockchain is configured and reachable
export async function isBlockchainConfigured(): Promise<boolean> {
  try {
    if (
      !process.env.SEPOLIA_RPC_URL ||
      !process.env.SEPOLIA_PRIVATE_KEY ||
      !process.env.SEPOLIA_CONTRACT_ADDRESS
    ) {
      return false
    }
    const provider = getProvider()
    await provider.getBlockNumber()
    return true
  } catch {
    return false
  }
}
