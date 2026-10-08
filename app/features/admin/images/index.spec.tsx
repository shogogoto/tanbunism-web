import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { imageRequest } from "~/features/user/ImageUploader/api";
import ImageManager from ".";

vi.mock("~/features/user/ImageUploader/api", () => ({ imageRequest: vi.fn() }));
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("admin images", () => {
  it("only allows explicit selection of eligible unreferenced avatars", async () => {
    vi.mocked(imageRequest).mockResolvedValue({
      resources: [
        {
          public_id: "avatar/live",
          url: "https://res.cloudinary.com/test/image/upload/v123/avatar/live.jpg",
          bytes: 1000,
          referenced: true,
          can_delete: false,
        },
        {
          public_id: "avatar/recent",
          bytes: 2000,
          referenced: false,
          can_delete: true,
        },
        {
          public_id: "avatar/orphan",
          url: "https://res.cloudinary.com/test/image/upload/v123/avatar/orphan.jpg",
          bytes: 3000,
          referenced: false,
          can_delete: true,
        },
      ],
      next_cursor: null,
      pending: 2,
      retrying: 1,
    });
    const user = userEvent.setup();
    render(<ImageManager />);
    expect(imageRequest).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "画像を確認・更新" }));
    expect(await screen.findByLabelText("avatar/live")).toBeDisabled();
    expect(screen.getByLabelText("avatar/recent")).not.toBeDisabled();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "avatar/orphan" })).toHaveAttribute(
      "src",
      expect.stringContaining("c_fit,w_320,h_320,q_auto,f_auto"),
    );
    expect(
      screen.getByRole("button", { name: "avatar/liveを削除" }),
    ).toBeDisabled();
    expect(screen.getByText("参照中")).toBeInTheDocument();
    expect(screen.getAllByText("未参照")).toHaveLength(2);
    const preview = screen.getByRole("img", { name: "avatar/orphan" });
    fireEvent.error(preview);
    expect(preview).toHaveAttribute(
      "src",
      "https://res.cloudinary.com/test/image/upload/v123/avatar/orphan.jpg",
    );
    fireEvent.error(preview);
    expect(
      screen.queryByRole("img", { name: "avatar/orphan" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("読み込み失敗")).toBeInTheDocument();
    fireEvent.mouseEnter(
      screen.getByRole("button", { name: "avatar/orphanのプレビュー" }),
    );
    expect(
      await screen.findByRole("img", { name: "avatar/orphanの拡大画像" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "avatar/orphanの画像を開く" }),
    ).toHaveAttribute(
      "href",
      "https://res.cloudinary.com/test/image/upload/v123/avatar/orphan.jpg",
    );
    await user.click(screen.getByLabelText("avatar/orphan"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(imageRequest).mockResolvedValueOnce({
      deleted: ["avatar/orphan"],
      skipped: [],
    });
    await user.click(
      screen.getByRole("button", { name: "選択した画像1件を削除" }),
    );
    await waitFor(() =>
      expect(imageRequest).toHaveBeenCalledWith(
        "/admin/images/delete",
        expect.objectContaining({
          body: JSON.stringify({ public_ids: ["avatar/orphan"] }),
        }),
      ),
    );
  });

  it("allows deleting one row with confirmation without selecting it", async () => {
    vi.mocked(imageRequest).mockResolvedValue({
      resources: [
        {
          public_id: "avatar/orphan",
          bytes: 1000,
          referenced: false,
          can_delete: true,
        },
      ],
      pending: 0,
      retrying: 0,
      next_cursor: null,
    });
    const user = userEvent.setup();
    render(<ImageManager />);
    await user.click(screen.getByRole("button", { name: "画像を確認・更新" }));
    const button = await screen.findByRole("button", {
      name: "avatar/orphanを削除",
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await user.click(button);
    expect(imageRequest).toHaveBeenCalledTimes(1);
    confirm.mockReturnValue(true);
    vi.mocked(imageRequest).mockResolvedValueOnce({
      deleted: ["avatar/orphan"],
      skipped: [],
    });
    await user.click(button);
    await waitFor(() =>
      expect(imageRequest).toHaveBeenCalledWith(
        "/admin/images/delete",
        expect.objectContaining({
          body: JSON.stringify({ public_ids: ["avatar/orphan"] }),
        }),
      ),
    );
  });

  it("opens the enlarged preview on tap without hover", async () => {
    vi.mocked(imageRequest).mockResolvedValue({
      resources: [
        {
          public_id: "avatar/test",
          url: "https://res.cloudinary.com/test/image/upload/v123/avatar/test.jpg",
          bytes: 1,
          referenced: false,
          can_delete: true,
        },
      ],
      pending: 0,
      retrying: 0,
      next_cursor: null,
    });
    const user = userEvent.setup({ skipHover: true });
    render(<ImageManager />);
    await user.click(screen.getByRole("button", { name: "画像を確認・更新" }));
    await user.click(
      await screen.findByRole("button", { name: "avatar/testのプレビュー" }),
    );
    expect(
      await screen.findByRole("img", { name: "avatar/testの拡大画像" }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        screen.queryByRole("img", { name: "avatar/testの拡大画像" }),
      ).not.toBeInTheDocument(),
    );
  });
});
