import { render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { AdminActionStatus, adminFeedback } from "./AdminFeedback";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
afterEach(() => vi.clearAllMocks());

it("uses shared toast settings and notifies again for repeated saves", () => {
  expect(adminFeedback.success()).toBe("保存しました");
  adminFeedback.success();
  expect(toast.success).toHaveBeenCalledTimes(2);
  expect(toast.success).toHaveBeenLastCalledWith("保存しました", {
    duration: 4000,
    closeButton: true,
  });
  expect(adminFeedback.info("受付しました")).toBe("受付しました");
  expect(toast.info).toHaveBeenCalledWith("受付しました", {
    duration: 4000,
    closeButton: true,
  });
});

it("normalizes failures without exposing object strings and keeps them visible longer", () => {
  expect(adminFeedback.error(new Error("権限がありません"))).toBe(
    "権限がありません",
  );
  expect(toast.error).toHaveBeenLastCalledWith("権限がありません", {
    duration: 6000,
    closeButton: true,
  });
  expect(adminFeedback.error({ detail: [] }, "保存できませんでした")).toBe(
    "保存できませんでした",
  );
  expect(adminFeedback.error(new Error(""))).toBe("操作に失敗しました。");
  expect(toast.success).not.toHaveBeenCalled();
});

it("keeps the result marker non-visual without duplicate live announcements", () => {
  render(<AdminActionStatus message="更新しました" />);
  expect(screen.getByRole("status")).toHaveClass("sr-only");
  expect(screen.getByRole("status")).toHaveAttribute("aria-live", "off");
  expect(screen.getByText("更新しました")).toBeInTheDocument();
  expect(toast.success).not.toHaveBeenCalled();
});
