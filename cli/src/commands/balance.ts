import chalk from "chalk";
import ora from "ora";
import { ZeroRequiem } from "zerorequiem-sdk";
import { Wallet, JsonRpcProvider, formatEther } from "ethers";
import { getConfig, CLIOptions } from "../config";

interface BalanceOptions extends CLIOptions {
  stealthKey?: string;
  address?: string;
}

export async function balanceCommand(opts: BalanceOptions) {
  if (!opts.stealthKey && !opts.address) {
    console.error(chalk.red("  Error: Provide --stealth-key or --address"));
    process.exit(1);
  }

  const config = getConfig(opts);
  const zr = new ZeroRequiem(config);
  const provider = new JsonRpcProvider(config.rpcUrl);

  console.log();
  console.log(chalk.yellow.bold("  ZeroRequiem — Balance Check"));
  console.log(chalk.gray("  ─".repeat(20)));

  const spinner = ora("Querying balances...").start();
  try {
    let targetAddr: string;

    if (opts.stealthKey) {
      const w = new Wallet(opts.stealthKey);
      targetAddr = w.address;

      const vaultBalance = await zr.getVaultBalance(opts.stealthKey);
      const walletBalance = formatEther(await provider.getBalance(targetAddr));

      spinner.succeed("Balances retrieved");
      console.log();
      console.log(`  Stealth EOA:    ${chalk.white(targetAddr)}`);
      console.log(`  Vault Balance:  ${chalk.green(vaultBalance + " BNB")}`);
      console.log(`  Wallet Balance: ${chalk.green(walletBalance + " BNB")}`);
    } else {
      targetAddr = opts.address!;
      const walletBalance = formatEther(await provider.getBalance(targetAddr));

      spinner.succeed("Balance retrieved");
      console.log();
      console.log(`  Address:        ${chalk.white(targetAddr)}`);
      console.log(`  Wallet Balance: ${chalk.green(walletBalance + " BNB")}`);
    }

    console.log();
  } catch (err: any) {
    spinner.fail("Balance check failed");
    console.error(chalk.red(`  Error: ${err.message}`));
    process.exit(1);
  }
}
