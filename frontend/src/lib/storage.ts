const PREFIX = "zr_";

export interface ActivityEntry {
  id: string;
  type: "send" | "receive" | "withdraw" | "register";
  amount?: string;
  address?: string;
  txHash?: string;
  stealthAccount?: string;
  timestamp: number;
}

export function saveStealthKeys(address: string, keys: string): void {
  try {
    localStorage.setItem(`${PREFIX}keys_${address.toLowerCase()}`, keys);
  } catch {}
}

export function loadStealthKeys(address: string): string | null {
  try {
    return localStorage.getItem(`${PREFIX}keys_${address.toLowerCase()}`);
  } catch {
    return null;
  }
}

export function clearStealthKeys(address: string): void {
  try {
    localStorage.removeItem(`${PREFIX}keys_${address.toLowerCase()}`);
  } catch {}
}

export function getActivity(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(`${PREFIX}activity`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addActivity(entry: Omit<ActivityEntry, "id" | "timestamp">): void {
  try {
    const list = getActivity();
    list.unshift({
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    });
    if (list.length > 100) list.length = 100;
    localStorage.setItem(`${PREFIX}activity`, JSON.stringify(list));
  } catch {}
}

export function clearActivity(): void {
  try {
    localStorage.removeItem(`${PREFIX}activity`);
  } catch {}
}
