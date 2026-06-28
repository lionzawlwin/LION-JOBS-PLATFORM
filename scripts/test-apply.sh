#!/usr/bin/env bash
# Test the POST /api/apply endpoint.
# Run from Git Bash or WSL: bash scripts/test-apply.sh
# The server must be running: npm run dev

BASE="${1:-http://localhost:3000}"

echo "=== LinkedIn mode ==="
curl -s -X POST "$BASE/api/apply" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test Candidate",
    "phone": "+959770000001",
    "position": "Senior Software Engineer",
    "jobId": "job-001",
    "mode": "linkedin",
    "linkedinUrl": "https://linkedin.com/in/testcandidate"
  }' | python -m json.tool 2>/dev/null || cat

echo ""
echo "=== Validation error (missing fields) ==="
curl -s -X POST "$BASE/api/apply" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"X"}' | python -m json.tool 2>/dev/null || cat

echo ""
echo "=== Health check: GET /api/jobs (first 1 job) ==="
curl -s "$BASE/api/jobs" | python -m json.tool 2>/dev/null | head -20 || cat
