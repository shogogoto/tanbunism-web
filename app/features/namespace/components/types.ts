import type { TreeDataItem } from "~/shared/components/tree-view";
import type {
  MResource,
  ResourceStats,
} from "~/shared/generated/fastAPI.schemas";

type MResourceAuthors = MResource["authors"];
type MResourcePublished = MResource["published"];

export interface ExplorerTreeDataItem extends TreeDataItem {
  authors?: MResourceAuthors;
  published?: MResourcePublished;
  content_size?: ResourceStats | undefined;
  children?: ExplorerTreeDataItem[];
}
