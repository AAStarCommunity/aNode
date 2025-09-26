// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "forge-std/Script.sol";
import "../src/SimpleAccount.sol";

contract DeploySimpleAccount is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Sepolia EntryPoint v0.6
        IEntryPoint entryPoint = IEntryPoint(0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789);

        // Deploy SimpleAccount
        SimpleAccount simpleAccount = new SimpleAccount(entryPoint);

        console.log("SimpleAccount deployed at:", address(simpleAccount));
        console.log("EntryPoint:", address(entryPoint));
        console.log("Owner:", simpleAccount.owner());

        vm.stopBroadcast();
    }
}
