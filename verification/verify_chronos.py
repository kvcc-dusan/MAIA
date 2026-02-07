from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print("Navigating to app...")
            page.goto("http://localhost:3000")
            page.wait_for_timeout(3000) # Wait for load

            # Click Chronos in Dock (it has aria-label="Chronos" or text "Chronos")
            # The error log showed:
            # 1) <button ...>...Chronos...</button> (exact=True)
            # 2) <button aria-label="Open Chronos Dashboard">...

            # Let's target the Dock one specifically. The Dock usually has role="navigation" or similar.
            # Or just use the exact text match if available.

            print("Clicking Chronos button...")
            page.get_by_role("button", name="Chronos", exact=True).click()

            page.wait_for_timeout(2000) # Wait for modal

            # Now inside modal. Look for "+" button next to "Tasks"
            # The heading "Tasks" is inside the modal.
            # <h3 ...>Tasks</h3>
            # <button ...>+</button>

            print("Clicking Add Task button...")
            # Use a more specific locator if possible.
            # The "+" button is inside the modal.
            # Let's use get_by_text("+", exact=True) if it's text.
            add_btn = page.get_by_role("button", name="+", exact=True).first
            add_btn.click()

            page.wait_for_timeout(2000) # Wait for form slide-in

            print("Taking screenshot...")
            page.screenshot(path="verification_chronos_form.png")
            print("Screenshot saved to verification_chronos_form.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification_error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
