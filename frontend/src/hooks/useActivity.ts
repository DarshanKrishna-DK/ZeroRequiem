import { useState, useCallback } from "react";
import {
  getActivity,
  addActivity as storeActivity,
  clearActivity as clearStore,
  type ActivityEntry,
} from "../lib/storage";

export type { ActivityEntry };

export function useActivity() {
  const [entries, setEntries] = useState<ActivityEntry[]>(() => getActivity());

  const refresh = useCallback(() => {
    setEntries(getActivity());
  }, []);

  const add = useCallback(
    (entry: Omit<ActivityEntry, "id" | "timestamp">) => {
      storeActivity(entry);
      setEntries(getActivity());
    },
    []
  );

  const clear = useCallback(() => {
    clearStore();
    setEntries([]);
  }, []);

  return { entries, add, clear, refresh };
}
