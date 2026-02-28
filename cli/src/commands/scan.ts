import chalk from "chalk";
import ora from "ora";
import { ZeroRequiem } from "zerorequiem-sdk";
import { formatEther } from "ethers";
import { getConfig, EXPLORER, CLIOptions } from "../config";

interface ScanOptions extends CLIOptions {
  spendKey: string;
  viewKey: string;
  fromBlock?: string;
}

export async function scanCommand(opts: ScanOptions) {
  const config = getConfig(opts);
  const zr = new ZeroRequiem(config);

  console.log();
  console.log(chalk.yellow.bold("  ZeroRequiem — Scan for Stealth Payments"));
  console.log(chalk.gray("  ─".repeat(20)));
  console.log();

  const spinner = ora("Scanning on-chain announcements...").start();
  try {
    const fromBlock = opts.fromBlock ? parseInt(opts.fromBlock, 10) : undefined;
    const payments = await zr.scan(opts.spendKey, opts.viewKey, fromBlock);
    spinner.succeed(`Scan complete — ${payments.length} payment(s) found`);

    if (payments.length === 0) {
      console.log(chalk.gray("\n  No stealth payments found for your keys.\n"));
      return;
    }

    console.log();
    console.log(
      chalk.white.bold("  #   Amount (BNB)     Stealth Receiver                           Block")
    );
    console.log(chalk.gray("  " + "─".repeat(85)));

    payments.forEach((p, i) => {
      const amt = formatEther(p.amount).padEnd(16);
      const addr = p.receiver.slice(0, 10) + "..." + p.receiver.slice(-8);
      console.log(
        `  ${chalk.yellow(String(i + 1).padStart(2))}  ${chalk.green(amt)} ${chalk.white(addr)}   ${chalk.gray(String(p.blockNumber))}`
      );
    });

    console.log();
    console.log(chalk.yellow("  To withdraw, use:"));
    payments.forEach((p) => {
      console.log(
        chalk.gray(`    zerorequiem withdraw --stealth-key ${p.stealthPrivateKey} --to <YOUR_WALLET> --amount <AMOUNT>`)
      );
    });
    console.log();
  } catch (err: any) {
    spinner.fail("Scan failed");
    console.error(chalk.red(`  Error: ${err.message}`));
    process.exit(1);
  }
}
