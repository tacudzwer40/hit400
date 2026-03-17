# ZK Circuit Artifacts (Template)

This directory is intended to hold the compiled circuit artifacts necessary for browser-side ZK-SNARK proof generation and verification.

## Expected files
- `circuit.wasm` (compiled circom/halo2 circuit wasm)
- `circuit_final.zkey` (proving key)
- `verification_key.json` (verification key)

## How to generate (example using circom + snarkjs)

```bash
# 1) Compile circuit
circom circuit.circom --r1cs --wasm --sym -o ./build

# 2) Setup ceremony
snarkjs groth16 setup build/circuit.r1cs powersOfTau28_hez_final_10.ptau build/circuit_0000.zkey
snarkjs zkey contribute build/circuit_0000.zkey build/circuit_final.zkey --name="deedguard" -v

# 3) Export verification key
snarkjs zkey export verificationkey build/circuit_final.zkey verification_key.json
```

Then copy `circuit.wasm`, `circuit_final.zkey`, and `verification_key.json` to this folder.
