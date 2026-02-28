import { useState, useCallback, useEffect } from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import { CHAIN_ID, BSC_TESTNET_PARAMS } from "../config/contracts";

export function useWallet() {
  const [address, setAddress] = useState<string>("");
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [chainId, setChainId] = useState<number>(0);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    if (!(window as any).ethereum) {
      alert("Please install MetaMask");
      return;
    }

    setIsConnecting(true);
    try {
      const prov = new BrowserProvider((window as any).ethereum);
      await prov.send("eth_requestAccounts", []);

      const network = await prov.getNetwork();
      const currentChainId = Number(network.chainId);

      if (currentChainId !== CHAIN_ID) {
        try {
          await prov.send("wallet_switchEthereumChain", [
            { chainId: BSC_TESTNET_PARAMS.chainId },
          ]);
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await prov.send("wallet_addEthereumChain", [BSC_TESTNET_PARAMS]);
          } else {
            throw switchError;
          }
        }
      }

      const s = await prov.getSigner();
      const addr = await s.getAddress();

      setProvider(prov);
      setSigner(s);
      setAddress(addr);
      setChainId(CHAIN_ID);
    } catch (err) {
      console.error("Connect error:", err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress("");
    setSigner(null);
    setProvider(null);
    setChainId(0);
  }, []);

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) disconnect();
      else setAddress(accounts[0]);
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    eth.on("accountsChanged", handleAccountsChanged);
    eth.on("chainChanged", handleChainChanged);

    return () => {
      eth.removeListener("accountsChanged", handleAccountsChanged);
      eth.removeListener("chainChanged", handleChainChanged);
    };
  }, [disconnect]);

  return { address, signer, provider, chainId, isConnecting, connect, disconnect };
}
