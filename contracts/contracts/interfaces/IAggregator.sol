// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

import "./UserOperation.sol";

interface IAggregator {
    function validateSignatures(UserOperation[] calldata userOps, bytes calldata signature) external view;
    function validateUserOpSignature(UserOperation calldata userOp) external view returns (bytes memory sigForUserOp);
    function aggregateSignatures(UserOperation[] calldata userOps) external view returns (bytes memory aggregatesSignature);
}
