import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { PushPermissionPrompt } from "./PushPermissionPrompt";

const enablePush = vi.fn();

vi.mock("./NotificationProvider", () => ({
  useNotifications: () => ({
    pushState: "available",
    enablePush,
  }),
}));

it("スマホ向け案内からユーザー操作で通知許可を要求する", async () => {
  enablePush.mockResolvedValue(true);
  const user = userEvent.setup();
  render(<PushPermissionPrompt />);

  await user.click(screen.getByRole("button", { name: "通知を許可" }));

  expect(enablePush).toHaveBeenCalledOnce();
});
