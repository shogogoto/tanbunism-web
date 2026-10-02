import type {
  MResource,
  ResourceStats,
} from "~/shared/generated/fastAPI.schemas";

export interface ExplorerTreeDataItem {
  id: string;
  name: string;
  isResource: boolean;
  entryId?: string;
  authors?: MResource["authors"];
  published?: MResource["published"];
  stats?: ResourceStats;
  resourceCount: number;
  children?: ExplorerTreeDataItem[];
}
