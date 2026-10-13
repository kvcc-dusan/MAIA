// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { fitPopup } from "./fitPopup";

const rect = (top, bottom, left = 0, right = 300) => () => ({ top, bottom, left, right, width: right - left, height: bottom - top });

// box: a scrolling panel; anchor: the field; popup: the picker panel inside the field.
const setup = ({ panel, field, popupWidth, popupHeight }) => {
  const box = document.createElement("div");
  box.style.overflowY = "auto";
  box.getBoundingClientRect = rect(...panel);
  const anchor = document.createElement("div");
  anchor.getBoundingClientRect = rect(...field);
  const popup = document.createElement("div");
  Object.defineProperty(popup, "offsetParent", { value: anchor });
  Object.defineProperty(popup, "offsetWidth", { value: popupWidth });
  Object.defineProperty(popup, "offsetHeight", { value: popupHeight });
  box.append(anchor);
  anchor.append(popup);
  document.body.append(box);
  return popup;
};

describe("fitPopup", () => {
  afterEach(() => { document.body.innerHTML = ""; });

  it("leaves a popup that fits below alone", () => {
    const popup = setup({ panel: [0, 800], field: [100, 140], popupWidth: 200, popupHeight: 300 });
    fitPopup(popup);
    expect(popup.style.top).toBe("");
    expect(popup.style.left).toBe("");
  });

  it("opens upward when only the space above fits it", () => {
    const popup = setup({ panel: [0, 800], field: [600, 640], popupWidth: 200, popupHeight: 300 });
    fitPopup(popup);
    expect(popup.style.top).toBe("auto");
    expect(popup.style.bottom).toBe("calc(100% + 8px)");
  });

  it("slides up to end inside the panel when it fits neither way", () => {
    const popup = setup({ panel: [0, 500], field: [200, 240], popupWidth: 200, popupHeight: 400 });
    fitPopup(popup);
    // ends 8px above the panel bottom: 500 - 8 - 400 = 92, relative to the field top (200)
    expect(popup.style.top).toBe("-108px");
  });

  it("slides left when it is wider than the field and would run past the panel edge", () => {
    const popup = setup({ panel: [0, 800, 0, 300], field: [100, 140, 150, 300], popupWidth: 320, popupHeight: 200 });
    fitPopup(popup);
    // but never past the panel's left edge: 0 + 8 - 150 = -142
    expect(popup.style.left).toBe("-142px");
  });
});
