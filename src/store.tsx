import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppData, createSeedData, isAppData } from "./domain";

const KEY = "@textmunication/demo/v1";
type Store = {
  data: AppData;
  ready: boolean;
  storageError: string;
  update: (next: AppData) => void;
  reset: () => void;
};
const Context = createContext<Store | null>(null);

export function DemoProvider({ children }: React.PropsWithChildren) {
  const [data, setData] = useState(createSeedData);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!active || !raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (!isAppData(parsed)) throw new Error("Invalid saved workspace");
        setData(parsed);
      })
      .catch(() => {
        if (active)
          setStorageError(
            "Saved demo could not be restored. A fresh preview is open.",
          );
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const update = (next: AppData) => {
    if (!ready) return;
    setData(next);
    // Serialize writes so a slower older save cannot replace a newer edit.
    // Save deliberate edits only; a failed hydration must not overwrite saved data.
    writes.current = writes.current
      .then(() => AsyncStorage.setItem(KEY, JSON.stringify(next)))
      .then(() => setStorageError(""))
      .catch(() =>
        setStorageError(
          "Changes are available this session, but could not be saved on this device.",
        ),
      );
  };
  return (
    <Context.Provider
      value={{
        data,
        ready,
        storageError,
        update,
        reset: () => update(createSeedData()),
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useDemo() {
  const value = useContext(Context);
  if (!value) throw new Error("DemoProvider is required");
  return value;
}
