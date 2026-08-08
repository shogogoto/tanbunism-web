import SearchBar from "~/shared/components/SearchBar";
import { useTanbunSearch } from "../SearchContext";
import TanbunSearchConfig from "./SearchConfig";

type Props = {
  isLoading?: boolean;
};

export default function TanbunSearchBar({ isLoading }: Props) {
  const {
    immediateParams: { q: immediateQ },
    setImmediateParams,
  } = useTanbunSearch();
  return (
    <SearchBar
      isLoading={isLoading}
      q={immediateQ}
      setQ={(s) => setImmediateParams((prev) => ({ ...prev, q: s }))}
    >
      <TanbunSearchConfig />
    </SearchBar>
  );
}
