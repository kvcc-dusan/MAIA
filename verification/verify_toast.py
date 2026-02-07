from playwright.sync_api import sync_playwright, expect

def verify_toast(page):
    # 1. Load Home
    page.goto("http://localhost:3001/MAIA/")
    page.wait_for_load_state("networkidle")

    # 2. Open Chronos (Pulse)
    # The dock item with label "Chronos"
    page.get_by_role("button", name="Chronos", exact=True).click()

    # 3. Wait for Modal
    expect(page.get_by_role("heading", name="Chronos")).to_be_visible()

    # 4. Open Signal Form (Click + near Signals)
    # There are two "+" buttons. One for Tasks, one for Signals.
    # The Signals one is the second one or near "Signals" text.
    # Let's use a specific locator strategy.
    # Find heading "Signals" and find the button inside that group?
    # In ChronosModal, structure is:
    # <div class="flex items-center justify-between group py-2">
    #   <h3 ...>Signals</h3>
    #   <button ...>+</button>
    # </div>
    # So we can look for the button near text "Signals".

    # Actually, verify that app didn't crash first.
    page.screenshot(path="verification/step1_modal.png")

    # 5. Try to trigger a toast.
    # Let's try to create a Signal.
    # Click the "+" button next to "Signals"
    # Locate the container with "Signals" text
    signals_section = page.locator("div").filter(has_text="Signals").filter(has=page.locator("button", has_text="+")).last
    signals_section.get_by_role("button", name="+").click()

    # 6. Fill form
    page.get_by_placeholder("Signal name...").fill("Toast Test Signal")

    # 7. Create
    page.get_by_role("button", name="Create Signal").click()

    # 8. Expect Toast
    # Toast text contains "Signal set for"
    # Toast appears in fixed div at bottom.
    toast = page.locator("text=Signal set for")
    expect(toast).to_be_visible()

    # 9. Screenshot
    page.screenshot(path="verification/toast_verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_toast(page)
            print("Toast verification successful!")
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/failure.png")
        finally:
            browser.close()
