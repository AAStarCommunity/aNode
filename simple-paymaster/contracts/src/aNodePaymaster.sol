// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ECDSA} from "openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "openzeppelin-contracts/contracts/utils/cryptography/MessageHashUtils.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

// Import v0.6 interfaces from legacy folder
import {UserOperation06} from "account-abstraction/legacy/v06/UserOperation06.sol";
import {IPaymaster06} from "account-abstraction/legacy/v06/IPaymaster06.sol";
import {IEntryPoint} from "account-abstraction/legacy/v06/IEntryPoint06.sol";

/**
 * @title aNodePaymaster
 * @notice ERC-4337 Paymaster for EntryPoint v0.6
 * @dev Simple signature-based paymaster implementation
 */
contract aNodePaymaster is IPaymaster06, Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    IEntryPoint public immutable entryPoint;

    // Events
    event UserOperationSponsored(bytes32 indexed userOpHash, address indexed sender, uint256 actualGasCost);

    // Errors
    error InvalidSignature();
    error InvalidPaymasterData();
    error InsufficientDeposit();
    error SenderNotEntryPoint();

    constructor(IEntryPoint _entryPoint) Ownable(msg.sender) {
        entryPoint = _entryPoint;
    }

    /**
     * @notice Validate paymaster user operation (EntryPoint v0.6)
     * @param userOp The user operation to validate
     * @param userOpHash Hash of the user operation
     * @param maxCost Maximum cost of this transaction (gas * gasPrice)
     * @return context Context to pass to postOp
     * @return validationData Validation result
     */
    function validatePaymasterUserOp(
        UserOperation06 calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external override returns (bytes memory context, uint256 validationData) {
        _requireFromEntryPoint();

        // Extract paymaster data from paymasterAndData
        bytes calldata paymasterAndData = userOp.paymasterAndData;

        // Minimum length: paymaster address (20) + validUntil (6) + validAfter (6) + signature (65) = 97 bytes
        if (paymasterAndData.length < 97) {
            revert InvalidPaymasterData();
        }

        // Extract time bounds
        uint48 validUntil = uint48(bytes6(paymasterAndData[20:26]));
        uint48 validAfter = uint48(bytes6(paymasterAndData[26:32]));

        // Extract signature (last 65 bytes)
        bytes calldata signature = paymasterAndData[32:97];

        // Create the hash according to TypeScript implementation
        // Split to avoid stack too deep error
        bytes32 callDataHash = keccak256(userOp.callData);
        bytes32 initCodeHash = keccak256(userOp.initCode);
        bytes32 paymasterDataHash = keccak256(userOp.paymasterAndData[0:32]);

        bytes32 paymasterHash = keccak256(
            abi.encodePacked(
                userOp.sender,
                userOp.nonce,
                userOp.callGasLimit,
                userOp.verificationGasLimit,
                userOp.preVerificationGas,
                userOp.maxFeePerGas,
                userOp.maxPriorityFeePerGas,
                callDataHash,
                initCodeHash,
                paymasterDataHash
            )
        );

        bytes32 finalHash = keccak256(abi.encodePacked(paymasterHash, block.chainid));
        bytes32 ethSignedMessageHash = finalHash.toEthSignedMessageHash();

        // Verify signature
        address recoveredSigner = ethSignedMessageHash.recover(signature);

        // Verify signer is owner
        if (recoveredSigner != owner()) {
            revert InvalidSignature();
        }

        // Pack validation data with time bounds
        validationData = _packValidationData(
            false, // signature verification passed
            validUntil,
            validAfter
        );

        // For unstaked paymaster, we must return empty context
        context = "";

        return (context, validationData);
    }

    /**
     * @notice Post-operation hook (EntryPoint v0.6)
     * @param mode Whether the operation succeeded, reverted, or postOp reverted
     * @param context Context returned from validatePaymasterUserOp
     * @param actualGasCost Actual gas cost of the operation
     */
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external override {
        _requireFromEntryPoint();
        
        // Decode context
        (bytes32 userOpHash, address sender) = abi.decode(context, (bytes32, address));
        
        // Emit event for tracking
        emit UserOperationSponsored(userOpHash, sender, actualGasCost);
        
        // Additional post-operation logic based on mode
        if (mode == PostOpMode.postOpReverted) {
            // Handle postOp revert case if needed
            return;
        }
    }

    /**
     * @notice Add a deposit for this paymaster
     */
    function deposit() public payable {
        entryPoint.depositTo{value: msg.value}(address(this));
    }

    /**
     * @notice Withdraw value from the deposit (owner only)
     * @param withdrawAddress Target to send to
     * @param amount Amount to withdraw
     */
    function withdrawTo(address payable withdrawAddress, uint256 amount) public onlyOwner {
        entryPoint.withdrawTo(withdrawAddress, amount);
    }

    /**
     * @notice Add stake for this paymaster (owner only)
     * @param unstakeDelaySec The unstake delay for this paymaster
     */
    function addStake(uint32 unstakeDelaySec) external payable onlyOwner {
        require(unstakeDelaySec > 0, "unstake delay must be greater than 0");
        entryPoint.addStake{value: msg.value}(unstakeDelaySec);
    }

    /**
     * @notice Return current paymaster's deposit on the entryPoint
     */
    function getDeposit() public view returns (uint256) {
        return entryPoint.balanceOf(address(this));
    }


    /**
     * @notice Unlock the stake (owner only)
     */
    function unlockStake() external onlyOwner {
        entryPoint.unlockStake();
    }

    /**
     * @notice Withdraw the entire paymaster's stake (owner only)
     * @param withdrawAddress The address to send withdrawn value
     */
    function withdrawStake(address payable withdrawAddress) external onlyOwner {
        entryPoint.withdrawStake(withdrawAddress);
    }

    /**
     * @notice Validate the call is made from a valid entrypoint
     */
    function _requireFromEntryPoint() internal view {
        if (msg.sender != address(entryPoint)) {
            revert SenderNotEntryPoint();
        }
    }

    /**
     * @notice Pack validation data
     */
    function _packValidationData(
        bool sigFailed,
        uint48 validUntil,
        uint48 validAfter
    ) internal pure returns (uint256) {
        return uint256(validUntil) << 160 | uint256(validAfter) << 208 | (sigFailed ? 1 : 0);
    }

    /**
     * @notice Emergency function to receive ETH
     */
    receive() external payable {
        deposit();
    }
}
