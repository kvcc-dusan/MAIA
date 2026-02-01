
import os
import time
from playwright.sync_api import sync_playwright

def verify_padding():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # 1280px width triggers lg breakpoint (usually 1024px+)
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        base_url = "http://localhost:5173/MAIA/"

        # Ensure verification dir exists
        if not os.path.exists("verification"):
            os.makedirs("verification")

        print("Navigating to Home...")
        page.goto(base_url)
        time.sleep(2) # Wait for load/animation
        page.screenshot(path="verification/01_home.png")

        # 2. Journal
        print("Navigating to Journal...")
        try:
            # The dock might be loaded after some time
            page.wait_for_selector('button[title="Journal"]', state="visible", timeout=5000)
            page.click('button[title="Journal"]')
            time.sleep(2)
            page.screenshot(path="verification/02_journal.png")
        except Exception as e:
            print(f"Failed to navigate to Journal: {e}")

        # 3. Opus (Projects)
        print("Navigating to Opus...")
        try:
            page.click('button[title="Opus"]')
            time.sleep(2)
            page.screenshot(path="verification/03_opus.png")
        except Exception as e:
            print(f"Failed to navigate to Opus: {e}")

        # 4. Codex (Notes)
        print("Navigating to Codex...")
        try:
            page.click('button[title="Codex"]')
            time.sleep(2)
            page.screenshot(path="verification/04_codex.png")

            # 5. Editor (Create Note)
            print("Creating Note to go to Editor...")
            # Click + button in Codex
            # The + button has text "+" inside span or similar.
            # In NotesPage.jsx:
            # <button onClick={onCreateNote} ... > <span ...>+</span> </button>
            # It has title "Add Note"? No title on button.
            # But it has "+" text.
            page.click('text="+"')
            time.sleep(2)
            page.screenshot(path="verification/05_editor.png")

        except Exception as e:
            print(f"Failed to navigate to Codex/Editor: {e}")

        browser.close()

if __name__ == "__main__":
    verify_padding()
