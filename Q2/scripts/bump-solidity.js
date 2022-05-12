const fs = require("fs");
const solidityRegex = /pragma solidity \^\d+\.\d+\.\d+/;

const verifierRegex = /contract Verifier/;

const files = [
  "./contracts/HelloWorldVerifier.sol",
  "./contracts/Multiplier3Verifier.sol",
  "./contracts/PlonkMultiplier3Verifier.sol",
];

files.forEach((path) => {
  let content = fs.readFileSync(path, {
    encoding: "utf-8",
  });
  let bumped = content.replace(solidityRegex, "pragma solidity ^0.8.0");
  bumped = bumped.replace(
    verifierRegex,
    `contract ${path.split("/")[2].replace(".sol", "")}`
  );

  fs.writeFileSync(path, bumped);
});
