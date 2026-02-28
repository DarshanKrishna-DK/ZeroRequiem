import express from "express";
import cors from "cors";
import apiRoutes from "./routes/api";
import { config } from "./config";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", apiRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", signer: "active" });
});

app.listen(config.port, () => {
  console.log(`ZeroRequiem Relayer running on port ${config.port}`);
  console.log(`  RPC:        ${config.rpcUrl}`);
  console.log(`  EntryPoint: ${config.entryPointAddress}`);
  console.log(`  Paymaster:  ${config.paymasterAddress}`);
  console.log(`  Vault:      ${config.vaultAddress}`);
  console.log(`  Factory:    ${config.factoryAddress}`);
});
