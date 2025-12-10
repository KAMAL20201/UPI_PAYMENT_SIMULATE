#!/bin/bash

echo "🧪 Testing UPI Payment Backend Server"
echo "======================================"
echo ""

# Test Health Endpoint
echo "1. Testing Health Endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:3001/health)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$HEALTH_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Health check passed"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
else
  echo "❌ Health check failed (HTTP $HTTP_CODE)"
  echo "$BODY"
fi
echo ""

# Test Create Payment
echo "2. Testing Create Payment..."
PAYMENT_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST http://localhost:3001/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "upiId": "test@paytm",
    "amount": 100.50,
    "payerName": "Test User",
    "note": "Test payment"
  }')
HTTP_CODE=$(echo "$PAYMENT_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$PAYMENT_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ Payment created successfully"
  PAYMENT_ID=$(echo "$BODY" | jq -r '.data.id' 2>/dev/null)
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
  echo ""
  
  if [ ! -z "$PAYMENT_ID" ] && [ "$PAYMENT_ID" != "null" ]; then
    # Test Get Payment
    echo "3. Testing Get Payment..."
    GET_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
      http://localhost:3001/api/payments/$PAYMENT_ID)
    HTTP_CODE=$(echo "$GET_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    BODY=$(echo "$GET_RESPONSE" | sed '/HTTP_CODE/d')
    
    if [ "$HTTP_CODE" = "200" ]; then
      echo "✅ Get payment successful"
      echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    else
      echo "❌ Get payment failed (HTTP $HTTP_CODE)"
      echo "$BODY"
    fi
    echo ""
    
    # Test Get Status
    echo "4. Testing Get Payment Status..."
    STATUS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
      http://localhost:3001/api/payments/$PAYMENT_ID/status)
    HTTP_CODE=$(echo "$STATUS_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    BODY=$(echo "$STATUS_RESPONSE" | sed '/HTTP_CODE/d')
    
    if [ "$HTTP_CODE" = "200" ]; then
      echo "✅ Get status successful"
      echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    else
      echo "❌ Get status failed (HTTP $HTTP_CODE)"
      echo "$BODY"
    fi
    echo ""
    
    # Test Get Logs
    echo "5. Testing Get Payment Logs..."
    LOGS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
      http://localhost:3001/api/payments/$PAYMENT_ID/logs)
    HTTP_CODE=$(echo "$LOGS_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    BODY=$(echo "$LOGS_RESPONSE" | sed '/HTTP_CODE/d')
    
    if [ "$HTTP_CODE" = "200" ]; then
      echo "✅ Get logs successful"
      echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    else
      echo "❌ Get logs failed (HTTP $HTTP_CODE)"
      echo "$BODY"
    fi
    echo ""
    
    # Test Simulate Status
    echo "6. Testing Simulate Status (SUCCESS)..."
    SIMULATE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
      -X POST http://localhost:3001/api/payments/$PAYMENT_ID/simulate-status \
      -H "Content-Type: application/json" \
      -d '{"status": "SUCCESS", "message": "Payment completed"}')
    HTTP_CODE=$(echo "$SIMULATE_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    BODY=$(echo "$SIMULATE_RESPONSE" | sed '/HTTP_CODE/d')
    
    if [ "$HTTP_CODE" = "200" ]; then
      echo "✅ Simulate status successful"
      echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    else
      echo "❌ Simulate status failed (HTTP $HTTP_CODE)"
      echo "$BODY"
    fi
  fi
else
  echo "❌ Payment creation failed (HTTP $HTTP_CODE)"
  echo "$BODY"
fi
echo ""

echo "======================================"
echo "✅ Testing complete!"
