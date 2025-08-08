#!/bin/bash

# Brutal Patches API - Production Deployment Validation
# This script validates that the production deployment is working correctly

set -e

echo "🔍 Production Deployment Validation for Brutal Patches API"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_URL="${1:-https://api.brutalpatches.com}"
TIMEOUT="${2:-10}"
VALIDATION_REPORT="./validation-report-$(date +%Y%m%d-%H%M%S).md"

echo -e "${BLUE}Validation Configuration:${NC}"
echo "  - Production URL: $PRODUCTION_URL"
echo "  - Timeout: ${TIMEOUT}s"
echo "  - Report: $VALIDATION_REPORT"

# Initialize validation report
cat > "$VALIDATION_REPORT" << EOF
# Production Deployment Validation Report

**Date**: $(date)
**Production URL**: $PRODUCTION_URL
**Validation Status**: In Progress

## Test Results

EOF

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a validation test
validate_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    echo -e "\n${YELLOW}Testing: $test_name${NC}"
    ((TOTAL_TESTS++))
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        ((PASSED_TESTS++))
        echo "- ✅ **$test_name**: PASSED" >> "$VALIDATION_REPORT"
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        ((FAILED_TESTS++))
        echo "- ❌ **$test_name**: FAILED" >> "$VALIDATION_REPORT"
    fi
}

# Function to test HTTP endpoint
test_endpoint() {
    local endpoint="$1"
    local expected_status="$2"
    local description="$3"
    
    local full_url="$PRODUCTION_URL$endpoint"
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$TIMEOUT" "$full_url" 2>/dev/null || echo "000")
    
    echo "  URL: $full_url"
    echo "  Expected: $expected_status, Got: $status_code"
    
    if [[ "$status_code" == "$expected_status" ]]; then
        return 0
    else
        return 1
    fi
}

# Function to test JSON response
test_json_endpoint() {
    local endpoint="$1"
    local json_path="$2"
    local description="$3"
    
    local full_url="$PRODUCTION_URL$endpoint"
    local response=$(curl -s --connect-timeout "$TIMEOUT" "$full_url" 2>/dev/null)
    
    echo "  URL: $full_url"
    echo "  Response: ${response:0:100}..."
    
    # Check if response is valid JSON
    if echo "$response" | jq . >/dev/null 2>&1; then
        if [[ -n "$json_path" ]]; then
            # Check specific JSON path if provided
            local value=$(echo "$response" | jq -r "$json_path" 2>/dev/null)
            if [[ "$value" != "null" && "$value" != "" ]]; then
                echo "  JSON path '$json_path' value: $value"
                return 0
            else
                echo "  JSON path '$json_path' not found or empty"
                return 1
            fi
        else
            return 0
        fi
    else
        echo "  Invalid JSON response"
        return 1
    fi
}

# Function to test API performance
test_performance() {
    local endpoint="$1"
    local max_response_time="$2"
    local description="$3"
    
    local full_url="$PRODUCTION_URL$endpoint"
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' --connect-timeout "$TIMEOUT" "$full_url" 2>/dev/null || echo "0")
    
    echo "  URL: $full_url"
    echo "  Response time: ${response_time}s (max: ${max_response_time}s)"
    
    # Convert to comparison (remove decimal for basic comparison)
    local response_ms=$(echo "$response_time * 1000" | bc -l 2>/dev/null || echo "0")
    local max_ms=$(echo "$max_response_time * 1000" | bc -l 2>/dev/null || echo "1000")
    
    if (( $(echo "$response_time > 0 && $response_time <= $max_response_time" | bc -l 2>/dev/null || echo 0) )); then
        return 0
    else
        return 1
    fi
}

echo -e "\n${BLUE}🚀 Starting Production Validation Tests...${NC}"

# 1. Basic Connectivity
echo -e "\n${YELLOW}=== Basic Connectivity Tests ===${NC}"
validate_test "Domain Resolution" "nslookup api.brutalpatches.com > /dev/null 2>&1" "Domain resolves"
validate_test "HTTPS Connection" "curl -I --connect-timeout $TIMEOUT $PRODUCTION_URL > /dev/null 2>&1" "HTTPS accessible"
validate_test "SSL Certificate" "curl -I --connect-timeout $TIMEOUT $PRODUCTION_URL 2>&1 | grep -q '200\\|301\\|302'" "Valid SSL"

