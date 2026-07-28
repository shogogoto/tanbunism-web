import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HashLink, HashScrollRestoration, scrollToHash } from ".";

describe("HashLink", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("指定したidの要素へスクロールする", () => {
    const scrollIntoView = vi.fn();
    render(
      <div
        id="単文"
        ref={(node) => {
          if (node) {
            node.scrollIntoView = scrollIntoView;
          }
        }}
      />,
    );

    scrollToHash("#%E5%8D%98%E6%96%87");

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto" });
  });

  it("同じhashへのリンクを再度押してもスクロールする", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    render(
      <MemoryRouter initialEntries={["/resource/1#target"]}>
        <HashScrollRestoration />
        <HashLink to="/resource/1#target">対象へ</HashLink>
        <div
          id="target"
          ref={(node) => {
            if (node) {
              node.scrollIntoView = scrollIntoView;
            }
          }}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("link", { name: "対象へ" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto" });
  });
});
