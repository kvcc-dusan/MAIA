from playwright.sync_api import sync_playwright
import time

def verify_accessibility(page):
    print("Navigating to Home...")
    page.goto("http://localhost:5173/MAIA/")

    # Wait for Dock to load
    try:
        page.wait_for_selector("button[aria-label='Opus']", timeout=10000)
    except:
        print("Timeout waiting for Opus button. Dumping page content.")
        print(page.content())
        raise

    print("Checking Dock ARIA labels...")
    # Check 'Opus' button
    opus_btn = page.locator("button[aria-label='Opus']")
    if not opus_btn.is_visible():
        raise Exception("Opus button with aria-label not found")

    # Check 'Journal' button
    journal_btn = page.locator("button[aria-label='Journal']")
    if not journal_btn.is_visible():
        raise Exception("Journal button with aria-label not found")

    print("Checking Focus Ring...")
    # Focus on Opus button
    opus_btn.focus()
    # Take screenshot of Dock area.
    # Since Dock is fixed bottom, we just screenshot the whole page or viewport.
    page.screenshot(path="/home/jules/verification/focus_ring.png")
    print("Screenshot taken: focus_ring.png")

    print("Navigating to Graph Page...")
    # Navigate via Dock
    graph_btn = page.locator("button[aria-label='Connexa']")
    graph_btn.click()

    # Wait for Graph page url change
    # Note: URL might not change if using hash routing or internal state,
    # but Dock usually triggers state change.
    # App.jsx: onNavigate("graph") -> setCurrentPage("graph")
    # This renders GraphPage component. URL path might remain /MAIA/ unless updated.
    # The prompt memory says "custom state-based router ... rather than React Router".
    # So URL probably doesn't change path, but query params might? Or nothing.
    # We should wait for Graph Controls button to appear.

    print("Waiting for Graph Controls...")
    try:
        page.wait_for_selector("button[aria-label='Toggle Graph Controls']", timeout=10000)
    except:
        print("Timeout waiting for Graph Toggle.")
        raise

    print("Checking Graph Controls Visibility...")
    # Toggle button
    toggle_btn = page.locator("button[aria-label='Toggle Graph Controls']")
    if not toggle_btn.is_visible():
        raise Exception("Graph Toggle button not visible")

    # Check if panel is hidden.
    # We look for "Graph Controls" title text which is inside the panel.
    controls_title = page.get_by_text("Graph Controls", exact=True)

    # It should NOT be visible initially
    if controls_title.is_visible():
        print("WARNING: Graph Controls title is visible, but should be hidden!")
        raise Exception("Graph Controls panel is visible when it should be closed")
    else:
        print("PASS: Graph Controls title is hidden.")

    print("Opening Graph Controls...")
    toggle_btn.click()
    time.sleep(1) # Wait for transition

    if not controls_title.is_visible():
        raise Exception("Graph Controls should be visible now")

    print("Closing Graph Controls...")
    # Close button
    close_btn = page.locator("button[aria-label='Close Controls']")
    close_btn.click()
    time.sleep(1)

    if controls_title.is_visible():
        raise Exception("Graph Controls should be hidden again")

    print("PASS: Graph Controls visibility toggles correctly.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_accessibility(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
