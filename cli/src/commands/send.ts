import chalk from "chalk";
import ora from "ora";
import { ZeroRequiem } from "zerorequiem-sdk";
import { getConfig, getWallet, EXPLORER, CLIOptions } from "../config";

interface SendOptions extends CLIOptions {
  to: string;
  amount: string;
}

export async function sendCommand(opts: SendOptions) {
  const config = getConfig(opts);
  const wallet = getWallet(opts);
  const zr = new ZeroRequiem(config);

  console.log();
  console.log(chalk.yellow.bold("  ZeroRequiem — Send BNB Privately"));
  console.log(chalk.gray("  ─".repeat(20)));
  console.log(`  From:   ${chalk.gray(wallet.address)}`);
  console.log(`  To:     ${chalk.white(opts.to)}`);
  console.log(`  Amount: ${chalk.green(opts.amount + " BNB")}`);
  console.log();

  const spinner = ora("Looking up recipient stealth keys...").start();
  try {
    const registered = await zr.isRegistered(opts.to);
    if (!registered) {
      spinner.fail("Recipient has not registered stealth keys");
      process.exit(1);
    }
    spinner.text = "Generating stealth address & depositing to vault...";

    const { txHash, stealthAccountAddr } = await zr.send(wallet, opts.to, opts.amount);
    spinner.succeed("BNB sent privately");

    console.log();
    console.log(chalk.green.bold("  Transaction Complete"));
    console.log(chalk.gray("  ─".repeat(20)));
    console.log(`  Tx:      ${chalk.cyan(txHash)}`);
    console.log(`  Stealth: ${chalk.white(stealthAccountAddr)}`);
    console.log(`  Explorer: ${chalk.underline(`${EXPLORER}/tx/${txHash}`)}`);
    console.log();
  } catch (err: any) {
    spinner.fail("Send failed");
    console.error(chalk.red(`  Error: ${err.message}`));
    process.exit(1);
  }
}
