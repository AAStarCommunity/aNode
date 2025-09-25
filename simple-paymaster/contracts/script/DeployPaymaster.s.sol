// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {aNodePaymaster} from "../src/aNodePaymaster.sol";
import {IEntryPoint} from "account-abstraction/legacy/v06/IEntryPoint06.sol";

contract DeployPaymaster is Script {
    // Sepolia EntryPoint v0.6
    address constant ENTRYPOINT_V06 = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;
    
    function run() external {
        address deployer = msg.sender;
        
        console.log("=== Deploying aNodePaymaster ===");
        console.log("Deployer:", deployer);
        console.log("EntryPoint v0.6:", ENTRYPOINT_V06);
        console.log("Deployer balance:", deployer.balance);
        
        vm.startBroadcast();
        
        // Deploy the paymaster contract
        aNodePaymaster paymaster = new aNodePaymaster(IEntryPoint(ENTRYPOINT_V06));
        
        console.log("aNodePaymaster deployed at:", address(paymaster));
        
        // Initial deposit to the paymaster (0.01 ETH)
        uint256 initialDeposit = 0.01 ether;
        if (deployer.balance >= initialDeposit) {
            paymaster.deposit{value: initialDeposit}();
            console.log("Initial deposit:", initialDeposit);
            console.log("Paymaster balance:", paymaster.getDeposit());
        } else {
            console.log("Insufficient balance for initial deposit");
        }
        
        vm.stopBroadcast();
        
        console.log("=== Deployment Summary ===");
        console.log("Contract address:", address(paymaster));
        console.log("Owner:", paymaster.owner());
        console.log("EntryPoint:", address(paymaster.entryPoint()));
        console.log("Deposit balance:", paymaster.getDeposit());
        
        console.log("=== Integration Instructions ===");
        console.log("Update your TypeScript PAYMASTER_CONTRACT_ADDRESS to:", address(paymaster));
        console.log("Set ENTRYPOINT_VERSION to: '0.6'");
    }
}
