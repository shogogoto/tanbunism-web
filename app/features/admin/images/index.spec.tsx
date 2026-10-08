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
  it("deletes all eligible images across pages without selection, in batches", async () => {
    const orphans = Array.from({ length: 101 }, (_, index) => ({
      public_id: `avatar/orphan-${index}`,
      bytes: 1000,
      referenced: false,
      can_delete: true,
    }));
    const live = {
      public_id: "avatar/live",
      bytes: 1000,
      referenced: true,
      can_delete: false,
    };
    const outside = {
      public_id: "other/image",
      bytes: 1000,
      referenced: false,
      can_delete: false,
    };
    vi.mocked(imageRequest).mockImplementation(async (path, options) => {
      if (path === "/admin/images/delete") {
        const { public_ids } = JSON.parse(options?.body as string);
        return { deleted: public_ids, skipped: [] };
      }
      return {
        resources: path.includes("cursor=")
          ? [...orphans.slice(100), outside]
          : [...orphans.slice(0, 100), live],
        next_cursor: path.includes("cursor=") ? null : "page/2",
        pending: 0,
        retrying: 0,
      };
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<ImageManager />);
    const button = await screen.findByRole("button", {
      name: "未参照画像101件をすべて削除",
    });
    expect(imageRequest).toHaveBeenCalledWith("/admin/images?cursor=page%2F2");
    await user.click(button);
    expect(imageRequest).toHaveBeenCalledTimes(2);
    confirm.mockReturnValue(true);
    await user.click(button);
    await waitFor(() => expect(imageRequest).toHaveBeenCalledTimes(6));
    const batches = vi
      .mocked(imageRequest)
      .mock.calls.filter(([path]) => path === "/admin/images/delete")
      .map(([, options]) => JSON.parse(options?.body as string).public_ids);
    expect(batches.map((batch) => batch.length)).toEqual([100, 1]);
    expect(batches.flat()).toEqual(orphans.map((image) => image.public_id));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("101件"));
  });

  it("shows load failures without enabling deletion", async () => {
    vi.mocked(imageRequest).mockRejectedValueOnce(new Error("一覧の取得失敗"));
    render(<ImageManager />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "一覧の取得失敗",
    );
    expect(
      screen.getByRole("button", { name: "未参照画像0件をすべて削除" }),
    ).toBeDisabled();
  });

  it("automatically loads images and protects referenced avatars", async () => {
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
    expect(imageRequest).toHaveBeenCalledWith("/admin/images");
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
