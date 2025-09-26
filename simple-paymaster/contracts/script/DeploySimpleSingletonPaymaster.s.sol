// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Script, console } from "forge-std/Script.sol";

import { SimpleSingletonPaymaster } from "../src/SimpleSingletonPaymaster.sol";
import { IEntryPoint } from "@account-abstraction-v6/core/EntryPoint.sol";

contract DeploySimpleSingletonPaymaster is Script {
    function run() public {
        // Get deployment parameters
        address entryPointAddress = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789; // EntryPoint v0.6 on Sepolia
        address signerAddress = 0x411BD567E46C0781248dbB6a9211891C032885e5; // Owner will be the signer

        vm.startBroadcast();

        // Deploy the paymaster
        SimpleSingletonPaymaster paymaster = new SimpleSingletonPaymaster(
            IEntryPoint(entryPointAddress),
            signerAddress
        );

        console.log("SimpleSingletonPaymaster deployed at:", address(paymaster));
        console.log("EntryPoint:", entryPointAddress);
        console.log("Signer:", signerAddress);

        vm.stopBroadcast();
    }
}
