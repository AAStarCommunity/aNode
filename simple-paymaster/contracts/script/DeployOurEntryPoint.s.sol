// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Script } from "forge-std/Script.sol";
import { EntryPoint } from "account-abstraction-v7/core/EntryPoint.sol";
import { console } from "forge-std/console.sol";

contract DeployOurEntryPoint is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy our own EntryPoint
        EntryPoint entryPoint = new EntryPoint();

        vm.stopBroadcast();

        console.log("Our EntryPoint deployed at:", address(entryPoint));
        console.log("Chain ID:", block.chainid);
    }
}
