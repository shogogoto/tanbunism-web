import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { NameSpace } from "~/shared/generated/fastAPI.schemas";
import { LearningSummary } from ".";

describe("LearningSummary", () => {
  it("公開Resourceの統計をユーザー単位で集計する", () => {
    const namespace = {
      stats: {
        resource1: {
          n_char: 1200,
          n_sentence: 12,
          n_term: 4,
        },
        resource2: {
          n_char: 3456,
          n_sentence: 34,
          n_term: 10,
        },
      },
    } as unknown as NameSpace;

    render(<LearningSummary namespace={namespace} />);

    expect(screen.getByText("Resources").nextSibling).toHaveTextContent("2");
    expect(screen.getByText("単文").nextSibling).toHaveTextContent("46");
    expect(screen.getByText("用語").nextSibling).toHaveTextContent("14");
    expect(screen.getByText("文字").nextSibling).toHaveTextContent("4,656");
  });
});
