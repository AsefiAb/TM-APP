import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppData, DEFAULT_GROUPS, isAppData } from "./domain";

/** Device storage for the owner's workspace: groups, subscribers, campaigns. */
export const WORKSPACE_KEY = "@textmunication/workspace/v1";

type Store = {
  data: AppData;
  /** False until saved data has been read; writes are ignored before then. */
  ready: boolean;
  storageError: string;
  update: (next: AppData) => Promise<boolean>;
  /** Removes everything saved on this device and starts an empty workspace. */
  reset: () => Promise<boolean>;
};

const Context = createContext<Store | null>(null);

export function emptyWorkspace(): AppData {
  return {
    version: 1,
    groups: [...DEFAULT_GROUPS],
    contacts: [],
    conversations: [],
    campaigns: [],
  };
}

export function WorkspaceProvider({
  children,
  storageKey = WORKSPACE_KEY,
}: React.PropsWithChildren<{ storageKey?: string }>) {
  const [data, setData] = useState<AppData>(emptyWorkspace);
  const dataRef = useRef(data);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (!active || !raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (!isAppData(parsed)) throw new Error("Invalid saved workspace");
        dataRef.current = parsed;
        setData(parsed);
      })
      .catch(() => {
        if (active)
          setStorageError(
            "Saved data on this device could not be read. Starting with an empty workspace; the saved copy was left unchanged.",
          );
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [storageKey]);

  const store = useMemo<Store>(() => {
    const persist = (next: AppData) => {
      dataRef.current = next;
      setData(next);
      // Serialize writes so a slower older save cannot replace a newer edit.
      const saved = writes.current
        .then(() => AsyncStorage.setItem(storageKey, JSON.stringify(next)))
        .then(() => {
          setStorageError("");
          return true;
        })
        .catch(() => {
          setStorageError(
            "Your change is available now but could not be saved on this device.",
          );
          return false;
        });
      writes.current = saved.then(() => undefined);
      return saved;
    };
    return {
      data,
      ready,
      storageError,
      update: (next) => (ready ? persist(next) : Promise.resolve(false)),
      reset: () => (ready ? persist(emptyWorkspace()) : Promise.resolve(false)),
    };
  }, [data, ready, storageError, storageKey]);

  return <Context.Provider value={store}>{children}</Context.Provider>;
}

export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("WorkspaceProvider is required");
  return value;
}
