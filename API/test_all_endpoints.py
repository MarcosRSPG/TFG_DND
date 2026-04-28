#!/usr/bin/env python3
"""Script to test all API endpoints."""

import urllib.request
import json
import sys

BASE_URL = "http://localhost:8000"
token = None

def make_request(method, path, data=None, headers=None, auth_required=False):
    """Make HTTP request and return (status_code, body)."""
    global token
    if headers is None:
        headers = {}
    
    if auth_required and token:
        headers["Authorization"] = f"Bearer {token}"
    
    url = f"{BASE_URL}{path}"
    body = None
    if data:
        body = json.dumps(data).encode('utf-8')
        headers["Content-Type"] = "application/json"
    
    try:
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        with urllib.request.urlopen(req) as response:
            return response.status, response.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return None, str(e)

def test_endpoint(name, method, path, expected_status=200, data=None, auth_required=False):
    """Test an endpoint and print result."""
    status, body = make_request(method, path, data, auth_required=auth_required)
    success = status == expected_status
    status_symbol = "✓" if success else "✗"
    print(f"{status_symbol} {name}: {status} (expected {expected_status})")
    if not success:
        print(f"  Error: {body[:200]}")
    return success, body

def main():
    global token
    results = []
    
    # Test health (no auth)
    print("\n=== Testing Public Endpoints ===")
    results.append(test_endpoint("Health Check", "GET", "/health", 200))
    
    # Test login
    print("\n=== Testing Auth Endpoints ===")
    success, body = test_endpoint("Login", "POST", "/auth/login", 200, 
                                  data={"email": "admin@tfg.com", "password": "admin123"})
    results.append(success)
    if success:
        response = json.loads(body)
        token = response["access_token"]
        print(f"  Token obtained: {token[:50]}...")
    else:
        print("  LOGIN FAILED - Cannot continue with protected endpoints")
        return False
    
    # Test verify
    results.append(test_endpoint("Verify Token", "POST", "/auth/verify", 200, auth_required=True)[0])
    
    # Test backgrounds
    print("\n=== Testing GET Endpoints ===")
    results.append(test_endpoint("GET /backgrounds", "GET", "/backgrounds", 200, auth_required=True)[0])
    
    # Try to get a specific background if any exist
    _, backgrounds_body = make_request("GET", "/backgrounds", auth_required=True)
    try:
        backgrounds = json.loads(backgrounds_body)
        if backgrounds and len(backgrounds) > 0:
            bg_id = backgrounds[0]["id"]
            results.append(test_endpoint(f"GET /backgrounds/{bg_id}", "GET", f"/backgrounds/{bg_id}", 200, auth_required=True)[0])
        else:
            print("  No backgrounds found, skipping GET /backgrounds/{id}")
            results.append(True)  # Skip
    except:
        results.append(False)
    
    # Test other GET endpoints
    for endpoint in ["/items", "/monsters", "/spells", "/characters", "/races", "/classes", "/subclasses", "/traits", "/features"]:
        results.append(test_endpoint(f"GET {endpoint}", "GET", endpoint, 200, auth_required=True)[0])
    
    # Test CRUD on backgrounds
    print("\n=== Testing CRUD on Backgrounds ===")
    # POST
    new_bg = {
        "index": "test_background",
        "name": "Test Background",
        "url": "/api/backgrounds/test",
        "source": "test"
    }
    success, body = test_endpoint("POST /backgrounds", "POST", "/backgrounds", 201, data=new_bg, auth_required=True)
    results.append(success)
    bg_id = None
    if success:
        bg_id = json.loads(body)["id"]
        print(f"  Created background ID: {bg_id}")
    
    # PUT
    if bg_id:
        update_bg = {"name": "Updated Test Background"}
        results.append(test_endpoint("PUT /backgrounds/{id}", "PUT", f"/backgrounds/{bg_id}", 200, 
                                    data=update_bg, auth_required=True)[0])
        
        # DELETE
        results.append(test_endpoint("DELETE /backgrounds/{id}", "DELETE", f"/backgrounds/{bg_id}", 200, 
                                    auth_required=True)[0])
    else:
        results.extend([False, False])
    
    # Summary
    print("\n=== SUMMARY ===")
    total = len(results)
    passed = sum(1 for r in results if r is True)
    skipped = sum(1 for r in results if r == "SKIP")
    failed = total - passed - skipped
    
    print(f"Total tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Skipped: {skipped}")
    
    if failed > 0:
        print("\n❌ SOME TESTS FAILED")
        return False
    else:
        print("\n✅ ALL TESTS PASSED")
        return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
