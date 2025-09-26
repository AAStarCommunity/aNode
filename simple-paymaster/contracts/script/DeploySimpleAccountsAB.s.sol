// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "forge-std/Script.sol";
import "../src/SimpleAccount.sol";

contract DeploySimpleAccountsAB is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Sepolia EntryPoint v0.6
        IEntryPoint entryPoint = IEntryPoint(0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789);

        // Deploy SimpleAccount A
        SimpleAccount simpleAccountA = new SimpleAccount(entryPoint);
        console.log("SimpleAccount A deployed at:", address(simpleAccountA));
        console.log("SimpleAccount A Owner:", simpleAccountA.owner());

        // Deploy SimpleAccount B
        SimpleAccount simpleAccountB = new SimpleAccount(entryPoint);
        console.log("SimpleAccount B deployed at:", address(simpleAccountB));
        console.log("SimpleAccount B Owner:", simpleAccountB.owner());

        console.log("EntryPoint:", address(entryPoint));

        vm.stopBroadcast();
    }
}
