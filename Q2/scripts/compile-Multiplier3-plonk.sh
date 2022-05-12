#!/bin/bash

cd contracts/circuits

mkdir _plonkMultiplier3

# power's of tau pre-install
if [ -f ./powersOfTau28_hez_final_10.ptau ]; then
    echo "powersOfTau28_hez_final_10.ptau already exists. Skipping."
else
    echo 'Downloading powersOfTau28_hez_final_10.ptau'
    curl https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_10.ptau --output powersOfTau28_hez_final_10.ptau
fi

echo "compiling Multiplier3.circom..."

circom Multiplier3.circom --r1cs --wasm --sym -o _plonkMultiplier3
snarkjs r1cs info _plonkMultiplier3/Multiplier3.r1cs

# Start a new zkey and make a contribution

snarkjs pks _plonkMultiplier3/Multiplier3.r1cs powersOfTau28_hez_final_10.ptau _plonkMultiplier3/circuit.zkey

snarkjs zkey export verificationkey _plonkMultiplier3/circuit.zkey _plonkMultiplier3/verification_key.json

snarkjs zkey export solidityverifier _plonkMultiplier3/circuit.zkey ../_plonkMultiplier3Verifier.sol

cd ../../