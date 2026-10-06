import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppData, createSeedData, isAppData } from "./domain";
import { defaultGuide, GuideProgress, isGuideProgress } from "./sam";
import {
  isReplyDrafts,
  ReplyDrafts,
  setConversationDraft,
} from "./reply-drafts";

const KEY = "@textmunication/demo/v1";
const GUIDE_KEY = "@textmunication/sam-guide/v1";
const REPLY_DRAFTS_KEY = "@textmunication/reply-drafts/v1";
type Store = {
  data: AppData;
  ready: boolean;
  storageError: string;
  update: (next: AppData) => Promise<boolean>;
  reset: () => void;
  guide: GuideProgress;
  completeGuide: (step: string) => void;
  showGuide: (show: boolean) => void;
  replyDrafts: ReplyDrafts;
  setReplyDraft: (
    conversationId: string,
    text: string,
    expectedCurrentText?: string,
  ) => void;
};
const Context = createContext<Store | null>(null);

export function DemoProvider({ children }: React.PropsWithChildren) {
  const [data, setData] = useState(createSeedData);
  const dataRef = useRef(data);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [guide, setGuide] = useState<GuideProgress>({
    ...defaultGuide,
    completed: [],
  });
  const guideRef = useRef(guide);
  const [replyDrafts, setReplyDrafts] = useState<ReplyDrafts>({});
  const replyDraftsRef = useRef(replyDrafts);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    const loadData = AsyncStorage.getItem(KEY)
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
            "Saved demo could not be restored. A fresh preview is open.",
          );
      });
    const loadGuide = AsyncStorage.getItem(GUIDE_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (!isGuideProgress(parsed)) return;
        guideRef.current = parsed;
        setGuide(parsed);
      })
      .catch(() => {
        /* Guide preferences are optional; leave the fresh guide visible. */
      });
    const loadReplyDrafts = AsyncStorage.getItem(REPLY_DRAFTS_KEY)
      .then(async (raw) => {
        await loadData;
        if (!active || !raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (
          !isReplyDrafts(
            parsed,
            dataRef.current.conversations.map(
              (conversation) => conversation.id,
            ),
          )
        )
          throw new Error("Invalid saved reply drafts");
        replyDraftsRef.current = parsed;
        setReplyDrafts(parsed);
      })
      .catch(() => {
        if (active)
          setStorageError(
            "Saved reply drafts could not be restored. Their stored copy has not been changed.",
          );
      });
    Promise.all([loadData, loadGuide, loadReplyDrafts]).finally(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);
  const update = (next: AppData) => {
    if (!ready) return Promise.resolve(false);
    dataRef.current = next;
    setData(next);
    // Serialize writes so a slower older save cannot replace a newer edit.
    // Save deliberate edits only; a failed hydration must not overwrite saved data.
    const saved = writes.current
      .then(() => AsyncStorage.setItem(KEY, JSON.stringify(next)))
      .then(() => {
        setStorageError("");
        return true;
      })
      .catch(() => {
        setStorageError(
          "Changes are available this session, but could not be saved on this device.",
        );
        return false;
      });
    writes.current = saved.then(() => undefined);
    return saved;
  };
  const saveGuide = (next: GuideProgress) => {
    if (!ready) return;
    guideRef.current = next;
    setGuide(next);
    writes.current = writes.current
      .then(() => AsyncStorage.setItem(GUIDE_KEY, JSON.stringify(next)))
      .catch(() =>
        setStorageError(
          "Your guide preference could not be saved on this device.",
        ),
      );
  };
  const saveReplyDrafts = (next: ReplyDrafts) => {
    if (!ready) return;
    replyDraftsRef.current = next;
    setReplyDrafts(next);
    // Only intentional typing, successful replies, or reset write this key.
    // Never overwrite the saved map with an empty hydration fallback.
    writes.current = writes.current
      .then(() => AsyncStorage.setItem(REPLY_DRAFTS_KEY, JSON.stringify(next)))
      .catch(() =>
        setStorageError(
          "Your reply draft is available this session, but could not be saved on this device.",
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
        reset: () => {
          update(createSeedData());
          saveGuide({ hidden: false, completed: [] });
          saveReplyDrafts({});
        },
        guide,
        completeGuide: (step) => {
          const current = guideRef.current;
          if (
            ["writer", "campaign", "reply"].includes(step) &&
            !current.completed.includes(step)
          )
            saveGuide({ ...current, completed: [...current.completed, step] });
        },
        showGuide: (show) => saveGuide({ ...guideRef.current, hidden: !show }),
        replyDrafts,
        setReplyDraft: (conversationId, text, expectedCurrentText) => {
          if (!ready) return;
          // An awaited save must not clear newer text typed while it was pending.
          if (
            expectedCurrentText !== undefined &&
            replyDraftsRef.current[conversationId] !== expectedCurrentText
          )
            return;
          saveReplyDrafts(
            setConversationDraft(
              replyDraftsRef.current,
              dataRef.current.conversations.map(
                (conversation) => conversation.id,
              ),
              conversationId,
              text,
            ),
          );
        },
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
