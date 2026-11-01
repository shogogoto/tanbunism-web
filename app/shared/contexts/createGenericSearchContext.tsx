import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router";
import { useDebounce } from "~/shared/hooks/useDebounce";

// TValue は string, number, boolean, object など任意の型
export type ParamConfig<TValue> = {
  defaultValue: TValue;
  serialize: (value: TValue) => Record<string, string>; // state -> URLSearchParams
  deserialize: (searchParams: URLSearchParams) => TValue; // URLSearchParams -> state
};

// T は { q: string, orderBy: object } のような、検索パラメータ全体を表現する型
export type SearchParamsConfig<T extends Record<string, unknown>> = {
  [K in keyof T]: ParamConfig<T[K]>;
};

export function createGenericSearchContext<T extends Record<string, unknown>>(
  config: SearchParamsConfig<T>,
  debounceMs = 500,
) {
  type ContextType = {
    params: T;
    immediateParams: T;
    setImmediateParams: React.Dispatch<React.SetStateAction<T>>;
  };

  const Context = createContext<ContextType | undefined>(undefined);

  const Provider = ({ children }: React.PropsWithChildren) => {
    const [searchParams, setSearchParams] = useSearchParams();

    const [immediateParams, setImmediateParams] = useState<T>(() => {
      const initialState = {} as T;
      for (const key in config) {
        initialState[key] = config[key].deserialize(searchParams);
      }
      return initialState;
    });

    const debouncedParams = useDebounce(immediateParams, debounceMs);
    const previousUrlState = useRef(immediateParams);

    // state -> URL の同期
    // biome-ignore lint/correctness/useExhaustiveDependencies: `searchParams` 意図的に除外 state -> 古いurl に置き換えてしまうのを防ぐ
    useEffect(() => {
      const newUrlParams = new URLSearchParams(searchParams);
      for (const key in debouncedParams) {
        const value = debouncedParams[key];
        const defaultValue = config[key].defaultValue;

        // デフォルト値でない場合のみURLに含める (簡易的なdeep-equal)
        if (JSON.stringify(value) !== JSON.stringify(defaultValue)) {
          const serialized = config[key].serialize(value);
          for (const urlKey in serialized) {
            newUrlParams.set(urlKey, serialized[urlKey]);
          }
        }
      }
      newUrlParams.sort();

      const currentParams = new URLSearchParams(searchParams);
      currentParams.sort();

      if (newUrlParams.toString() !== currentParams.toString()) {
        setSearchParams(newUrlParams, { replace: true });
      }
    }, [debouncedParams]);

    // URL -> state の同期
    useEffect(() => {
      const newState = {} as T;
      for (const key in config) {
        const newValue = config[key].deserialize(searchParams);
        newState[key] = newValue;
      }
      // Pagination updates must not discard edits still waiting for debounce.
      if (
        JSON.stringify(newState) !== JSON.stringify(previousUrlState.current)
      ) {
        previousUrlState.current = newState;
        setImmediateParams(newState);
      }
    }, [searchParams, config]); // immediateParams を依存配列から外して無限ループを防止

    const value = useMemo(
      () => ({
        params: debouncedParams,
        immediateParams,
        setImmediateParams,
      }),
      [debouncedParams, immediateParams],
    );

    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

  const useSearch = () => {
    const context = useContext(Context);
    if (context === undefined) {
      throw new Error("useSearch must be used within a corresponding Provider");
    }
    return context;
  };

  return {
    SearchProvider: Provider,
    useSearch,
  };
}
