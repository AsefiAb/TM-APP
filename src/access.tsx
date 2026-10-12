import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/** Device storage for the local session: who is using the app and their business. */
export const SESSION_KEY = "@textmunication/session/v1";

export type Business = { name: string; industry: string };

type Session = {
  signedIn: boolean;
  email: string;
  business: Business;
};

type Access = {
  /** False until the saved session has been read. */
  ready: boolean;
  mode: "welcome" | "workspace";
  email: string;
  business: Business;
  /** Finishes account creation and opens the workspace. */
  completeSetup: (email: string, business: Business) => void;
  /** Opens the workspace for a returning owner. */
  signIn: (email: string) => void;
  /** Returns to welcome. Workspace data stays on the device. */
  signOut: () => void;
  updateBusiness: (business: Business) => void;
};

const DEFAULT_BUSINESS: Business = { name: "Your business", industry: "Other" };
const DEFAULT_SESSION: Session = {
  signedIn: false,
  email: "",
  business: DEFAULT_BUSINESS,
};
const MAX_BUSINESS_LENGTH = 80;

function isSession(value: unknown): value is Session {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const record = value as Record<string, unknown>;
  const business = record.business as Record<string, unknown> | undefined;
  return (
    typeof record.signedIn === "boolean" &&
    typeof record.email === "string" &&
    record.email.length <= 254 &&
    typeof business === "object" &&
    business !== null &&
    typeof business.name === "string" &&
    business.name.trim().length > 0 &&
    business.name.length <= MAX_BUSINESS_LENGTH &&
    typeof business.industry === "string" &&
    business.industry.length <= 60
  );
}

function cleanBusiness(business: Business): Business {
  const name = business.name.trim().replace(/\s+/g, " ");
  return {
    name: name ? name.slice(0, MAX_BUSINESS_LENGTH) : DEFAULT_BUSINESS.name,
    industry: business.industry.trim() || DEFAULT_BUSINESS.industry,
  };
}

const AccessContext = createContext<Access | null>(null);

/**
 * A local session only. It records that the owner entered the workspace on this
 * device; it is not an authenticated SAM session or a security boundary.
 */
export function AccessProvider({ children }: React.PropsWithChildren) {
  const [session, setSession] = useState<Session>(DEFAULT_SESSION);
  const [ready, setReady] = useState(false);
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(SESSION_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (isSession(parsed)) setSession(parsed);
      })
      .catch(() => {
        /* A missing or unreadable session simply shows welcome. */
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const save = useCallback((next: Session) => {
    setSession(next);
    writes.current = writes.current
      .then(() => AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next)))
      .catch(() => {
        /* The session still works for this launch. */
      });
  }, []);

  const value = useMemo<Access>(
    () => ({
      ready,
      mode: session.signedIn ? "workspace" : "welcome",
      email: session.email,
      business: session.business,
      completeSetup: (email, business) =>
        save({
          signedIn: true,
          email: email.trim().slice(0, 254),
          business: cleanBusiness(business),
        }),
      signIn: (email) =>
        save({
          ...session,
          signedIn: true,
          email: email.trim().slice(0, 254) || session.email,
        }),
      signOut: () => save({ ...session, signedIn: false }),
      updateBusiness: (business) =>
        save({ ...session, business: cleanBusiness(business) }),
    }),
    [ready, session, save],
  );

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
}

export function useAccess() {
  const context = useContext(AccessContext);
  if (!context) throw new Error("AccessProvider is required");
  return context;
}
