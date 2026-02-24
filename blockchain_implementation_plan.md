# Hyperledger Fabric Blockchain Implementation Plan

## Overview
This document outlines the implementation plan for adding a permissioned blockchain ledger (Hyperledger Fabric) to the DeedGuard Zimbabwe system, including smart contracts for title hash storage and zero-knowledge proof mechanisms.

## Phase 1: Hyperledger Fabric Network Setup

### 1.1 Network Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Certificate   │    │   Orderer Node   │    │   Peer Node 1   │
│   Authority     │───▶│   (Ordering)     │───▶│   (Org1)        │
│   (CA)          │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Peer Node 2    │    │   Peer Node 3   │
                       │   (Org2)         │    │   (Org3)        │
                       │                  │    │                 │
                       └──────────────────┘    └─────────────────┘
```

### 1.2 Docker Configuration
Create `blockchain/docker-compose.yml`:
```yaml
version: '3.8'

services:
  # Certificate Authority
  ca.org1.example.com:
    image: hyperledger/fabric-ca:latest
    environment:
      - FABRIC_CA_HOME=/etc/hyperledger/fabric-ca-server
      - FABRIC_CA_SERVER_CA_NAME=ca-org1
      - FABRIC_CA_SERVER_TLS_ENABLED=true
    ports:
      - "7054:7054"
    volumes:
      - ./crypto-config/peerOrganizations/org1.example.com/ca/:/etc/hyperledger/fabric-ca-server-config

  # Orderer
  orderer.example.com:
    image: hyperledger/fabric-orderer:latest
    environment:
      - ORDERER_GENERAL_LOGLEVEL=INFO
      - ORDERER_GENERAL_LISTENADDRESS=0.0.0.0
      - ORDERER_GENERAL_GENESISMETHOD=file
    ports:
      - "7050:7050"
    volumes:
      - ./channel-artifacts/genesis.block:/etc/hyperledger/configtx/genesis.block

  # Peer Nodes
  peer0.org1.example.com:
    image: hyperledger/fabric-peer:latest
    environment:
      - CORE_PEER_ID=peer0.org1.example.com
      - CORE_PEER_ADDRESS=peer0.org1.example.com:7051
      - CORE_PEER_LOCALMSPID=Org1MSP
      - CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/peer/
    ports:
      - "7051:7051"
      - "7052:7052"
    volumes:
      - ./crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/:/etc/hyperledger/msp/peer/
```

## Phase 2: Smart Contract Development (Chaincode)

### 2.1 Chaincode Structure
Create `blockchain/chaincode/title-registry/go.mod`:
```go
module title-registry

go 1.19

require (
    github.com/hyperledger/fabric-contract-api-go v1.1.0
    github.com/hyperledger/fabric-protos-go v0.0.0-20201118002313-9d81a1a7e7cc
)
```

### 2.2 Smart Contract Implementation
Create `blockchain/chaincode/title-registry/title_registry.go`:
```go
package main

