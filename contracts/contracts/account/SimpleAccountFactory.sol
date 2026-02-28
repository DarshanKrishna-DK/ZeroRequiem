// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./SimpleAccount.sol";

contract SimpleAccountFactory {
    SimpleAccount public immutable accountImplementation;

    constructor(IEntryPoint _entryPoint) {
        accountImplementation = new SimpleAccount(_entryPoint);
    }

    function createAccount(
        address owner,
        uint256 salt
    ) public returns (SimpleAccount ret) {
        address addr = getAddress(owner, salt);
        uint256 codeSize = addr.code.length;
        if (codeSize > 0) {
            return SimpleAccount(payable(addr));
        }
        ret = SimpleAccount(
            payable(
                new ERC1967Proxy{salt: bytes32(salt)}(
                    address(accountImplementation),
                    abi.encodeCall(SimpleAccount.initialize, (owner))
                )
            )
        );
    }

    function getAddress(
        address owner,
        uint256 salt
    ) public view returns (address) {
        return
            Create2.computeAddress(
                bytes32(salt),
                keccak256(
                    abi.encodePacked(
                        type(ERC1967Proxy).creationCode,
                        abi.encode(
                            address(accountImplementation),
                            abi.encodeCall(SimpleAccount.initialize, (owner))
                        )
                    )
                )
            );
    }
}
