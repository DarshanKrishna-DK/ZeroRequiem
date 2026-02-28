// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract PrivacyVault is ReentrancyGuard {
    mapping(address => uint256) public stealthBalances;

    event Announcement(
        address indexed receiver,
        uint256 amount,
        address indexed token,
        bytes32 pkx,
        bytes32 ciphertext
    );

    event Withdrawal(
        address indexed stealthAddr,
        address indexed recipient,
        uint256 amount
    );

    /// @notice Send BNB to a stealth address, held in the vault until withdrawal.
    /// @param receiver  The derived stealth address that will own the deposit.
    /// @param pkx       x-coordinate of the ephemeral public key (compressed).
    /// @param ciphertext Encrypted random number (XOR with ECDH shared secret).
    function sendToStealth(
        address receiver,
        bytes32 pkx,
        bytes32 ciphertext
    ) external payable {
        require(msg.value > 0, "Must send BNB");
        stealthBalances[receiver] += msg.value;
        emit Announcement(receiver, msg.value, address(0), pkx, ciphertext);
    }

    /// @notice Withdraw BNB from the vault. Caller must be the stealth address
    ///         (i.e. the SimpleAccount controlled by the stealth private key).
    /// @param recipient Where to send the BNB.
    /// @param amount    How much to withdraw.
    function withdraw(address payable recipient, uint256 amount) external nonReentrant {
        require(stealthBalances[msg.sender] >= amount, "Insufficient balance");
        stealthBalances[msg.sender] -= amount;
        (bool ok, ) = recipient.call{value: amount}("");
        require(ok, "Transfer failed");
        emit Withdrawal(msg.sender, recipient, amount);
    }
}
