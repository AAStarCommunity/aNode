// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test, console} from "forge-std/Test.sol";
import {aNodePaymaster} from "../src/aNodePaymaster.sol";
import {IEntryPoint} from "account-abstraction/legacy/v06/IEntryPoint06.sol";
import {UserOperation06} from "account-abstraction/legacy/v06/UserOperation06.sol";
import {MockEntryPoint} from "./MockEntryPoint.sol";

contract aNodePaymasterTest is Test {
    aNodePaymaster paymaster;
    MockEntryPoint entryPoint;
    address owner = address(0x123);
    address user = address(0x456);

    function setUp() public {
        vm.deal(owner, 10 ether);
        vm.deal(user, 5 ether);
        
        // Deploy mock EntryPoint
        entryPoint = new MockEntryPoint();
        
        vm.prank(owner);
        paymaster = new aNodePaymaster(IEntryPoint(address(entryPoint)));
    }

    function testDeployment() public {
        assertEq(paymaster.owner(), owner);
        assertEq(address(paymaster.entryPoint()), address(entryPoint));
        assertEq(paymaster.getDeposit(), 0);
    }

    function testDeposit() public {
        uint256 depositAmount = 1 ether;
        
        vm.prank(user);
        paymaster.deposit{value: depositAmount}();
        
        assertEq(paymaster.getDeposit(), depositAmount);
    }

    function testDepositViaReceive() public {
        uint256 depositAmount = 0.5 ether;
        
        vm.prank(user);
        (bool success,) = address(paymaster).call{value: depositAmount}("");
        
        assertTrue(success);
        assertEq(paymaster.getDeposit(), depositAmount);
    }

    function testWithdrawOnlyOwner() public {
        // First deposit some funds
        vm.prank(user);
        paymaster.deposit{value: 1 ether}();
        
        // Try to withdraw as non-owner (should fail)
        vm.prank(user);
        vm.expectRevert();
        paymaster.withdrawTo(payable(user), 0.5 ether);
        
        // Withdraw as owner (should succeed)
        vm.prank(owner);
        paymaster.withdrawTo(payable(owner), 0.5 ether);
        
        assertEq(paymaster.getDeposit(), 0.5 ether);
    }

    function testGetDeposit() public {
        assertEq(paymaster.getDeposit(), 0);
        
        vm.prank(user);
        paymaster.deposit{value: 2 ether}();
        
        assertEq(paymaster.getDeposit(), 2 ether);
    }
}
