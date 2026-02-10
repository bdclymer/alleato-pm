#!/bin/bash

# Test CSV Export Endpoint
echo "Testing CSV Export Endpoint..."

# Get authenticated session cookie (using test credentials)
echo "Step 1: Testing unauthenticated request..."
curl -v "http://localhost:8051/api/projects/31/change-orders/export/csv" \
  -H "Accept: text/csv" \
  2>&1 | grep -E "HTTP|Content-Type|Content-Disposition" | head -10

echo ""
echo "Done!"
