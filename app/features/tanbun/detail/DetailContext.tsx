import { createContext, useContext } from "react";
import type {
  MResource,
  UserReadPublic,
} from "~/shared/generated/fastAPI.schemas";

type DetailContextType = {
  user: UserReadPublic;
  resource: MResource;
} | null;

const DetailContext = createContext<DetailContextType>(null);

export const DetailContextProvider = DetailContext.Provider;

export function useDetailContext() {
  return useContext(DetailContext);
}