import (
    "encoding/json"
    "fmt"
    "time"

    "github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// TitleRegistryContract implements the title registry smart contract
type TitleRegistryContract struct {
    contractapi.Contract
}

// TitleRecord represents a land title deed record
type TitleRecord struct {
    DeedNumber     string    `json:"deedNumber"`
    PropertyHash   string    `json:"propertyHash"`
    OwnerHash      string    `json:"ownerHash"`
    Timestamp      time.Time `json:"timestamp"`
    BlockchainHash string    `json:"blockchainHash"`
    Verified       bool      `json:"verified"`
}

// RegisterTitle registers a new title deed hash
func (c *TitleRegistryContract) RegisterTitle(ctx contractapi.TransactionContextInterface, deedNumber string, propertyHash string, ownerHash string) error {
    // Generate blockchain hash
    timestamp := time.Now()
    blockchainHash := generateHash(deedNumber, propertyHash, ownerHash, timestamp)
    
    titleRecord := TitleRecord{
        DeedNumber:     deedNumber,
        PropertyHash:   propertyHash,
        OwnerHash:      ownerHash,
        Timestamp:      timestamp,
        BlockchainHash: blockchainHash,
        Verified:       true,
    }
    
    recordJSON, err := json.Marshal(titleRecord)
    if err != nil {
        return err
    }
    
    return ctx.GetStub().PutState(deedNumber, recordJSON)
}

// VerifyTitle verifies a title deed hash
func (c *TitleRegistryContract) VerifyTitle(ctx contractapi.TransactionContextInterface, deedNumber string, propertyHash string, ownerHash string) (bool, error) {
    recordJSON, err := ctx.GetStub().GetState(deedNumber)
    if err != nil {
        return false, err
    }
    
    if recordJSON == nil {
        return false, fmt.Errorf("title not found")
    }
    
    var record TitleRecord
    err = json.Unmarshal(recordJSON, &record)
    if err != nil {
        return false, err
    }
    
    // Verify hashes match
    return record.PropertyHash == propertyHash && record.OwnerHash == ownerHash, nil
}

// GetTitleHistory returns the verification history for a title
func (c *TitleRegistryContract) GetTitleHistory(ctx contractapi.TransactionContextInterface, deedNumber string) ([]TitleRecord, error) {
    resultsIterator, err := ctx.GetStub().GetHistoryForKey(deedNumber)
    if err != nil {
        return nil, err
    }
    defer resultsIterator.Close()
    
    var records []TitleRecord
    for resultsIterator.HasNext() {
        response, err := resultsIterator.Next()
        if err != nil {
            return nil, err
        }
        
        var record TitleRecord
        err = json.Unmarshal(response.Value, &record)
        if err != nil {
            return nil, err
        }
        
        records = append(records, record)
    }
    
    return records, nil
}

// generateHash creates a cryptographic hash for the title record
func generateHash(deedNumber, propertyHash, ownerHash string, timestamp time.Time) string {
    // Implementation would use SHA-256 or similar
    return fmt.Sprintf("hash_%s_%s_%s_%d", deedNumber, propertyHash, ownerHash, timestamp.Unix())
}
```

## Phase 3: Zero-Knowledge Proof Implementation

### 3.1 ZKP Library Integration
Add to `backend/package.json`:
```json
{
  "dependencies": {
    "@zk-kit": "^1.0.0",
    "snarkjs": "^0.7.0",
    "circomlibjs": "^0.1.6"
  }
}
```

### 3.2 ZKP Service Implementation
Create `backend/services/zkpService.js`:
```javascript
const snarkjs = require('snarkjs');
const { buildMimc7 } = require('circomlibjs');

class ZKPService {
    constructor() {
        this.mimc7 = null;
    }

    async initialize() {
        this.mimc7 = await buildMimc7();
    }

    // Generate a commitment for title verification
    generateCommitment(titleHash, secret) {
        return this.mimc7.hash(titleHash, secret);
    }

    // Create proof for title ownership without revealing details
    async createOwnershipProof(titleHash, secret, commitment) {
        const circuit = {
            titleHash,
            secret,
            commitment
        };

        // Generate witness
        const witness = this.mimc7.getWitness(circuit);

        // Generate proof (simplified)
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            witness,
            'circuit.wasm',
            'circuit_final.zkey'
        );

        return {
            proof,
            publicSignals,
            commitment
        };
    }

    // Verify ownership proof
    async verifyOwnershipProof(proof, publicSignals) {
        return await snarkjs.groth16.verify(
            'verification_key.json',
            publicSignals,
            proof
        );
    }
}

module.exports = new ZKPService();
```

## Phase 4: Backend Integration

### 4.1 Blockchain Service
Create `backend/services/blockchainService.js`:
```javascript
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

class BlockchainService {
    constructor() {
        this.gateway = null;
        this.contract = null;
    }

