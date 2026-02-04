from playwright.sync_api import sync_playwright, expect
import time

def verify_weather(page):
    print("Navigating to home...")
    page.goto("http://localhost:5173/")

    print("Waiting for weather data...")

    try:
        # Check if temp is displayed (e.g. "5°")
        page.locator("text=/\\d+°/").wait_for(timeout=20000)
        print("Temperature found.")
    except Exception as e:
        print("Timeout waiting for temperature.", e)

    # Take screenshot
    page.screenshot(path="verification/weather_paris.png")
    print("Screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            permissions=["geolocation"],
            geolocation={"latitude": 48.8584, "longitude": 2.2945}, # Paris
            locale="en-US"
        )
        page = context.new_page()
        try:
            verify_weather(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
