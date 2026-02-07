from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Listen for console messages, especially CSP errors
        console_messages = []
        page.on("console", lambda msg: console_messages.append(msg.text))

        # Also listen for unhandled exceptions
        page.on("pageerror", lambda err: console_messages.append(f"PAGE ERROR: {err}"))

        try:
            print("Navigating to http://localhost:5173/MAIA/...")
            page.goto("http://localhost:5173/MAIA/", timeout=60000)

            # Wait for something distinctive to load
            # From previous list_files, index.html has <title>Maia</title>
            # And it loads src/main.jsx -> likely some root component.
            # ChronosModal suggests "Chronos" text might be visible or accessible via modal.
            # Let's wait for body to be populated.
            page.wait_for_selector("#root", state="attached")

            # Wait a bit for JS execution
            page.wait_for_timeout(5000)

            # Take screenshot
            screenshot_path = "verification/screenshot.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

            # Check for CSP violations
            csp_violations = [msg for msg in console_messages if "Content Security Policy" in msg or "refused to load" in msg.lower()]

            if csp_violations:
                print("WARNING: Possible CSP violations found:")
                for v in csp_violations:
                    print(f"  - {v}")
            else:
                print("No obvious CSP violations in console.")

        except Exception as e:
            print(f"Error during verification: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
