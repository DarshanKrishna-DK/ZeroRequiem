#!/usr/bin/env node

import { Command } from "commander";
import { registerCommand } from "./commands/register";
import { sendCommand } from "./commands/send";
import { scanCommand } from "./commands/scan";
import { withdrawCommand } from "./commands/withdraw";
import { balanceCommand } from "./commands/balance";
import { statusCommand } from "./commands/status";

const program = new Command();

program
  .name("zerorequiem")
  .description("CLI tool for ZeroRequiem — privacy-preserving BNB transfers on BSC")
  .version("1.0.0");

program
  .command("register")
  .description("Generate and register stealth keys on-chain (one-time setup)")
  .requiredOption("-k, --private-key <key>", "Wallet private key (or set PRIVATE_KEY env)")
  .option("--rpc-url <url>", "BSC RPC endpoint")
  .option("--relayer-url <url>", "Relayer API URL")
  .action(registerCommand);

program
  .command("send")
  .description("Send BNB privately to a registered recipient")
  .requiredOption("-t, --to <address>", "Recipient wallet address")
  .requiredOption("-a, --amount <bnb>", "Amount in BNB (e.g. 0.01)")
  .requiredOption("-k, --private-key <key>", "Sender wallet private key (or set PRIVATE_KEY env)")
  .option("--rpc-url <url>", "BSC RPC endpoint")
  .option("--relayer-url <url>", "Relayer API URL")
  .action(sendCommand);

program
  .command("scan")
  .description("Scan for incoming stealth payments addressed to you")
  .requiredOption("--spend-key <key>", "Stealth spending private key")
  .requiredOption("--view-key <key>", "Stealth viewing private key")
  .option("--from-block <number>", "Start scanning from this block number")
  .option("--rpc-url <url>", "BSC RPC endpoint")
  .option("--relayer-url <url>", "Relayer API URL")
  .action(scanCommand);

program
  .command("withdraw")
  .description("Withdraw BNB from a stealth account (gasless via Paymaster)")
  .requiredOption("--stealth-key <key>", "Stealth account private key")
  .requiredOption("-t, --to <address>", "Destination wallet address")
  .requiredOption("-a, --amount <bnb>", "Amount in BNB to withdraw")
  .option("--rpc-url <url>", "BSC RPC endpoint")
  .option("--relayer-url <url>", "Relayer API URL")
  .action(withdrawCommand);

program
  .command("balance")
  .description("Check vault balance for a stealth account")
  .option("--stealth-key <key>", "Stealth account private key")
  .option("--address <address>", "Stealth account address")
  .option("--rpc-url <url>", "BSC RPC endpoint")
  .option("--relayer-url <url>", "Relayer API URL")
  .action(balanceCommand);

program
  .command("status")
  .description("Show relayer health, Paymaster deposit, and contract addresses")
  .option("--rpc-url <url>", "BSC RPC endpoint")
  .option("--relayer-url <url>", "Relayer API URL")
  .action(statusCommand);

program.parse();
