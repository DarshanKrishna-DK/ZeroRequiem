// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

import "../interfaces/IEntryPoint.sol";
import "../interfaces/IPaymaster.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract BasePaymaster is IPaymaster, Ownable {
    IEntryPoint public immutable entryPoint;

    uint256 internal constant SIG_VALIDATION_FAILED = 1;

    constructor(IEntryPoint _entryPoint) {
        entryPoint = _entryPoint;
    }

    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external override returns (bytes memory context, uint256 validationData) {
        _requireFromEntryPoint();
        return _validatePaymasterUserOp(userOp, userOpHash, maxCost);
    }

    function _validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) internal virtual returns (bytes memory context, uint256 validationData);

    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external override {
        _requireFromEntryPoint();
        _postOp(mode, context, actualGasCost);
    }

    function _postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) internal virtual {
        (mode, context, actualGasCost);
    }

    function deposit() public payable {
        entryPoint.depositTo{value: msg.value}(address(this));
    }

    function withdrawTo(address payable withdrawAddress, uint256 amount) public onlyOwner {
        entryPoint.withdrawTo(withdrawAddress, amount);
    }

    function addStake(uint32 unstakeDelaySec) external payable onlyOwner {
        entryPoint.addStake{value: msg.value}(unstakeDelaySec);
    }

    function unlockStake() external onlyOwner {
        entryPoint.unlockStake();
    }

    function withdrawStake(address payable withdrawAddress) external onlyOwner {
        entryPoint.withdrawStake(withdrawAddress);
    }

    function _requireFromEntryPoint() internal virtual {
        require(msg.sender == address(entryPoint), "Sender not EntryPoint");
    }

    function _packValidationData(
        bool sigFailed,
        uint48 validUntil,
        uint48 validAfter
    ) internal pure returns (uint256) {
        return
            (sigFailed ? 1 : 0) |
            (uint256(validUntil) << 160) |
            (uint256(validAfter) << (160 + 48));
    }
}
