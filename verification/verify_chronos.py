from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Navigating...")
        page.goto("http://localhost:5173/MAIA/")

        print("Waiting for Home...")
        # Check that we are on the page
        expect(page.get_by_text("Home").first).to_be_visible()

        # Click the Chronos button in the Dock
        # The Dock is at the bottom. We can target the button inside the Dock.
        print("Clicking Chronos...")
        # Use first because there might be another button elsewhere
        chronos_btn = page.locator("button").filter(has_text="Chronos").first
        chronos_btn.click()

        # Wait for modal
        print("Waiting for Modal...")
        modal_header = page.locator("h2").filter(has_text="Chronos")
        expect(modal_header).to_be_visible(timeout=10000)

        page.screenshot(path="verification/chronos_modal.png")
        print("Screenshot saved to verification/chronos_modal.png")

        browser.close()

if __name__ == "__main__":
    run()
