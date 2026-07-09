import { render, screen, fireEvent, createEvent } from "@testing-library/react";
import { vi } from "vitest";
import { LayerOverview } from "./LayerOverview";
import type { Layer } from "../model/schema";

const layers: Layer[] = [
  { name: "Base", color: "#00e5ff", keys: { "L-r0-c0": { primary: "A" } } },
  { name: "Symbols", color: "#d4bbff", keys: {} },
  { name: "Nav", color: "#fec931", keys: {} },
];

function mockContainerWidth(width: number) {
  Object.defineProperty(HTMLDivElement.prototype, "clientWidth", {
    configurable: true,
    value: width,
  });
}

afterEach(() => {
  delete (HTMLDivElement.prototype as unknown as Record<string, unknown>).clientWidth;
});

function scaleOf(el: Element): number {
  const match = /scale\(([^)]+)\)/.exec((el as HTMLElement).style.transform);
  return match ? Number(match[1]) : NaN;
}

describe("LayerOverview", () => {
  it("renders one block per layer, in layer order, each with a keyboard canvas", () => {
    const { container } = render(<LayerOverview layers={layers} activeIndex={0} />);

    const boards = container.querySelectorAll('svg[aria-label="Sofle Choc keyboard"]');
    expect(boards).toHaveLength(3);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Base");
    expect(items[1]).toHaveTextContent("Symbols");
    expect(items[2]).toHaveTextContent("Nav");
  });

  it("labels each block header with the layer name and a color swatch", () => {
    render(<LayerOverview layers={layers} activeIndex={0} />);

    const items = screen.getAllByRole("listitem");
    const swatch = items[1].querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(swatch.style.background).toBe("rgb(212, 187, 255)");
  });

  it("highlights the active layer's block", () => {
    render(<LayerOverview layers={layers} activeIndex={1} />);

    const items = screen.getAllByRole("listitem");
    expect(items[1].style.borderColor).not.toBe(items[0].style.borderColor);
  });

  it("fits the opening zoom to a very narrow container by clamping to the 25% floor", () => {
    mockContainerWidth(10);
    render(<LayerOverview layers={layers} activeIndex={0} />);

    const list = screen.getByRole("list", { name: /all layers/i });
    expect(scaleOf(list.firstElementChild!)).toBeCloseTo(0.25);
  });

  it("fits the opening zoom to a very wide container by clamping to the 200% ceiling", () => {
    mockContainerWidth(100000);
    render(<LayerOverview layers={layers} activeIndex={0} />);

    const list = screen.getByRole("list", { name: /all layers/i });
    expect(scaleOf(list.firstElementChild!)).toBeCloseTo(2);
  });

  it("offers a zoom slider clamped to 25-200 that scales the stacked layers", () => {
    render(<LayerOverview layers={layers} activeIndex={0} />);

    const slider = screen.getByRole("slider", { name: /zoom/i }) as HTMLInputElement;
    expect(slider.min).toBe("25");
    expect(slider.max).toBe("200");

    fireEvent.change(slider, { target: { value: "150" } });

    const list = screen.getByRole("list", { name: /all layers/i });
    expect(scaleOf(list.firstElementChild!)).toBeCloseTo(1.5);
  });

  it("adjusts zoom on Ctrl+wheel and suppresses the browser's page zoom", () => {
    render(<LayerOverview layers={layers} activeIndex={0} />);

    const list = screen.getByRole("list", { name: /all layers/i });
    const before = scaleOf(list.firstElementChild!);
    const event = createEvent.wheel(list, { deltaY: -100, ctrlKey: true });
    fireEvent(list, event);

    expect(scaleOf(list.firstElementChild!)).toBeGreaterThan(before);
    expect(event.defaultPrevented).toBe(true);
  });

  it("adjusts zoom on Cmd(meta)+wheel too", () => {
    render(<LayerOverview layers={layers} activeIndex={0} />);

    const list = screen.getByRole("list", { name: /all layers/i });
    const before = scaleOf(list.firstElementChild!);
    fireEvent.wheel(list, { deltaY: 100, metaKey: true });

    expect(scaleOf(list.firstElementChild!)).toBeLessThan(before);
  });

  it("ignores plain wheel scrolling — no zoom change, no default suppression", () => {
    render(<LayerOverview layers={layers} activeIndex={0} />);

    const list = screen.getByRole("list", { name: /all layers/i });
    const before = scaleOf(list.firstElementChild!);
    const event = createEvent.wheel(list, { deltaY: -100 });
    fireEvent(list, event);

    expect(scaleOf(list.firstElementChild!)).toBeCloseTo(before);
    expect(event.defaultPrevented).toBe(false);
  });

  it("re-fits the zoom to width when the overview container is resized", () => {
    mockContainerWidth(10);
    render(<LayerOverview layers={layers} activeIndex={0} />);

    const list = screen.getByRole("list", { name: /all layers/i });
    expect(scaleOf(list.firstElementChild!)).toBeCloseTo(0.25);

    mockContainerWidth(100000);
    fireEvent(window, new Event("resize"));

    expect(scaleOf(list.firstElementChild!)).toBeCloseTo(2);
  });

  it("scrolls vertically instead of clipping when layers exceed the viewport height", () => {
    render(<LayerOverview layers={layers} activeIndex={0} />);

    const list = screen.getByRole("list", { name: /all layers/i });
    expect(list.style.overflowY).toBe("auto");
  });

  it("calls onPickKey with the owning layer's index and the key id when a key is clicked", () => {
    const onPickKey = vi.fn();
    render(<LayerOverview layers={layers} activeIndex={0} onPickKey={onPickKey} />);

    const items = screen.getAllByRole("listitem");
    fireEvent.click(items[1].querySelector('[data-key-id="L-r0-c0"]')!);

    expect(onPickKey).toHaveBeenCalledWith(1, "L-r0-c0");
  });
});
