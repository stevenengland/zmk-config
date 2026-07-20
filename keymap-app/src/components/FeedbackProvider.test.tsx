import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, vi } from "vitest";
import { FeedbackProvider, useFeedback } from "./FeedbackProvider";

afterEach(() => vi.useRealTimers());

function SuccessTrigger() {
  const feedback = useFeedback();
  return <button onClick={() => feedback.success("Saved keymap")}>Announce success</button>;
}

function ErrorTrigger() {
  const feedback = useFeedback();
  return <button onClick={() => feedback.error("Could not save file")}>Announce failure</button>;
}

it.each([
  [false, false],
  [true, true],
])("positions success feedback above the sheet only when it is open", (sheetOpen, shifted) => {
  // Given operation feedback at the current sheet state
  render(
    <FeedbackProvider sheetOpen={sheetOpen}>
      <SuccessTrigger />
    </FeedbackProvider>,
  );

  // When a successful operation is announced
  fireEvent.click(screen.getByRole("button", { name: /announce success/i }));

  // Then it appears at the global bottom-center position with the expected shift
  expect(screen.getByRole("status")).toHaveTextContent("Saved keymap");
  expect(screen.getByRole("status")).toHaveClass("km-feedback");
  if (shifted) expect(screen.getByRole("status")).toHaveClass("km-feedback--sheet-open");
  else expect(screen.getByRole("status")).not.toHaveClass("km-feedback--sheet-open");
});

it("dismisses success feedback after four seconds", () => {
  // Given a visible success notice
  vi.useFakeTimers();
  render(
    <FeedbackProvider sheetOpen={false}>
      <SuccessTrigger />
    </FeedbackProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /announce success/i }));

  // When four seconds elapse
  act(() => vi.advanceTimersByTime(4_000));

  // Then the success notice is dismissed
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it.each(["hover", "focus"])("pauses success dismissal during %s", (pauseMode) => {
  // Given a success notice with two seconds left
  vi.useFakeTimers();
  render(
    <FeedbackProvider sheetOpen={false}>
      <SuccessTrigger />
    </FeedbackProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /announce success/i }));
  act(() => vi.advanceTimersByTime(2_000));
  const notice = screen.getByRole("status");

  // When dismissal is paused longer than its remaining lifetime
  if (pauseMode === "hover") fireEvent.mouseEnter(notice);
  else fireEvent.focus(notice);
  act(() => vi.advanceTimersByTime(4_000));

  // Then it remains until the remaining two seconds elapse after resuming
  expect(notice).toBeInTheDocument();
  if (pauseMode === "hover") fireEvent.mouseLeave(notice);
  else fireEvent.blur(notice);
  act(() => vi.advanceTimersByTime(2_000));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("keeps operation failures announced until they are dismissed", () => {
  // Given a failed operation
  vi.useFakeTimers();
  render(
    <FeedbackProvider sheetOpen={false}>
      <ErrorTrigger />
    </FeedbackProvider>,
  );

  // When the failure is announced and time passes
  fireEvent.click(screen.getByRole("button", { name: /announce failure/i }));
  act(() => vi.advanceTimersByTime(10_000));

  // Then the alert persists until its accessible dismissal is activated
  expect(screen.getByRole("alert")).toHaveTextContent("Could not save file");
  fireEvent.click(screen.getByRole("button", { name: /dismiss notification/i }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
