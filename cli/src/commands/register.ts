import chalk from "chalk";
import ora from "ora";
import { ZeroRequiem } from "zerorequiem-sdk";
import { getConfig, getWallet, EXPLORER, CLIOptions } from "../config";

export async function registerCommand(opts: CLIOptions) {
  const config = getConfig(opts);
  const wallet = getWallet(opts);
  const zr = new ZeroRequiem(config);

  console.log();
  console.log(chalk.yellow.bold("  ZeroRequiem — Register Stealth Keys"));
  console.log(chalk.gray("  ─".repeat(20)));
  console.log(chalk.gray(`  Wallet: ${wallet.address}`));
  console.log();

  const spinGen = ora("Generating stealth key pairs...").start();
  try {
    const keys = await zr.generateKeys(wallet);
    spinGen.succeed("Stealth keys generated");

    const spinReg = ora("Registering keys on-chain...").start();
    const txHash = await zr.registerKeys(wallet, keys.registrationData);
    spinReg.succeed("Keys registered on-chain");

    console.log();
    console.log(chalk.green.bold("  Registration Complete"));
    console.log(chalk.gray("  ─".repeat(20)));
    console.log(`  Tx:           ${chalk.cyan(txHash)}`);
    console.log(`  Explorer:     ${chalk.underline(`${EXPLORER}/tx/${txHash}`)}`);
    console.log();
    console.log(chalk.yellow("  Save these keys securely — they are needed to receive payments:"));
    console.log(`  Spending Key: ${chalk.white(keys.spendingKeyPair.privateKeyHex)}`);
    console.log(`  Viewing Key:  ${chalk.white(keys.viewingKeyPair.privateKeyHex)}`);
    console.log();
  } catch (err: any) {
    spinGen.fail("Registration failed");
    console.error(chalk.red(`  Error: ${err.message}`));
    process.exit(1);
  }
}
