// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

struct UserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    uint256 callGasLimit;
    uint256 verificationGasLimit;
    uint256 preVerificationGas;
    uint256 maxFeePerGas;
    uint256 maxPriorityFeePerGas;
    bytes paymasterAndData;
    bytes signature;
}

library UserOperationLib {
    function getSender(UserOperation calldata userOp) internal pure returns (address) {
        return userOp.sender;
    }

    function pack(UserOperation calldata userOp) internal pure returns (bytes memory ret) {
        bytes calldata pnd = userOp.paymasterAndData;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let ofs := userOp
            let len := sub(sub(pnd.offset, ofs), 32)
            ret := mload(0x40)
            mstore(0x40, add(ret, add(len, 32)))
            mstore(ret, len)
            calldatacopy(add(ret, 32), ofs, len)
        }
    }

    function hash(UserOperation calldata userOp) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            userOp.sender,
            userOp.nonce,
            keccak256(userOp.initCode),
            keccak256(userOp.callData),
            userOp.callGasLimit,
            userOp.verificationGasLimit,
            userOp.preVerificationGas,
            userOp.maxFeePerGas,
            userOp.maxPriorityFeePerGas,
            keccak256(userOp.paymasterAndData)
        ));
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
