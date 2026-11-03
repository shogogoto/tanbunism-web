import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { sampleCatalog } from "~/features/game/catalog.fixtures";
import { adminFeedback } from "./AdminFeedback";
import CatalogEditor from "./game/CatalogEditor";
import ElementEditor from "./game/ElementEditor";
import SkillUsageEditor from "./game/SkillUsageEditor";
import TriggerEditor from "./game/TriggerEditor";

const server = setupServer(
  http.get("*/admin/game/catalog", () => HttpResponse.json(sampleCatalog)),
  http.put("*/admin/game/catalog", async ({ request }) =>
    HttpResponse.json(await request.json()),
  ),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  vi.spyOn(adminFeedback, "success").mockImplementation(
    (message) => message ?? "保存しました",
  );
  vi.spyOn(adminFeedback, "error").mockImplementation((reason, fallback) =>
    reason instanceof Error ? reason.message : (fallback ?? "失敗しました"),
  );
});
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

it.each([
  "skills",
  "enemies",
  "shop",
  "elements",
  "gambits",
  "specialties",
] as const)(
  "notifies save success and failure through common feedback: %s",
  async (kind) => {
    render(
      kind === "elements" ? (
        <ElementEditor />
      ) : kind === "gambits" ? (
        <TriggerEditor />
      ) : kind === "specialties" ? (
        <SkillUsageEditor />
      ) : (
        <CatalogEditor kind={kind} />
      ),
    );
    const user = userEvent.setup();
    const save = await screen.findByRole("button", { name: "保存" });
    await waitFor(() => expect(save).toBeEnabled());
    expect(adminFeedback.success).not.toHaveBeenCalled();
    await user.click(save);
    await waitFor(() => expect(adminFeedback.success).toHaveBeenCalledTimes(1));
    await user.click(save);
    await waitFor(() => expect(adminFeedback.success).toHaveBeenCalledTimes(2));
    server.use(
      http.put("*/admin/game/catalog", () =>
        HttpResponse.json({ detail: "保存に失敗しました" }, { status: 422 }),
      ),
    );
    await user.click(save);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "保存に失敗しました",
    );
    expect(adminFeedback.error).toHaveBeenCalledTimes(1);
    expect(adminFeedback.success).toHaveBeenCalledTimes(2);
  },
);
