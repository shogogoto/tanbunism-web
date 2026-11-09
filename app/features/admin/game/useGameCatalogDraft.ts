import {
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { adminFeedback } from "~/features/admin/AdminFeedback";
import { type GameCatalog, requestGameCatalog } from "~/features/game/catalog";

const identity = (catalog: GameCatalog) => catalog;

/** Local unsaved draft; shared transport/status only, never deletion or domain rules. */
export function useGameCatalogDraft(normalize = identity) {
  const [catalog, applyCatalog] = useState<GameCatalog>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const pending = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    const current = ++generation.current;
    applyCatalog(undefined);
    setError(undefined);
    setSaved(false);
    setSaving(false);
    pending.current = false;
    void requestGameCatalog(true)
      .then((loaded) => {
        if (generation.current === current) applyCatalog(normalize(loaded));
      })
      .catch((cause) => {
        if (generation.current === current)
          setError(
            cause instanceof Error
              ? cause.message
              : "設定を取得できませんでした。",
          );
      });
    return () => {
      generation.current++;
    };
  }, [normalize]);

  const markChanged = useCallback(() => {
    setSaved(false);
    setError(undefined);
  }, []);
  const setCatalog = useCallback(
    (action: SetStateAction<GameCatalog | undefined>) => {
      markChanged();
      applyCatalog((previous) => {
        const next = typeof action === "function" ? action(previous) : action;
        return next ? normalize(next) : next;
      });
    },
    [markChanged, normalize],
  );

  const save = async (next = catalog): Promise<boolean> => {
    if (!next || pending.current) return false;
    const current = generation.current;
    pending.current = true;
    setSaving(true);
    markChanged();
    try {
      const result = await requestGameCatalog(true, next);
      if (generation.current !== current) return false;
      applyCatalog(normalize(result));
      setSaved(true);
      adminFeedback.success();
      return true;
    } catch (cause) {
      if (generation.current === current)
        setError(adminFeedback.error(cause, "保存できませんでした。"));
      return false;
    } finally {
      if (generation.current === current) {
        pending.current = false;
        setSaving(false);
      }
    }
  };
  return {
    catalog,
    setCatalog,
    error,
    setError,
    saving,
    saved,
    markChanged,
    save,
  };
}
