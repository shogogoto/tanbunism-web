import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { expect, it, vi } from "vitest";
import { NativeSelect } from "./native-select";

it("preserves native form submission, labels, required state and refs", async () => {
  const user = userEvent.setup();
  const ref = createRef<HTMLSelectElement>();
  render(
    <form aria-label="settings">
      <label htmlFor="element">属性</label>
      <NativeSelect
        ref={ref}
        id="element"
        name="element"
        required
        defaultValue=""
      >
        <option value="">選んでください</option>
        <option value="fire">炎</option>
        <option value="ice">氷</option>
      </NativeSelect>
    </form>,
  );
  const select = screen.getByRole("combobox", { name: "属性" });
  expect(ref.current).toBe(select);
  expect(select).toBeInvalid();
  await user.selectOptions(select, "ice");
  expect(select).toBeValid();
  const form = screen.getByRole("form", {
    name: "settings",
  }) as HTMLFormElement;
  expect(new FormData(form).get("element")).toBe("ice");
});

it("keeps controlled values and onChange behavior", async () => {
  function Example() {
    const [value, setValue] = useState("a");
    return (
      <NativeSelect
        aria-label="choice"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      >
        <option value="a">A</option>
        <option value="b">B</option>
      </NativeSelect>
    );
  }
  render(<Example />);
  const select = screen.getByRole("combobox");
  await userEvent.setup().selectOptions(select, "b");
  expect(select).toHaveValue("b");
});

it("allows layout overrides and forwards disabled, invalid and focus behavior", async () => {
  const onChange = vi.fn();
  render(
    <NativeSelect
      aria-label="choice"
      className="h-7 w-24 px-3"
      disabled
      aria-invalid
      onChange={onChange}
    >
      <option value="a">A</option>
      <option value="b">B</option>
    </NativeSelect>,
  );
  const select = screen.getByRole("combobox");
  expect(select).toHaveClass("h-7", "w-24", "px-3");
  expect(select).not.toHaveClass("h-9", "px-2");
  expect(select).toHaveAttribute("data-slot", "native-select");
  expect(select).toHaveAttribute("aria-invalid", "true");
  await userEvent.setup().selectOptions(select, "b");
  expect(onChange).not.toHaveBeenCalled();
});
