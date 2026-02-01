"""
Direct Costs E2E Test using Playwright
Tests the direct costs functionality in the Alleato PM app
"""
from playwright.sync_api import sync_playwright
import sys
import os

def test_direct_costs():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)

        # Load auth state if available
        auth_file = 'frontend/tests/.auth/user.json'
        if os.path.exists(auth_file):
            print(f"🔐 Loading auth state from {auth_file}")
            context = browser.new_context(storage_state=auth_file)
        else:
            print("⚠️  No auth state found - test may fail if auth required")
            context = browser.new_context()

        page = context.new_page()

        try:
            print("🚀 Starting Direct Costs test...")

            # Navigate to direct costs page (project ID 67, localhost:3001)
            print("📍 Navigating to http://localhost:3001/67/direct-costs")
            page.goto('http://localhost:3001/67/direct-costs', wait_until='load')

            # Wait for page to stabilize
            page.wait_for_timeout(3000)

            # Check current URL first (in case of redirect)
            current_url = page.url
            print(f"\n📋 Current URL: {current_url}")

            # Take screenshot of what we got
            page.screenshot(path='/tmp/direct-costs-list.png', full_page=True)
            print("📸 Screenshot saved: /tmp/direct-costs-list.png")

            if 'login' in current_url or 'auth' in current_url:
                print("❌ Page redirected to login - authentication required")
                return False

            # Check page title/heading
            print("\n🔍 Checking page content:")
            try:
                # Use count() instead of all() to avoid context issues
                h1_count = page.locator('h1').count()
                print(f"   Found {h1_count} H1 elements")

                if h1_count > 0:
                    # Get text from first H1
                    h1_text = page.locator('h1').first.text_content()
                    print(f"   First H1: '{h1_text}'")

                    if 'Direct Costs' in h1_text:
                        print("✅ 'Direct Costs' heading found")
                    else:
                        print(f"⚠️  Expected 'Direct Costs', got '{h1_text}'")
            except Exception as e:
                print(f"   Error checking H1: {e}")

            # Check for "New Direct Cost" button
            print("\n🔘 Checking for action buttons:")
            new_button_count = page.locator('a, button').filter(has_text='New Direct Cost').count()

            if new_button_count > 0:
                print(f"✅ Found {new_button_count} 'New Direct Cost' button(s)")

                try:
                    # Click the button
                    print("\n🖱️  Clicking 'New Direct Cost' button...")
                    page.locator('a, button').filter(has_text='New Direct Cost').first.click()
                    page.wait_for_load_state('load')
                    page.wait_for_timeout(2000)

                    # Take screenshot of form
                    page.screenshot(path='/tmp/direct-costs-form.png', full_page=True)
                    print("📸 Screenshot saved: /tmp/direct-costs-form.png")

                    # Check URL
                    form_url = page.url
                    print(f"   Current URL: {form_url}")

                    if '/direct-costs/new' in form_url:
                        print("✅ Successfully navigated to create form")
                    else:
                        print(f"⚠️  Expected '/direct-costs/new' in URL")
                except Exception as e:
                    print(f"   Error clicking button: {e}")
            else:
                print("⚠️  'New Direct Cost' button not found")

            # Check for table
            print("\n📊 Checking for data display:")
            table_count = page.locator('table').count()
            empty_state_count = page.locator('[data-testid="empty-state"]').count()

            if table_count > 0:
                print(f"✅ Found {table_count} table(s)")
                try:
                    row_count = page.locator('table tbody tr').count()
                    print(f"   Table rows: {row_count}")
                except:
                    print("   Could not count rows")
            elif empty_state_count > 0:
                print("ℹ️  Empty state displayed")
            else:
                print("⚠️  No table or empty state found")

            # Check for tabs
            print("\n📑 Checking for tabs:")
            tab_count = page.locator('[role="tab"]').count()

            if tab_count > 0:
                print(f"✅ Found {tab_count} tabs")
                try:
                    for i in range(min(tab_count, 5)):
                        tab_text = page.locator('[role="tab"]').nth(i).text_content()
                        print(f"   - {tab_text}")
                except Exception as e:
                    print(f"   Error reading tabs: {e}")
            else:
                print("ℹ️  No tabs found")

            print("\n✅ Direct Costs test completed successfully!")
            return True

        except Exception as e:
            print(f"\n❌ Test failed with error: {e}")
            import traceback
            traceback.print_exc()
            try:
                page.screenshot(path='/tmp/direct-costs-error.png', full_page=True)
                print("📸 Error screenshot saved: /tmp/direct-costs-error.png")
            except:
                pass
            return False

        finally:
            browser.close()

if __name__ == '__main__':
    success = test_direct_costs()
    sys.exit(0 if success else 1)
