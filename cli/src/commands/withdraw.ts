import chalk from "chalk";
import ora from "ora";
import { ZeroRequiem } from "zerorequiem-sdk";
import { getConfig, EXPLORER, CLIOptions } from "../config";

interface WithdrawOptions extends CLIOptions {
  stealthKey: string;
  to: string;
  amount: string;
}

export async function withdrawCommand(opts: WithdrawOptions) {
  const config = getConfig(opts);
  const zr = new ZeroRequiem(config);

  console.log();
  console.log(chalk.yellow.bold("  ZeroRequiem — Gasless Withdrawal"));
  console.log(chalk.gray("  ─".repeat(20)));
  console.log(`  To:     ${chalk.white(opts.to)}`);
  console.log(`  Amount: ${chalk.green(opts.amount + " BNB")}`);
  console.log(chalk.gray("  Gas sponsored by Paymaster (ERC-4337)"));
  console.log();

  const spinner = ora("Building UserOperation...").start();
  try {
    spinner.text = "Building UserOp → Sponsoring gas → Signing → Relaying...";
    const txHash = await zr.withdraw(opts.stealthKey, opts.to, opts.amount);
    spinner.succeed("Withdrawal complete — gas paid by Paymaster");

    console.log();
    console.log(chalk.green.bold("  Withdrawal Confirmed"));
    console.log(chalk.gray("  ─".repeat(20)));
    console.log(`  Tx:       ${chalk.cyan(txHash)}`);
    console.log(`  Explorer: ${chalk.underline(`${EXPLORER}/tx/${txHash}`)}`);
    console.log();
  } catch (err: any) {
    spinner.fail("Withdrawal failed");
    console.error(chalk.red(`  Error: ${err.message}`));
    process.exit(1);
  }
}
