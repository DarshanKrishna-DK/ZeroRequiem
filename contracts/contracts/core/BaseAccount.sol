// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

import "../interfaces/IAccount.sol";
import "../interfaces/IEntryPoint.sol";

abstract contract BaseAccount is IAccount {
    uint256 internal constant SIG_VALIDATION_FAILED = 1;

    function entryPoint() public view virtual returns (IEntryPoint);

    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external virtual override returns (uint256 validationData) {
        _requireFromEntryPoint();
        validationData = _validateSignature(userOp, userOpHash);
        _validateNonce(userOp.nonce);
        _payPrefund(missingAccountFunds);
    }

    function _requireFromEntryPoint() internal virtual view {
        require(msg.sender == address(entryPoint()), "account: not from EntryPoint");
    }

    function _validateSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal virtual returns (uint256 validationData);

    function _validateNonce(uint256 nonce) internal view virtual {}

    function _payPrefund(uint256 missingAccountFunds) internal virtual {
        if (missingAccountFunds != 0) {
            (bool success, ) = payable(msg.sender).call{
                value: missingAccountFunds,
                gas: type(uint256).max
            }("");
            (success);
        }
    }
}
