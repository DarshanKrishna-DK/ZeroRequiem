import chalk from "chalk";
import ora from "ora";
import { ZeroRequiem } from "zerorequiem-sdk";
import { getConfig, CLIOptions } from "../config";

export async function statusCommand(opts: CLIOptions) {
  const config = getConfig(opts);
  const zr = new ZeroRequiem(config);

  console.log();
  console.log(chalk.yellow.bold("  ZeroRequiem Status"));
  console.log(chalk.gray("  ─".repeat(20)));

  const spinner = ora("Checking relayer...").start();

  let relayerOnline = false;
  try {
    const res = await fetch(`${config.relayerUrl}/health`);
    relayerOnline = res.ok;
  } catch {
    relayerOnline = false;
  }

  spinner.text = "Checking Paymaster deposit...";
  let paymasterDeposit = "unknown";
  try {
    paymasterDeposit = await zr.getPaymasterDeposit();
  } catch {
    paymasterDeposit = "error";
  }

  spinner.succeed("Status retrieved");
  console.log();

  const status = relayerOnline
    ? chalk.green.bold("Online")
    : chalk.red.bold("Offline");

  console.log(`  Relayer:             ${status}`);
  console.log(`  Relayer URL:         ${chalk.gray(config.relayerUrl)}`);
  console.log(`  Paymaster Deposit:   ${chalk.green(paymasterDeposit + " BNB")}`);
  console.log();
  console.log(chalk.white.bold("  Contracts (BSC Testnet)"));
  console.log(chalk.gray("  ─".repeat(20)));
  console.log(`  Vault:       ${chalk.cyan(config.vaultAddress)}`);
  console.log(`  Registry:    ${chalk.cyan(config.registryAddress)}`);
  console.log(`  Factory:     ${chalk.cyan(config.factoryAddress)}`);
  console.log(`  Paymaster:   ${chalk.cyan(config.paymasterAddress)}`);
  console.log(`  EntryPoint:  ${chalk.cyan(config.entryPointAddress)}`);
  console.log(`  Chain ID:    ${chalk.gray(String(config.chainId))}`);
  console.log(`  RPC:         ${chalk.gray(config.rpcUrl)}`);
  console.log();
}
