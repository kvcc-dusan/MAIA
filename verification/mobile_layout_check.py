import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173/MAIA/"

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mobile viewport
        context = browser.new_context(viewport={"width": 375, "height": 667})
        page = context.new_page()

        print("Navigating to Home...")
        try:
            page.goto(BASE_URL)
            page.wait_for_selector('h1', timeout=10000) # Wait for greeting
        except Exception as e:
            print(f"Error loading page: {e}")
            return

        # 1. Check WorldMapWidget and FocusWidget
        print("Checking Widgets...")

        map_widget = page.locator("text=EUROPE/LJUBLJANA")
        if map_widget.count() > 0:
             print("WorldMapWidget found.")
             box = map_widget.bounding_box()
             print(f"WorldMapWidget pos: {box}")
        else:
             print("WorldMapWidget NOT found.")

        focus_widget = page.locator("text=Today's Focus")
        if focus_widget.count() > 0:
            print("FocusWidget found.")
            box = focus_widget.bounding_box()
            print(f"FocusWidget pos: {box}")
        else:
            print("FocusWidget NOT found.")

        # 2. Check CommandPalette
        print("\nChecking CommandPalette...")
        page.keyboard.press("Control+k")
        time.sleep(1)

        palette_input = page.locator("input[placeholder='Type a command or search notes...']")
        if palette_input.is_visible():
            print("CommandPalette visible.")
            container = page.locator(".glass-panel")
            box = container.bounding_box()
            print(f"CommandPalette container box: {box}")

            if box['width'] > 375:
                 print(f"FAIL: CommandPalette width ({box['width']}) > viewport width (375)!")
            elif box['x'] < 0:
                 print(f"FAIL: CommandPalette starts off-screen (x={box['x']})!")
            else:
                 print("PASS: CommandPalette fits in viewport.")

            page.keyboard.press("Escape")
        else:
            print("CommandPalette NOT visible.")

        time.sleep(0.5)

        # 3. Check ChronosModal
        print("\nChecking ChronosModal...")
        btn = page.locator("button[aria-label='Open Chronos Dashboard']")
        if btn.is_visible():
            btn.click()
            time.sleep(1)

            modal_title = page.locator("h2:has-text('Chronos')")
            if modal_title.is_visible():
                print("ChronosModal visible.")

                tasks_header = page.locator("h3:has-text('Tasks')")
                # Look for a day header in the calendar (right panel)
                right_panel_elem = page.locator("text=M").nth(0)

                if tasks_header.is_visible() and right_panel_elem.is_visible():
                     t_box = tasks_header.bounding_box()
                     r_box = right_panel_elem.bounding_box()

                     print(f"Tasks header y: {t_box['y']}")
                     print(f"Right panel element y: {r_box['y']}")

                     # Check stacking: Right panel element should be below Tasks header
                     # Tasks header is top of left panel.
                     # If side-by-side, y should be similar (both at top).
                     # If stacked, r_box.y should be significantly larger than t_box.y (half height down).

                     if r_box['y'] > t_box['y'] + 200:
                         print("PASS: Layout is Stacked (Single Column).")
                     else:
                         print("FAIL: Layout appears to be Side-by-Side.")
                else:
                    print("Could not find headers to compare layout.")
            else:
                print("ChronosModal NOT visible after click.")
        else:
            print("Open Chronos button not found.")

        browser.close()

if __name__ == "__main__":
    run()
