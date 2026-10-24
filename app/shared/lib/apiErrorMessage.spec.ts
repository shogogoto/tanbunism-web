import { expect, it } from "vitest";
import { apiErrorMessage } from "./apiErrorMessage";

it.each([
  ["文字列エラー", "文字列エラー"],
  [{ detail: "既存エラー" }, "既存エラー"],
  [
    {
      detail: [
        {
          loc: ["body", "save"],
          msg: "MPが最大値を超えています。",
          input: "private",
        },
      ],
    },
    "MPが最大値を超えています。",
  ],
  [{ detail: { message: "準備に失敗しました。" } }, "準備に失敗しました。"],
  [
    { detail: [{ msg: "一件目" }, { msg: "二件目" }, { msg: "一件目" }] },
    "一件目\n二件目",
  ],
  [{ detail: { unknown: "private" } }, "処理できませんでした。"],
  [null, "処理できませんでした。"],
])("extracts a readable message from %j", (body, expected) => {
  expect(apiErrorMessage(body, "処理できませんでした。")).toBe(expected);
});
