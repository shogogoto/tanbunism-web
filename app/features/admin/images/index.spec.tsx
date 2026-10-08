import { render, screen, waitFor } from "@testing-library/react";
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
          bytes: 1000,
          referenced: true,
          can_delete: false,
        },
        {
          public_id: "avatar/recent",
          bytes: 2000,
          referenced: false,
          can_delete: false,
        },
        {
          public_id: "avatar/orphan",
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
    expect(screen.getByLabelText("avatar/recent")).toBeDisabled();
    await user.click(screen.getByLabelText("avatar/orphan"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(imageRequest).mockResolvedValueOnce({
      scheduled: ["avatar/orphan"],
    });
    await user.click(
      screen.getByRole("button", { name: "選択した画像1件を削除予約" }),
    );
    await waitFor(() =>
      expect(imageRequest).toHaveBeenCalledWith(
        "/admin/images/cleanup",
        expect.objectContaining({
          body: JSON.stringify({ public_ids: ["avatar/orphan"] }),
        }),
      ),
    );
  });
});