    async connect() {
        // Load connection profile
        const ccpPath = path.resolve(__dirname, '../blockchain/connection-profile.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create wallet
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check if identity exists
        const identity = await wallet.get('appUser');
        if (!identity) {
            console.log('An identity for the user "appUser" does not exist in the wallet');
            return;
        }

        // Create gateway
        this.gateway = new Gateway();
        await this.gateway.connect(ccp, {
            wallet,
            identity: 'appUser',
            discovery: { enabled: true, asLocalhost: true }
        });

        // Get network and contract
        const network = await this.gateway.getNetwork('title-channel');
        this.contract = network.getContract('title-registry');
    }

    async registerTitle(deedNumber, propertyHash, ownerHash) {
        try {
            await this.contract.submitTransaction(
                'RegisterTitle',
                deedNumber,
                propertyHash,
                ownerHash
            );
            return { success: true };
        } catch (error) {
            console.error('Failed to register title:', error);
            return { success: false, error: error.message };
        }
    }

    async verifyTitle(deedNumber, propertyHash, ownerHash) {
        try {
            const result = await this.contract.evaluateTransaction(
                'VerifyTitle',
                deedNumber,
                propertyHash,
                ownerHash
            );
            return JSON.parse(result.toString());
        } catch (error) {
            console.error('Failed to verify title:', error);
            return { verified: false, error: error.message };
        }
    }

    async disconnect() {
        if (this.gateway) {
            this.gateway.disconnect();
        }
    }
}

module.exports = new BlockchainService();
```

### 4.2 Updated Verification Service
Modify `backend/services/verificationService.js` to integrate blockchain:
```javascript
const blockchainService = require('./blockchainService');
const zkpService = require('./zkpService');

class VerificationService {
    async verifyDocument(imagePath) {
        // ... existing AI verification logic ...

        // Register with blockchain
        const blockchainResult = await blockchainService.registerTitle(
            result.documentDetails.deedNumber,
            result.confidence.toString(),
            result.fraudScore.toString()
        );

        // Generate ZKP commitment
        const commitment = zkpService.generateCommitment(
            result.documentDetails.deedNumber,
            result.confidence.toString()
        );

        return {
            ...result,
            blockchainTxId: blockchainResult.success ? 'tx_' + Date.now() : null,
            zkpCommitment: commitment
        };
    }
}
```

## Phase 5: Mobile App Integration

### 5.1 Updated API Models
Update `app/src/main/java/zw/co/tittledeedverifier/network/VerificationResponse.kt`:
```kotlin
data class VerificationResponse(
    @SerializedName("is_verified")
    val isVerified: Boolean,
    
    @SerializedName("fraud_score")
    val fraudScore: Int,
    
    @SerializedName("deed_number")
    val deedNumber: String?,
    
    @SerializedName("property_district")
    val propertyDistrict: String?,
    
    @SerializedName("registered_owner")
    val registeredOwner: String?,
    
    @SerializedName("registration_date")
    val registrationDate: String?,
    
    @SerializedName("analysis_reasons")
    val analysisReasons: List<String>,
    
    @SerializedName("blockchain_tx_id")
    val blockchainTxId: String?,
    
    @SerializedName("zkp_commitment")
    val zkpCommitment: String?,
    
    @SerializedName("timestamp")
    val timestamp: String?
)
```

### 5.2 Blockchain Sync Service
Create `app/src/main/java/zw/co/tittledeedverifier/services/BlockchainSyncService.kt`:
```kotlin
class BlockchainSyncService {
    
    suspend fun syncWithBlockchain(record: VerificationRecord) {
        // Sync local records with blockchain when online
        // Handle offline queue and retry logic
    }
    
    fun generateZKPCommitment(titleHash: String, secret: String): String {
        // Generate ZKP commitment for privacy-preserving verification
        return hash(titleHash + secret)
    }
}
```

## Phase 6: Deployment and Testing

### 6.1 Updated Docker Compose
Add blockchain services to main `docker-compose.yml`:
```yaml
services:
  # ... existing services ...
  
  # Blockchain Services
  blockchain-ca:
    build: ./blockchain/ca
    ports:
      - "7054:7054"
  
  blockchain-orderer:
    build: ./blockchain/orderer
    ports:
      - "7050:7050"
  
  blockchain-peer:
    build: ./blockchain/peer
    ports:
      - "7051:7051"
      - "7052:7052"
```

### 6.2 Testing Strategy
1. **Unit Tests**: Test individual components
2. **Integration Tests**: Test blockchain integration
3. **End-to-End Tests**: Full verification flow
4. **Performance Tests**: ZKP generation and verification times

## Implementation Timeline

### Week 1: Foundation
- Set up Hyperledger Fabric network
- Create basic chaincode structure
- Implement basic smart contracts

### Week 2: Core Functionality
- Complete smart contract implementation
- Integrate with backend verification service
- Implement basic ZKP functionality

### Week 3: Integration & Testing
- Mobile app integration
- End-to-end testing
- Performance optimization

### Week 4: Production Readiness
- Security hardening
- Monitoring and logging
- Documentation and deployment scripts

## Security Considerations

1. **Network Security**: TLS encryption, proper certificate management
2. **Access Control**: Role-based permissions for blockchain operations
3. **Data Privacy**: ZKP ensures sensitive data remains private
4. **Audit Trail**: Complete transaction history on blockchain

## Next Steps

1. Start with Phase 1 implementation
2. Set up development environment for Hyperledger Fabric
3. Create basic network configuration
4. Develop and test smart contracts
5. Integrate with existing backend services

This implementation plan provides a comprehensive roadmap for adding blockchain functionality to the DeedGuard system while maintaining the existing AI and offline capabilities.