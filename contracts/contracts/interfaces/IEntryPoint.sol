// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

import "./UserOperation.sol";
import "./IStakeManager.sol";
import "./IAggregator.sol";

interface IEntryPoint is IStakeManager {
    struct UserOpsPerAggregator {
        UserOperation[] userOps;
        IAggregator aggregator;
        bytes signature;
    }

    error FailedOp(uint256 opIndex, string reason);
    error SignatureValidationFailed(address aggregator);

    event UserOperationEvent(
        bytes32 indexed userOpHash,
        address indexed sender,
        address indexed paymaster,
        uint256 nonce,
        bool success,
        uint256 actualGasCost,
        uint256 actualGasUsed
    );

    event UserOperationRevertReason(
        bytes32 indexed userOpHash,
        address indexed sender,
        uint256 nonce,
        bytes revertReason
    );

    event AccountDeployed(bytes32 indexed userOpHash, address indexed sender, address factory, address paymaster);

    function handleOps(UserOperation[] calldata ops, address payable beneficiary) external;
    function handleAggregatedOps(UserOpsPerAggregator[] calldata opsPerAggregator, address payable beneficiary) external;
    function getUserOpHash(UserOperation calldata userOp) external view returns (bytes32);
    function getSenderAddress(bytes memory initCode) external;
    function getNonce(address sender, uint192 key) external view returns (uint256 nonce);
}
