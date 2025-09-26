// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { UserOperation, IPaymaster as IPaymasterV6 } from "@account-abstraction-v6/interfaces/IPaymaster.sol";
import { _packValidationData } from "@account-abstraction-v6/core/Helpers.sol";

import { ECDSA } from "@openzeppelin-v5.0.2/contracts/utils/cryptography/ECDSA.sol";
import { MessageHashUtils } from "@openzeppelin-v5.0.2/contracts/utils/cryptography/MessageHashUtils.sol";
import { Ownable } from "@openzeppelin-v5.0.2/contracts/access/Ownable.sol";

import { IEntryPoint } from "@account-abstraction-v6/core/EntryPoint.sol";

/**
 * @title SimpleSingletonPaymaster
 * @author Based on Pimlico SingletonPaymaster
 * @notice A simplified ERC-4337 Paymaster contract with signature verification
 * @dev Only supports verifying mode (signature-based sponsorship)
 */
contract SimpleSingletonPaymaster is IPaymasterV6, Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    IEntryPoint public immutable entryPoint;

    // Signer address (can be owner or designated signer)
    address public signer;

    // Events
    event UserOperationSponsored(bytes32 indexed userOpHash, address indexed sender);
    event SignerChanged(address indexed oldSigner, address indexed newSigner);

    // Errors
    error InvalidSignature();
    error InvalidPaymasterData();
    error SenderNotEntryPoint();

    // Constants for paymaster data parsing (Pimlico format)
    uint256 private constant PAYMASTER_DATA_OFFSET = 20;
    uint256 private constant MODE_AND_ALLOW_ALL_BUNDLERS_LENGTH = 1;
    uint256 private constant VERIFYING_PAYMASTER_DATA_LENGTH = 13; // validUntil(6) + validAfter(6) + mode byte already included

    constructor(IEntryPoint _entryPoint, address _signer) Ownable(msg.sender) {
        entryPoint = _entryPoint;
        signer = _signer;
    }

    /**
     * @notice Set the signer address
     * @param _signer The new signer address
     */
    function setSigner(address _signer) external onlyOwner {
        address oldSigner = signer;
        signer = _signer;
        emit SignerChanged(oldSigner, _signer);
    }

    /**
     * @notice Validate paymaster user operation (EntryPoint v0.6)
     * @param userOp The user operation to validate
     * @param userOpHash Hash of the user operation
     * @param requiredPreFund Maximum cost of this transaction (gas * gasPrice)
     * @return context Context to pass to postOp (empty for verifying mode)
     * @return validationData Validation result
     */
    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 requiredPreFund
    ) external returns (bytes memory context, uint256 validationData) {
        _requireFromEntryPoint();

        // Parse paymaster data in Pimlico format
        // Format: paymaster(20) + mode(1) + validUntil(6) + validAfter(6) + signature(65)
        uint256 expectedLength = 20 + 1 + 6 + 6 + 65; // 98 bytes
        if (userOp.paymasterAndData.length != expectedLength) {
            revert InvalidPaymasterData();
        }

        // Extract time bounds (validUntil and validAfter start at position 21)
        uint256 timeBoundsStart = 21; // paymaster(20) + mode(1)
        uint48 validUntil = uint48(bytes6(userOp.paymasterAndData[timeBoundsStart:timeBoundsStart + 6]));
        uint48 validAfter = uint48(bytes6(userOp.paymasterAndData[timeBoundsStart + 6:timeBoundsStart + 12]));

        // Extract signature (starts at position 33: 20 + 1 + 6 + 6)
        uint256 signatureStart = 33;
        bytes calldata signature = userOp.paymasterAndData[signatureStart:];

        if (signature.length != 64 && signature.length != 65) {
            revert InvalidPaymasterData();
        }

        // Create the hash to verify (same as Pimlico's getHash function)
        // This must match the TypeScript implementation exactly
        bytes32 paymasterHash = keccak256(
            abi.encodePacked(
                userOp.sender,
                userOp.nonce,
                userOp.callGasLimit,
                userOp.verificationGasLimit,
                userOp.preVerificationGas,
                userOp.maxFeePerGas,
                userOp.maxPriorityFeePerGas,
                keccak256(userOp.callData),
                keccak256(userOp.initCode),
                // Hash over paymaster data except signature
                keccak256(userOp.paymasterAndData[0:signatureStart])
            )
        );

        bytes32 finalHash = keccak256(abi.encodePacked(paymasterHash, block.chainid));
        bytes32 ethSignedMessageHash = finalHash.toEthSignedMessageHash();

        // Verify signature
        address recoveredSigner = ethSignedMessageHash.recover(signature);

        if (recoveredSigner != signer) {
            revert InvalidSignature();
        }

        // Pack validation data
        validationData = _packValidationData(false, validUntil, validAfter);

        // Emit event
        emit UserOperationSponsored(userOpHash, userOp.sender);

        // Return empty context (verifying mode doesn't need postOp)
        return ("", validationData);
    }

    /**
     * @notice Post-operation hook (not used in verifying mode)
     */
    function postOp(
        uint8 mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external {
        _requireFromEntryPoint();
        // Verifying mode doesn't use postOp
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
     * @notice Deposit ETH to the paymaster
     */
    function deposit() public payable {
        entryPoint.depositTo{value: msg.value}(address(this));
    }

    /**
     * @notice Withdraw ETH from the paymaster
     */
    function withdrawTo(address payable withdrawAddress, uint256 amount) public onlyOwner {
        entryPoint.withdrawTo(withdrawAddress, amount);
    }

    /**
     * @notice Get the current deposit balance
     */
    function getDeposit() public view returns (uint256) {
        return entryPoint.balanceOf(address(this));
    }

    /**
     * @notice Emergency ETH receive
     */
    receive() external payable {
        deposit();
    }
}