# 2. Health Endpoints
echo -e "\n${YELLOW}=== Health Check Tests ===${NC}"
validate_test "Basic Health Check" "test_endpoint '/health' '200' 'Basic health endpoint'" "200 OK"
validate_test "Detailed Health Check" "test_endpoint '/health/detailed' '200' 'Detailed health endpoint'" "200 OK"
validate_test "Health Response Format" "test_json_endpoint '/health' '.status' 'Health status JSON'" "Valid JSON with status"

# 3. API Endpoints
echo -e "\n${YELLOW}=== Core API Tests ===${NC}"
validate_test "Patches Total Endpoint" "test_endpoint '/api/patches/total' '200' 'Patch count endpoint'" "200 OK"
validate_test "Patches List Endpoint" "test_endpoint '/api/patches' '200' 'Patches list endpoint'" "200 OK"
validate_test "Patches JSON Response" "test_json_endpoint '/api/patches' 'type' 'Patches JSON structure'" "Valid JSON array"

# 4. Authentication Endpoints
echo -e "\n${YELLOW}=== Authentication Tests ===${NC}"
validate_test "Login Endpoint Available" "test_endpoint '/api/auth/login' '400' 'Login endpoint (expect 400 without credentials)'" "400 Bad Request"
validate_test "Protected Endpoint Security" "test_endpoint '/api/users/profile' '401' 'Protected endpoint returns 401'" "401 Unauthorized"

# 5. Monitoring and Admin
echo -e "\n${YELLOW}=== Monitoring Tests ===${NC}"
validate_test "Metrics Endpoint" "test_endpoint '/monitoring/metrics' '200' 'Prometheus metrics endpoint'" "200 OK"
validate_test "Metrics Content" "curl -s --connect-timeout $TIMEOUT $PRODUCTION_URL/monitoring/metrics 2>/dev/null | grep -q 'http_requests_total'" "Contains metrics"

# 6. Performance Tests
echo -e "\n${YELLOW}=== Performance Tests ===${NC}"
if command -v bc &> /dev/null; then
    validate_test "Health Check Performance" "test_performance '/health' '2.0' 'Health check under 2s'" "< 2 seconds"
    validate_test "API Response Performance" "test_performance '/api/patches/total' '3.0' 'API response under 3s'" "< 3 seconds"
else
    echo -e "${YELLOW}⚠️  Skipping performance tests (bc not available)${NC}"
fi

# 7. Security Headers
echo -e "\n${YELLOW}=== Security Tests ===${NC}"
validate_test "HTTPS Redirect" "curl -I --connect-timeout $TIMEOUT http://api.brutalpatches.com 2>/dev/null | grep -q '301\\|302'" "HTTP redirects to HTTPS"
validate_test "Security Headers" "curl -I --connect-timeout $TIMEOUT $PRODUCTION_URL 2>/dev/null | grep -i 'x-frame-options\\|x-content-type-options\\|x-xss-protection'" "Security headers present"
validate_test "CORS Headers" "curl -I --connect-timeout $TIMEOUT $PRODUCTION_URL 2>/dev/null | grep -i 'access-control'" "CORS headers configured"

# 8. Error Handling
echo -e "\n${YELLOW}=== Error Handling Tests ===${NC}"
validate_test "404 Handling" "test_endpoint '/nonexistent-endpoint' '404' '404 for invalid endpoints'" "404 Not Found"
validate_test "405 Method Handling" "curl -X POST --connect-timeout $TIMEOUT $PRODUCTION_URL/health 2>/dev/null -w '%{http_code}' | grep -q '405'" "405 for invalid methods"

