import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { ActionMenu } from "./ActionMenu";

it("choosing a menu action closes the menu and restores trigger focus", () => {
  // Given an open action menu
  const onSelect = vi.fn();
  render(<ActionMenu label="Actions" actions={[{ label: "Run action", onSelect }]} />);
  const trigger = screen.getByRole("button", { name: "Actions" });
  fireEvent.click(trigger);

  // When the user chooses an action
  fireEvent.click(screen.getByRole("menuitem", { name: "Run action" }));

  // Then the action runs, the menu closes, and focus returns to its trigger
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("menu", { name: "Actions" })).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it("Escape closes an open menu and restores trigger focus", () => {
  // Given an open menu with focus on an action
  render(<ActionMenu label="Actions" actions={[{ label: "Run action", onSelect: vi.fn() }]} />);
  const trigger = screen.getByRole("button", { name: "Actions" });
  fireEvent.click(trigger);
  const action = screen.getByRole("menuitem", { name: "Run action" });
  action.focus();

  // When the user presses Escape
  fireEvent.keyDown(action, { key: "Escape" });

  // Then the menu closes and focus returns to its trigger
  expect(screen.queryByRole("menu", { name: "Actions" })).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it("clicking outside an open menu closes it and restores trigger focus", () => {
  // Given an open menu with focus on an action
  render(<ActionMenu label="Actions" actions={[{ label: "Run action", onSelect: vi.fn() }]} />);
  const trigger = screen.getByRole("button", { name: "Actions" });
  fireEvent.click(trigger);
  screen.getByRole("menuitem", { name: "Run action" }).focus();

  // When the user clicks outside the menu
  fireEvent.mouseDown(document.body);

  // Then the menu closes and focus returns to its trigger
  expect(screen.queryByRole("menu", { name: "Actions" })).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});
