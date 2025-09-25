// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IEntryPoint} from "account-abstraction/legacy/v06/IEntryPoint06.sol";
import {UserOperation06} from "account-abstraction/legacy/v06/UserOperation06.sol";

/**
 * @title MockEntryPoint
 * @notice Mock EntryPoint for testing
 */
contract MockEntryPoint is IEntryPoint {
    mapping(address => uint256) private balances;
    mapping(address => DepositInfo) private deposits;

    function handleOps(UserOperation06[] calldata ops, address payable beneficiary) external override {
        // Mock implementation
        (ops, beneficiary); // Suppress unused parameter warnings
    }

    function handleAggregatedOps(
        UserOpsPerAggregator[] calldata opsPerAggregator,
        address payable beneficiary
    ) external override {
        // Mock implementation
        (opsPerAggregator, beneficiary); // Suppress unused parameter warnings
    }

    function simulateValidation(UserOperation06 calldata userOp) external override {
        // Mock implementation
        (userOp); // Suppress unused parameter warnings
        revert("Mock simulateValidation");
    }

    function simulateHandleOp(
        UserOperation06 calldata op,
        address target,
        bytes calldata targetCallData
    ) external override {
        // Mock implementation
        (op, target, targetCallData); // Suppress unused parameter warnings
        revert("Mock simulateHandleOp");
    }

    function getSenderAddress(bytes calldata initCode) external override {
        // Mock implementation
        (initCode); // Suppress unused parameter warnings
        revert("Mock getSenderAddress");
    }

    function getUserOpHash(UserOperation06 calldata userOp) external view override returns (bytes32) {
        // Mock implementation - return a simple hash
        return keccak256(abi.encode(userOp, address(this), block.chainid));
    }

    // IStakeManager interface
    function getDepositInfo(address account) public view override returns (DepositInfo memory info) {
        return deposits[account];
    }

    function balanceOf(address account) public view override returns (uint256) {
        return balances[account];
    }

    function depositTo(address account) public payable override {
        balances[account] += msg.value;
        deposits[account].deposit += uint112(msg.value);
    }

    function addStake(uint32 unstakeDelaySec) public payable override {
        deposits[msg.sender].stake += uint112(msg.value);
        deposits[msg.sender].unstakeDelaySec = unstakeDelaySec;
        deposits[msg.sender].staked = true;
    }

    function unlockStake() public override {
        deposits[msg.sender].withdrawTime = uint48(block.timestamp + deposits[msg.sender].unstakeDelaySec);
    }

    function withdrawStake(address payable withdrawAddress) public override {
        DepositInfo storage info = deposits[msg.sender];
        require(info.withdrawTime > 0 && info.withdrawTime <= block.timestamp, "Stake not unlocked");
        
        uint256 stake = info.stake;
        info.stake = 0;
        info.withdrawTime = 0;
        info.staked = false;
        
        withdrawAddress.transfer(stake);
    }

    function withdrawTo(address payable withdrawAddress, uint256 withdrawAmount) public override {
        require(balances[msg.sender] >= withdrawAmount, "Insufficient balance");
        balances[msg.sender] -= withdrawAmount;
        deposits[msg.sender].deposit -= uint112(withdrawAmount);
        withdrawAddress.transfer(withdrawAmount);
    }

    // INonceManager interface
    function getNonce(address sender, uint192 key) external view override returns (uint256 nonce) {
        // Mock implementation
        (sender, key); // Suppress unused parameter warnings
        return 0;
    }

    function incrementNonce(uint192 key) external override {
        // Mock implementation
        (key); // Suppress unused parameter warnings
    }

    // Allow the contract to receive ETH
    receive() external payable {
        balances[msg.sender] += msg.value;
        deposits[msg.sender].deposit += uint112(msg.value);
    }
}
