// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

interface IStakeManager {
    struct DepositInfo {
        uint112 deposit;
        bool staked;
        uint112 stake;
        uint32 unstakeDelaySec;
        uint48 withdrawTime;
    }

    struct StakeInfo {
        uint256 stake;
        uint256 unstakeDelaySec;
    }

    event Deposited(address indexed account, uint256 totalDeposit);
    event Withdrawn(address indexed account, address withdrawAddress, uint256 amount);
    event StakeLocked(address indexed account, uint256 totalStaked, uint256 unstakeDelaySec);
    event StakeUnlocked(address indexed account, uint256 withdrawTime);
    event StakeWithdrawn(address indexed account, address withdrawAddress, uint256 amount);

    function getDepositInfo(address account) external view returns (DepositInfo memory info);
    function balanceOf(address account) external view returns (uint256);
    function depositTo(address account) external payable;
    function addStake(uint32 unstakeDelaySec) external payable;
    function unlockStake() external;
    function withdrawStake(address payable withdrawAddress) external;
    function withdrawTo(address payable withdrawAddress, uint256 withdrawAmount) external;
}
