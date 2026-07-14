import { render, screen, fireEvent, createEvent } from "@testing-library/react";
import { vi } from "vitest";
import { LayerOverview } from "./LayerOverview";
import { anchoredScroll } from "./layerOverviewZoom";
import { KEY_STROKE } from "../model/renderStyle";
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

  it("marks the selected key only on the active layer's block", () => {
    render(<LayerOverview layers={layers} activeIndex={0} selectedKeyId="L-r0-c0" />);

    const items = screen.getAllByRole("listitem");
    expect(items[0].querySelector('[data-key-id="L-r0-c0"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // The same position on a non-active layer must not read as selected.
    expect(items[1].querySelector('[data-key-id="L-r0-c0"]')).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("scrolls the active layer's block into view on open", () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    render(<LayerOverview layers={layers} activeIndex={2} />);

    expect(scrollIntoView).toHaveBeenCalled();
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollIntoView;
  });

  it("keeps the content point under the cursor fixed across a zoom change", () => {
    // Content x = (scroll 40 + pointer 60) / scale 1 = 100. After zooming to
    // scale 2 that point must stay under the same 60px offset: 100*2 - 60 = 140.
    expect(anchoredScroll(1, 2, 40, 60)).toBe(140);
    // Zooming back out is the exact inverse.
    expect(anchoredScroll(2, 1, 140, 60)).toBe(40);
  });

  it("shows the current zoom percentage and exposes it via aria-valuetext", () => {
    render(<LayerOverview layers={layers} activeIndex={0} />);

    const slider = screen.getByRole("slider", { name: /zoom/i });
    fireEvent.change(slider, { target: { value: "150" } });

    expect(slider).toHaveAttribute("aria-valuetext", "150%");
    expect(screen.getByText("150%")).toBeInTheDocument();
  });

  it("badges only the active layer's block", () => {
    render(<LayerOverview layers={layers} activeIndex={1} />);

    const items = screen.getAllByRole("listitem");
    expect(items[1]).toHaveTextContent("Active");
    expect(items[0]).not.toHaveTextContent("Active");
  });

  it("paints each mini-board's corner ticks in that block's own layer color", () => {
    render(<LayerOverview layers={layers} activeIndex={0} />);
    const items = screen.getAllByRole("listitem");

    layers.forEach((layer, i) => {
      const keyGroup = items[i].querySelector('[data-key-id="L-r0-c0"]')!;
      const tick = Array.from(keyGroup.querySelectorAll("path")).find(
        (p) => p.getAttribute("stroke") === layer.color,
      );
      expect(tick).toBeTruthy();
    });
  });

  it("renders the board-wide homing bar on every layer's block", () => {
    render(
      <LayerOverview layers={layers} activeIndex={0} homingKeys={new Set(["L-r0-c0"])} />,
    );
    const items = screen.getAllByRole("listitem");

    items.forEach((item) => {
      const keyGroup = item.querySelector('[data-key-id="L-r0-c0"]')!;
      expect(keyGroup.querySelector(`rect[fill="${KEY_STROKE}"]`)).toBeTruthy();
    });
  });
});
