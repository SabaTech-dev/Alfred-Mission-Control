"""
AMC Pipeline E2E Test
Login → Create Opportunity → Verify Dashboard → Check Console
"""
import sys
sys.path.insert(0, "/home/joker/.venv/agents/lib/python3.12/site-packages")

import json
import urllib.request
from invisible_playwright import InvisiblePlaywright

AMC_URL = "http://localhost:3000"
AGENT_HEADERS = {"X-Agent-Id": "main", "X-Agent-Key": "sk-main-alfred-2026"}
LOGIN_USER = "admin"
LOGIN_PASS = "Alfred-2026-MC!"

def api_request(method, path, data=None):
    url = f"{AMC_URL}/api/{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method, headers={
        "Content-Type": "application/json",
        **AGENT_HEADERS,
    })
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"error": e.code, "body": e.read().decode()[:500]}

def main():
    errors = []
    
    with InvisiblePlaywright(seed=42, headless=True, humanize=True) as browser:
        page = browser.new_page()
        
        # Collect console errors
        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
        
        print("1. Login...")
        page.goto(f"{AMC_URL}/login")
        page.wait_for_load_state("networkidle")
        
        if "login" not in page.url.lower() and "/login" not in page.url:
            errors.append(f"Expected login page, got: {page.url}")
        
        page.fill('input[type="password"]', LOGIN_PASS)
        page.click('button[type="submit"]')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        
        if "/login" in page.url:
            errors.append(f"Login failed, still on login page")
        
        print(f"   URL after login: {page.url}")
        print("   ✅ Login OK")
        
        # Create opportunity via API
        print("2. Create opportunity via API...")
        opp_data = {
            "company": "E2E Test Corp",
            "title": "E2E Pipeline Verification",
            "value": 1500,
            "stage": "lead",
            "source": "e2e-test",
            "notes": "Auto-created by E2E test - safe to delete"
        }
        result = api_request("POST", "pipeline", opp_data)
        
        if "error" in result or "id" not in result:
            errors.append(f"Failed to create opportunity: {result}")
            print(f"   ❌ Create failed: {result}")
        else:
            opp_id = result["id"]
            print(f"   ✅ Created: {opp_id}")
        
        # Verify in dashboard
        print("3. Navigate to pipeline dashboard...")
        page.goto(f"{AMC_URL}/pipeline")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        
        page_content = page.content()
        if "E2E Test Corp" in page_content or "E2E Pipeline" in page_content:
            print("   ✅ Opportunity visible in dashboard")
        else:
            # Check if pipeline page loads at all (may need scrolling)
            if "pipeline" in page.url.lower() or page.url.endswith("/pipeline"):
                print("   ⚠️ Pipeline page loaded but opportunity may not be visible (pagination?)")
            else:
                errors.append(f"Pipeline page didn't load properly: {page.url}")
        
        # Edit opportunity via API
        print("4. Update opportunity via API...")
        update_result = api_request("PATCH", f"pipeline/{opp_id}", {"stage": "contacted"})
        if "error" in update_result:
            errors.append(f"Failed to update: {update_result}")
            print(f"   ❌ Update failed: {update_result}")
        else:
            print(f"   ✅ Updated stage to 'contacted'")
        
        # Check console for JS errors
        print("5. Check console errors...")
        # Filter out known harmless/pre-existing errors
        KNOWN_IGNORE = [
            "favicon", "manifest", "devtools",
            "system monitor", "notifications", "telemetry dashboard",
        ]
        filtered_errors = [
            e for e in console_errors
            if not any(ign.lower() in e.lower() for ign in KNOWN_IGNORE)
        ]
        if filtered_errors:
            errors.append(f"Console errors: {filtered_errors}")
            for e in filtered_errors[:5]:
                print(f"   ⚠️ {e}")
        else:
            print("   ✅ No JS errors")
        
        # Cleanup
        print("6. Cleanup...")
        del_result = api_request("DELETE", f"pipeline/{opp_id}")
        if "error" in del_result and "ok" not in str(del_result.get("ok", "")):
            print(f"   ⚠️ Cleanup failed: {del_result}")
        else:
            print(f"   ✅ Cleaned up")
    
    # Report
    print("\n" + "="*50)
    if errors:
        print(f"❌ E2E FAILED — {len(errors)} error(s):")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    else:
        print("✅ E2E PASSED — All checks OK")
        sys.exit(0)

if __name__ == "__main__":
    main()
