import { LoaderCircle } from "lucide-react";

type Props = {
  isLoading?: boolean;
  type?: "top" | "center-x";
};

export default function Loading({ isLoading = true, type }: Props) {
  if (!isLoading) {
    return null;
  }

  const circle = <LoaderCircle className="animate-spin" aria-hidden="true" />;
  if (type === "center-x" || type === undefined) {
    return (
      <output className="flex justify-center p-4" aria-label="読み込み中">
        {circle}
      </output>
    );
  }

  return (
    <output className="flex justify-center p-4" aria-label="読み込み中">
      <div className="flex items-center justify-center p-2 bg-background rounded-full shadow-lg">
        {circle}
      </div>
    </output>
  );
}
