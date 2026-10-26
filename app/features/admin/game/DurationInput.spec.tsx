import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import DurationInput from "./DurationInput";

it("switches persistence to infinity and back without retaining a hidden required numeric input", async () => {
  function Demo() {
    const [duration, setDuration] = useState<number | "infinite">(5);
    return (
      <DurationInput value={duration} onChange={setDuration} label="持続数" />
    );
  }
  const user = userEvent.setup();
  render(<Demo />);
  expect(screen.getByLabelText("持続数", { exact: true })).toHaveValue(5);
  await user.selectOptions(screen.getByLabelText("持続数の指定"), "infinite");
  expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("持続数の指定"), "finite");
  expect(screen.getByRole("spinbutton")).toHaveValue(3);
  expect(screen.getByRole("spinbutton")).toHaveAttribute("max", "20");
});
