const { expect } = require("chai");
const { ethers } = require("hardhat");
const { groth16, plonk } = require("snarkjs");

function unstringifyBigInts(o) {
  if (typeof o == "string" && /^[0-9]+$/.test(o)) {
    return BigInt(o);
  } else if (typeof o == "string" && /^0x[0-9a-fA-F]+$/.test(o)) {
    return BigInt(o);
  } else if (Array.isArray(o)) {
    return o.map(unstringifyBigInts);
  } else if (typeof o == "object") {
    if (o === null) return null;
    const res = {};
    const keys = Object.keys(o);
    keys.forEach((k) => {
      res[k] = unstringifyBigInts(o[k]);
    });
    return res;
  } else {
    return o;
  }
}

function stringToArrayInputs(calldata) {
  return calldata
    .replace(/["[\]\s]/g, "")
    .split(",")
    .map((x) => BigInt(x).toString());
}

function proofCalldataToVerifyProofInput(argArray) {
  const a = [argArray[0], argArray[1]];
  const b = [
    [argArray[2], argArray[3]],
    [argArray[4], argArray[5]],
  ];
  const c = [argArray[6], argArray[7]];
  const input = argArray.slice(8);
  return [a, b, c, input];
}

describe("HelloWorld", function () {
  let Verifier;
  let verifier;

  beforeEach(async function () {
    Verifier = await ethers.getContractFactory("HelloWorldVerifier");
    verifier = await Verifier.deploy();
    await verifier.deployed();
  });

  it("Should return true for correct proof", async function () {
    // generate a proof based on input a = 1 and b = 2 from the wasm build of the circuit and the zkey
    const { proof, publicSignals } = await groth16.fullProve(
      { a: "1", b: "2" },
      "contracts/circuits/HelloWorld/HelloWorld_js/HelloWorld.wasm",
      "contracts/circuits/HelloWorld/circuit_final.zkey"
    );

    // take any public signals (a, or b) and move them from strings to BigInt objects
    const editedPublicSignals = unstringifyBigInts(publicSignals);
    // take the groth 16 proof and convert them to big ints also
    const editedProof = unstringifyBigInts(proof);
    // take the proof and public signals and convert them solidity hex-encoded calldata
    const calldata = await groth16.exportSolidityCallData(
      editedProof,
      editedPublicSignals
    );

    //groom the inputs by "flattening" the array
    const argv = stringToArrayInputs(calldata);
    // setup the tuple inputs to match the required format on the `verifyProof` solidity function
    const a = [argv[0], argv[1]];
    const b = [
      [argv[2], argv[3]],
      [argv[4], argv[5]],
    ];
    const c = [argv[6], argv[7]];
    const Input = argv.slice(8);
    // expect the output to be correct
    expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
  });

  it("Should return false for invalid proof", async function () {
    let a = [0, 0];
    let b = [
      [0, 0],
      [0, 0],
    ];
    let c = [0, 0];
    let d = [0];
    //expect the function call to fail if the proof is invalid (all 0's)
    expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
  });
});

describe("Multiplier3 with Groth16", function () {
  let Verifier;
  let verifier;

  beforeEach(async function () {
    Verifier = await ethers.getContractFactory("Multiplier3Verifier");
    verifier = await Verifier.deploy();
    await verifier.deployed();
  });

  it("Should return true for correct proof", async function () {
    const { proof, publicSignals } = await groth16.fullProve(
      { a: "2", b: "3", c: "6" },
      "contracts/circuits/Multiplier3/Multiplier3_js/Multiplier3.wasm",
      "contracts/circuits/Multiplier3/circuit_final.zkey"
    );

    const proof_BigInt = unstringifyBigInts(proof);
    const publicSignals_BigInt = unstringifyBigInts(publicSignals);

    const calldata = await groth16.exportSolidityCallData(
      proof_BigInt,
      publicSignals_BigInt
    );

    const proofCalldata = stringToArrayInputs(calldata);
    const [a, b, c, input] = proofCalldataToVerifyProofInput(proofCalldata);

    expect(await verifier.verifyProof(a, b, c, input)).to.be.true;
  });

  it("Should return false for invalid proof", async function () {
    let a = [0, 0];
    let b = [
      [0, 0],
      [0, 0],
    ];
    let c = [0, 0];
    let d = [0];
    //expect the function call to fail if the proof is invalid (all 0's)
    expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
  });
});

describe("Multiplier3 with PLONK", function () {
  let Verifier;
  let verifier;

  beforeEach(async function () {
    Verifier = await ethers.getContractFactory("PlonkMultiplier3Verifier");
    verifier = await Verifier.deploy();
    await verifier.deployed();
  });

  it("Should return true for correct proof", async function () {
    const { proof, publicSignals } = await plonk.fullProve(
      { a: "2", b: "3", c: "6" },
      "contracts/circuits/_plonkMultiplier3/Multiplier3_js/Multiplier3.wasm",
      "contracts/circuits/_plonkMultiplier3/circuit.zkey"
    );

    const proof_BigInt = unstringifyBigInts(proof);
    const publicSignals_BigInt = unstringifyBigInts(publicSignals);
    const [proof_formatted, publicSignals_formatted] = await plonk
      .exportSolidityCallData(proof_BigInt, publicSignals_BigInt)
      .then((argString) => {
        const [prf, pubSig] = argString.split(",");
        return JSON.parse(`["${prf}",${pubSig}]`);
      });

    expect(await verifier.verifyProof(proof_formatted, publicSignals_formatted))
      .to.be.true;
  });

  it("Should return false for invalid proof", async function () {
    expect(await verifier.verifyProof("0x", [50n])).to.be.false;
  });
});
