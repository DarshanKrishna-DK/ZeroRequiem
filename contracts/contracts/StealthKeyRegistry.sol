// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title StealthKeyRegistry
/// @notice Allows users to register their stealth meta-address (spending + viewing
///         public keys) so senders can look them up and generate stealth addresses.
contract StealthKeyRegistry {
    struct StealthKeys {
        uint256 spendingPubKeyPrefix;
        uint256 spendingPubKey;
        uint256 viewingPubKeyPrefix;
        uint256 viewingPubKey;
    }

    mapping(address => StealthKeys) private _keys;

    event StealthKeyChanged(
        address indexed registrant,
        uint256 spendingPubKeyPrefix,
        uint256 spendingPubKey,
        uint256 viewingPubKeyPrefix,
        uint256 viewingPubKey
    );

    function setStealthKeys(
        uint256 spendingPubKeyPrefix,
        uint256 spendingPubKey,
        uint256 viewingPubKeyPrefix,
        uint256 viewingPubKey
    ) external {
        require(
            spendingPubKeyPrefix == 2 || spendingPubKeyPrefix == 3,
            "Invalid spending key prefix"
        );
        require(
            viewingPubKeyPrefix == 2 || viewingPubKeyPrefix == 3,
            "Invalid viewing key prefix"
        );

        _keys[msg.sender] = StealthKeys(
            spendingPubKeyPrefix,
            spendingPubKey,
            viewingPubKeyPrefix,
            viewingPubKey
        );

        emit StealthKeyChanged(
            msg.sender,
            spendingPubKeyPrefix,
            spendingPubKey,
            viewingPubKeyPrefix,
            viewingPubKey
        );
    }

    function stealthKeys(
        address registrant
    )
        external
        view
        returns (
            uint256 spendingPubKeyPrefix,
            uint256 spendingPubKey,
            uint256 viewingPubKeyPrefix,
            uint256 viewingPubKey
        )
    {
        StealthKeys memory k = _keys[registrant];
        require(k.spendingPubKey != 0, "No stealth keys registered");
        return (
            k.spendingPubKeyPrefix,
            k.spendingPubKey,
            k.viewingPubKeyPrefix,
            k.viewingPubKey
        );
    }
}
