import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ToastContainer } from "./components/Toast";
import { useWallet } from "./hooks/useWallet";
import { useStealth } from "./hooks/useStealth";
import { useActivity } from "./hooks/useActivity";
import { ToastContext, useToastState } from "./hooks/useToast";
import { loadContractConfig } from "./config/contracts";
import { Dashboard } from "./pages/Dashboard";
import { RegisterKeys } from "./pages/RegisterKeys";
import { Send } from "./pages/Send";
import { Receive } from "./pages/Receive";
import { Withdraw } from "./pages/Withdraw";
import { Activity } from "./pages/Activity";
import { SDKDocs } from "./pages/SDKDocs";

function App() {
  const wallet = useWallet();
  const stealth = useStealth();
  const activity = useActivity();
  const toastState = useToastState();
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    loadContractConfig().then(() => setConfigLoaded(true));
  }, []);

  useEffect(() => {
    if (wallet.address) {
      stealth.restoreKeys(wallet.address);
    }
  }, [wallet.address]);

  return (
    <ToastContext.Provider value={toastState}>
      <BrowserRouter>
        <Layout
          address={wallet.address}
          isConnecting={wallet.isConnecting}
          onConnect={wallet.connect}
          onDisconnect={wallet.disconnect}
        >
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  address={wallet.address}
                  signer={wallet.signer}
                  stealthKeys={stealth.keys}
                  activity={activity.entries}
                  onGenerateKeys={stealth.generateKeys}
                />
              }
            />
            <Route
              path="/register"
              element={
                <RegisterKeys
                  signer={wallet.signer}
                  address={wallet.address}
                  stealthKeys={stealth.keys}
                  onGenerateKeys={stealth.generateKeys}
                  isGenerating={stealth.isGenerating}
                />
              }
            />
            <Route
              path="/send"
              element={
                <Send
                  signer={wallet.signer}
                  address={wallet.address}
                  onActivity={activity.add}
                />
              }
            />
            <Route
              path="/receive"
              element={
                <Receive
                  signer={wallet.signer}
                  address={wallet.address}
                  stealthKeys={stealth.keys}
                  onGenerateKeys={stealth.generateKeys}
                  onActivity={activity.add}
                />
              }
            />
            <Route
              path="/withdraw"
              element={
                <Withdraw
                  signer={wallet.signer}
                  address={wallet.address}
                  stealthKeys={stealth.keys}
                  onGenerateKeys={stealth.generateKeys}
                  onActivity={activity.add}
                />
              }
            />
            <Route
              path="/activity"
              element={
                <Activity
                  entries={activity.entries}
                  onClear={activity.clear}
                />
              }
            />
            <Route path="/sdk" element={<SDKDocs />} />
          </Routes>
        </Layout>
        <ToastContainer
          toasts={toastState.toasts}
          onRemove={toastState.removeToast}
        />
      </BrowserRouter>
    </ToastContext.Provider>
  );
}

export default App;
