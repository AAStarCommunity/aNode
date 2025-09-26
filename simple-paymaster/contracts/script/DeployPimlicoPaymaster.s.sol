// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Script } from "forge-std/Script.sol";
import { SingletonPaymasterV6 } from "../src/pimlico/SingletonPaymasterV6.sol";
import { console } from "forge-std/console.sol";

contract DeployPimlicoPaymaster is Script {
    // EntryPoint v0.6 address on Sepolia
    address constant ENTRY_POINT_V06 = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Pimlico SingletonPaymasterV6
        address[] memory signers = new address[](1);
        signers[0] = deployerAddress; // Owner is also the signer

        SingletonPaymasterV6 paymaster = new SingletonPaymasterV6(
            ENTRY_POINT_V06,    // entryPoint
            deployerAddress,    // owner
            deployerAddress,    // manager
            signers             // initial signers
        );

        vm.stopBroadcast();

        console.log("Pimlico SingletonPaymasterV6 deployed at:", address(paymaster));
        console.log("EntryPoint:", ENTRY_POINT_V06);
        console.log("Owner/Manager/Signer:", deployerAddress);
    }
}