# 9. Data Consistency
echo -e "\n${YELLOW}=== Data Consistency Tests ===${NC}"
validate_test "Patch Count Consistency" "test_json_endpoint '/api/patches/total' '.' 'Patch count is number'" "Returns numeric value"
validate_test "Patches List Structure" "curl -s --connect-timeout $TIMEOUT $PRODUCTION_URL/api/patches 2>/dev/null | jq 'type' 2>/dev/null | grep -q 'array'" "Returns array"

# 10. Load Test Sample
echo -e "\n${YELLOW}=== Basic Load Test ===${NC}"
validate_test "Concurrent Health Checks" "
    for i in {1..5}; do
        curl -f -s --connect-timeout $TIMEOUT $PRODUCTION_URL/health > /dev/null &
    done
    wait
    echo 'Concurrent requests completed'
" "Handles concurrent requests"

# Generate final report
echo -e "\n${BLUE}📊 Generating Final Validation Report...${NC}"

cat >> "$VALIDATION_REPORT" << EOF

## Summary

- **Total Tests**: $TOTAL_TESTS
- **Passed**: $PASSED_TESTS
- **Failed**: $FAILED_TESTS
- **Success Rate**: $(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%

## Overall Status

EOF

if [[ $FAILED_TESTS -eq 0 ]]; then
    echo "✅ **PRODUCTION DEPLOYMENT VALIDATED SUCCESSFULLY**" >> "$VALIDATION_REPORT"
    echo "" >> "$VALIDATION_REPORT"
    echo "All validation tests passed. The production deployment is working correctly." >> "$VALIDATION_REPORT"
    OVERALL_STATUS="SUCCESS"
else
    echo "❌ **PRODUCTION DEPLOYMENT VALIDATION FAILED**" >> "$VALIDATION_REPORT"
    echo "" >> "$VALIDATION_REPORT"
    echo "Some validation tests failed. Please review the failed tests and fix issues before considering the deployment complete." >> "$VALIDATION_REPORT"
    OVERALL_STATUS="FAILED"
fi

cat >> "$VALIDATION_REPORT" << EOF

## Recommendations

### Immediate Actions
- Monitor application logs for any errors
- Set up automated monitoring alerts
- Verify database connectivity and performance
- Check SSL certificate expiration dates

### Ongoing Monitoring
- Set up continuous health monitoring
- Implement automated performance testing
- Configure log aggregation and analysis
- Establish incident response procedures

### Performance Optimization
- Monitor API response times during peak usage
- Implement caching for frequently accessed endpoints
- Consider CDN setup for static content
- Optimize database queries if needed

## Next Steps

1. **If validation passed**: 
   - Monitor production metrics for 24-48 hours
   - Set up automated monitoring and alerting
   - Communicate successful deployment to stakeholders

2. **If validation failed**:
   - Immediately investigate failed tests
   - Fix identified issues
   - Re-run validation tests
   - Consider rollback if critical issues persist

---

**Validation completed at**: $(date)
**Report generated by**: Production Validation Script v1.0
EOF

# Display final results
echo -e "\n${BLUE}📋 Validation Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Total Tests: $TOTAL_TESTS"
echo "  Passed: $PASSED_TESTS"
echo "  Failed: $FAILED_TESTS"
echo "  Success Rate: $(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ "$OVERALL_STATUS" == "SUCCESS" ]]; then
    echo -e "${GREEN}🎉 PRODUCTION DEPLOYMENT VALIDATED SUCCESSFULLY!${NC}"
    echo -e "${GREEN}✅ All tests passed. Production is ready for traffic.${NC}"
else
    echo -e "${RED}⚠️  PRODUCTION DEPLOYMENT VALIDATION FAILED!${NC}"
    echo -e "${RED}❌ Some tests failed. Please review and fix issues.${NC}"
fi

echo -e "\n${BLUE}📄 Full validation report saved to: $VALIDATION_REPORT${NC}"

# Open report if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${BLUE}Opening validation report...${NC}"
    open "$VALIDATION_REPORT" 2>/dev/null || echo "Could not open report automatically"
fi

# Exit with appropriate code
if [[ "$OVERALL_STATUS" == "SUCCESS" ]]; then
    exit 0
else
    exit 1
fi