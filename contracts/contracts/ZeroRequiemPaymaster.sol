// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

import "./core/BasePaymaster.sol";
import "./interfaces/UserOperation.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title ZeroRequiemPaymaster
/// @notice ERC-4337 VerifyingPaymaster that sponsors gas for stealth wallet operations.
///         The relayer acts as the verifying signer — it signs UserOps after off-chain
///         voucher validation, and the contract verifies that signature on-chain.
contract ZeroRequiemPaymaster is BasePaymaster {
    using ECDSA for bytes32;
    using UserOperationLib for UserOperation;

    address public immutable verifyingSigner;

    mapping(address => uint256) public senderNonce;

    uint256 private constant VALID_TIMESTAMP_OFFSET = 20;
    uint256 private constant SIGNATURE_OFFSET = 84;

    constructor(
        IEntryPoint _entryPoint,
        address _verifyingSigner
    ) BasePaymaster(_entryPoint) {
        verifyingSigner = _verifyingSigner;
    }

    /// @notice Hash a UserOp for the verifying signer to sign off-chain.
    function getHash(
        UserOperation calldata userOp,
        uint48 validUntil,
        uint48 validAfter
    ) public view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    UserOperationLib.pack(userOp),
                    block.chainid,
                    address(this),
                    senderNonce[userOp.getSender()],
                    validUntil,
                    validAfter
                )
            );
    }

    function _validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 /*userOpHash*/,
        uint256 requiredPreFund
    ) internal override returns (bytes memory context, uint256 validationData) {
        (requiredPreFund);

        (
            uint48 validUntil,
            uint48 validAfter,
            bytes calldata signature
        ) = parsePaymasterAndData(userOp.paymasterAndData);

        require(
            signature.length == 64 || signature.length == 65,
            "ZRP: invalid sig length"
        );

        bytes32 ethHash = ECDSA.toEthSignedMessageHash(
            getHash(userOp, validUntil, validAfter)
        );

        senderNonce[userOp.getSender()]++;

        if (verifyingSigner != ECDSA.recover(ethHash, signature)) {
            return ("", _packValidationData(true, validUntil, validAfter));
        }

        return ("", _packValidationData(false, validUntil, validAfter));
    }

    function parsePaymasterAndData(
        bytes calldata paymasterAndData
    )
        public
        pure
        returns (uint48 validUntil, uint48 validAfter, bytes calldata signature)
    {
        (validUntil, validAfter) = abi.decode(
            paymasterAndData[VALID_TIMESTAMP_OFFSET:SIGNATURE_OFFSET],
            (uint48, uint48)
        );
        signature = paymasterAndData[SIGNATURE_OFFSET:];
    }
}
