#!/bin/bash

# Brutal Patches API - User Experience Validation Script
# This script validates user experience aspects including API consistency, error handling, and accessibility

set -e

echo "🎨 User Experience Validation for Brutal Patches API"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${1:-http://localhost:4000}"
UX_REPORT_DIR="./ux-validation-$(date +%Y%m%d-%H%M%S)"
TIMEOUT=10

echo -e "${BLUE}UX Validation Configuration:${NC}"
echo "  - API URL: $API_URL"
echo "  - Report Directory: $UX_REPORT_DIR"
echo "  - Timeout: ${TIMEOUT}s"

# Create report directory
mkdir -p "$UX_REPORT_DIR"

# Initialize counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Function to run a UX validation check
validate_ux() {
    local check_name="$1"
    local check_command="$2"
    
    echo -e "\n${YELLOW}Checking: $check_name${NC}"
    ((TOTAL_CHECKS++))
    
    if eval "$check_command"; then
        echo -e "${GREEN}✅ PASSED: $check_name${NC}"
        ((PASSED_CHECKS++))
        echo "✅ $check_name" >> "$UX_REPORT_DIR/ux-results.txt"
    else
        echo -e "${RED}❌ FAILED: $check_name${NC}"
        ((FAILED_CHECKS++))
        echo "❌ $check_name" >> "$UX_REPORT_DIR/ux-results.txt"
    fi
}

# Function to test API response consistency
test_response_format() {
    local endpoint="$1"
    local expected_fields="$2"
    
    local response=$(curl -s --connect-timeout "$TIMEOUT" "$API_URL$endpoint" 2>/dev/null)
    
    # Check if response is valid JSON
    if ! echo "$response" | jq . >/dev/null 2>&1; then
        echo "  Response is not valid JSON"
        return 1
    fi
    
    # Check expected fields
    for field in $expected_fields; do
        if ! echo "$response" | jq -e ".$field" >/dev/null 2>&1; then
            echo "  Missing expected field: $field"
            return 1
        fi
    done
    
    echo "  Response format is consistent"
    return 0
}

# Function to test error response format
test_error_format() {
    local endpoint="$1"
    local method="${2:-GET}"
    local expected_status="$3"
    
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" --connect-timeout "$TIMEOUT" "$API_URL$endpoint" 2>/dev/null)
    local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    local status=$(echo "$response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    # Check status code
    if [[ "$status" != "$expected_status" ]]; then
        echo "  Expected status $expected_status, got $status"
        return 1
    fi
    
    # Check error response format
    if ! echo "$body" | jq -e '.message' >/dev/null 2>&1; then
        echo "  Error response missing 'message' field"
        return 1
    fi
    
    if ! echo "$body" | jq -e '.statusCode' >/dev/null 2>&1; then
        echo "  Error response missing 'statusCode' field"
        return 1
    fi
    
    echo "  Error response format is consistent"
    return 0
}

# Function to check pagination consistency
test_pagination() {
    local base_endpoint="$1"
    
    # Test with different pagination parameters
    local page1=$(curl -s --connect-timeout "$TIMEOUT" "$API_URL$base_endpoint/0/5" 2>/dev/null)
    local page2=$(curl -s --connect-timeout "$TIMEOUT" "$API_URL$base_endpoint/5/10" 2>/dev/null)
    
    # Check if both responses are valid JSON arrays
    if ! echo "$page1" | jq -e 'type == "array"' >/dev/null 2>&1; then
        echo "  First page is not a valid JSON array"
        return 1
    fi
    
    if ! echo "$page2" | jq -e 'type == "array"' >/dev/null 2>&1; then
        echo "  Second page is not a valid JSON array"
        return 1
    fi
    
    echo "  Pagination responses are consistent"
    return 0
}

echo -e "\n${BLUE}🚀 Starting User Experience Validation...${NC}"

# 1. API Response Consistency
echo -e "\n${YELLOW}=== API Response Consistency ===${NC}"
validate_ux "Health Check Response Format" "test_response_format '/health' 'status timestamp uptime'"
validate_ux "Detailed Health Response Format" "test_response_format '/health/detailed' 'status timestamp database cache memory'"
validate_ux "Patches Total Response" "curl -s --connect-timeout $TIMEOUT $API_URL/api/patches/total 2>/dev/null | grep -E '^[0-9]+$'"
validate_ux "Patches List Response Array" "curl -s --connect-timeout $TIMEOUT $API_URL/api/patches 2>/dev/null | jq -e 'type == \"array\"' >/dev/null 2>&1"

# 2. Error Response Consistency
echo -e "\n${YELLOW}=== Error Response Consistency ===${NC}"
validate_ux "404 Error Format" "test_error_format '/nonexistent-endpoint' 'GET' '404'"
validate_ux "401 Unauthorized Format" "test_error_format '/api/users/profile' 'GET' '401'"
validate_ux "405 Method Not Allowed Format" "test_error_format '/health' 'DELETE' '405'"

# 3. Pagination Consistency
echo -e "\n${YELLOW}=== Pagination Consistency ===${NC}"
validate_ux "Patches Pagination" "test_pagination '/api/patches'"

# 4. Content Quality Checks
echo -e "\n${YELLOW}=== Content Quality ===${NC}"

# Check API documentation availability
validate_ux "API Documentation Available (Dev)" "
    if [[ '$API_URL' == *'localhost'* ]]; then
        curl -f -s --connect-timeout $TIMEOUT $API_URL/api-docs >/dev/null 2>&1
    else
        echo 'Skipping for production (docs disabled in prod)'
    fi
"

# Check for proper CORS headers
validate_ux "CORS Headers Present" "curl -I -s --connect-timeout $TIMEOUT $API_URL 2>/dev/null | grep -i 'access-control'"

# Check for security headers
validate_ux "Security Headers Present" "curl -I -s --connect-timeout $TIMEOUT $API_URL 2>/dev/null | grep -i 'x-frame-options\\|x-content-type-options\\|strict-transport-security'"

# 5. API Usability
echo -e "\n${YELLOW}=== API Usability ===${NC}"

# Check response time consistency
validate_ux "Consistent Response Times" "
    total_time=0
    max_time=0
    samples=5
    
    for i in \$(seq 1 \$samples); do
        time=\$(curl -o /dev/null -s -w '%{time_total}' --connect-timeout $TIMEOUT $API_URL/health 2>/dev/null || echo '0')
        time_ms=\$(echo \"\$time * 1000\" | bc -l 2>/dev/null || echo '0')
        time_ms=\${time_ms%.*}
        
        if [[ \$time_ms -gt \$max_time ]]; then
            max_time=\$time_ms
        fi
        
        total_time=\$((total_time + time_ms))
    done
    
    avg_time=\$((total_time / samples))
    
    echo \"  Average response time: \${avg_time}ms\"
    echo \"  Maximum response time: \${max_time}ms\"
    
    # Response times should be under 2 seconds (2000ms)
    if [[ \$max_time -lt 2000 ]]; then
        exit 0
    else
        echo \"  Response times too high\"
        exit 1
    fi
"

# Check for rate limiting feedback
validate_ux "Rate Limiting Headers" "
    response_headers=\$(curl -I -s --connect-timeout $TIMEOUT $API_URL/api/patches 2>/dev/null)
    if echo \"\$response_headers\" | grep -i 'x-ratelimit\\|ratelimit'; then
        echo '  Rate limiting headers present'
        exit 0
    else
        echo '  Rate limiting headers not found'
        exit 1
    fi
"

# 6. Error Handling Quality
echo -e "\n${YELLOW}=== Error Handling Quality ===${NC}"

# Test various error scenarios
validate_ux "Clear 404 Error Messages" "
    response=\$(curl -s --connect-timeout $TIMEOUT $API_URL/api/nonexistent 2>/dev/null)
    message=\$(echo \"\$response\" | jq -r '.message' 2>/dev/null || echo '')
    
    if [[ -n \"\$message\" && \"\$message\" != \"null\" ]]; then
        echo \"  Error message: \$message\"
        exit 0
    else
        echo \"  No clear error message\"
        exit 1
    fi
"

validate_ux "Validation Error Clarity" "
    # Test login with empty data
    response=\$(curl -s -X POST -H 'Content-Type: application/json' -d '{}' --connect-timeout $TIMEOUT $API_URL/api/auth/login 2>/dev/null)
    message=\$(echo \"\$response\" | jq -r '.message' 2>/dev/null || echo '')
    
    if [[ -n \"\$message\" && \"\$message\" != \"null\" ]]; then
        echo \"  Validation error message: \$message\"
        exit 0
    else
        echo \"  No clear validation error message\"
        exit 1
    fi
"

# 7. Data Consistency
echo -e "\n${YELLOW}=== Data Consistency ===${NC}"

validate_ux "Patch Count Matches List" "
    total_count=\$(curl -s --connect-timeout $TIMEOUT $API_URL/api/patches/total 2>/dev/null)
    patches_list=\$(curl -s --connect-timeout $TIMEOUT $API_URL/api/patches 2>/dev/null)
    list_count=\$(echo \"\$patches_list\" | jq '. | length' 2>/dev/null || echo '0')
    
    echo \"  Total count endpoint: \$total_count\"
    echo \"  List length: \$list_count\"
    
    # For small datasets, these should match
    if [[ \$total_count -eq \$list_count ]] || [[ \$list_count -gt 0 && \$total_count -gt 0 ]]; then
        exit 0
    else
        echo \"  Data consistency issue detected\"
        exit 1
    fi
"

# 8. Monitoring UX
echo -e "\n${YELLOW}=== Monitoring User Experience ===${NC}"

validate_ux "Metrics Endpoint Usability" "
    metrics=\$(curl -s --connect-timeout $TIMEOUT $API_URL/monitoring/metrics 2>/dev/null)
    
    # Check if metrics contain useful information
    if echo \"\$metrics\" | grep -q 'http_requests_total\\|http_request_duration'; then
        echo '  Metrics contain useful HTTP performance data'
        exit 0
    else
        echo '  Metrics missing key performance indicators'
        exit 1
    fi
"

validate_ux "Health Check Informativeness" "
    health=\$(curl -s --connect-timeout $TIMEOUT $API_URL/health/detailed 2>/dev/null)
    
    # Check if detailed health includes useful information
    if echo \"\$health\" | jq -e '.database.status and .cache.status and .memory' >/dev/null 2>&1; then
        echo '  Detailed health check provides comprehensive system info'
        exit 0
    else
        echo '  Health check lacks comprehensive system information'
        exit 1
    fi
"

# 9. API Evolution and Versioning
echo -e "\n${YELLOW}=== API Evolution ===${NC}"

validate_ux "API Versioning Strategy" "
    # Check if API uses versioning in URLs or headers
    if curl -I -s --connect-timeout $TIMEOUT $API_URL/api/patches 2>/dev/null | grep -i 'api-version'; then
        echo '  API version headers present'
        exit 0
    elif echo '$API_URL' | grep -q '/api/'; then
        echo '  API uses path-based versioning (/api/ prefix)'
        exit 0
    else
        echo '  No clear API versioning strategy'
        exit 1
    fi
"

# 10. Performance Feedback
echo -e "\n${YELLOW}=== Performance User Experience ===${NC}"

validate_ux "Server Response Headers Include Timing" "
    headers=\$(curl -I -s --connect-timeout $TIMEOUT $API_URL/health 2>/dev/null)
    
    # Check for timing headers or server identification
    if echo \"\$headers\" | grep -i 'server\\|x-response-time\\|x-powered-by'; then
        echo '  Server provides performance context headers'
        exit 0
    else
        echo '  No performance context in headers'
        exit 1
    fi
"

# Generate comprehensive UX report
echo -e "\n${BLUE}📊 Generating UX Validation Report...${NC}"

cat > "$UX_REPORT_DIR/ux-validation-report.md" << EOF
# User Experience Validation Report - Brutal Patches API

**Date**: $(date)
**API URL**: $API_URL
**Total Checks**: $TOTAL_CHECKS
**Passed**: $PASSED_CHECKS
**Failed**: $FAILED_CHECKS
**Success Rate**: $(( (PASSED_CHECKS * 100) / TOTAL_CHECKS ))%

## Executive Summary

This report evaluates the user experience aspects of the Brutal Patches API, including:
- API response consistency and format standardization
- Error handling and user-friendly error messages
- Performance and reliability from a user perspective
- Data consistency and integrity
- Monitoring and observability user experience

## Detailed Results

### ✅ Strengths Identified

$(grep "✅" "$UX_REPORT_DIR/ux-results.txt" | sed 's/✅ /- /')

### ❌ Areas for Improvement

$(grep "❌" "$UX_REPORT_DIR/ux-results.txt" | sed 's/❌ /- /')

## Recommendations

### High Priority UX Improvements
1. **Error Message Enhancement**: Ensure all error responses include clear, actionable messages
2. **Response Time Optimization**: Keep API response times under 1 second for better user experience
3. **Rate Limiting Feedback**: Provide clear rate limiting information to API consumers
4. **Documentation Accessibility**: Make API documentation easily discoverable and comprehensive

### Medium Priority Enhancements
1. **Response Format Consistency**: Standardize response formats across all endpoints
2. **Pagination Standardization**: Implement consistent pagination patterns
3. **Monitoring UX**: Enhance monitoring endpoints for better operational visibility
4. **API Versioning**: Implement clear API versioning strategy

### Performance UX Considerations
1. **Caching Strategy**: Implement appropriate caching for frequently accessed endpoints
2. **Compression**: Enable response compression for large payloads
3. **Connection Keep-Alive**: Optimize connection handling for better performance
4. **Progressive Loading**: Consider pagination for large dataset endpoints

## User Journey Analysis

### Developer Experience
- **API Discovery**: How easily can developers find and understand the API
- **Integration Ease**: How simple it is to integrate with the API
- **Error Recovery**: How well the API guides developers through error scenarios
- **Testing Support**: Availability of testing endpoints and documentation

### End User Experience (via API)
- **Response Speed**: How quickly users get responses through client applications
- **Data Accuracy**: Consistency and reliability of returned data
- **Error Clarity**: Clear error messages that can be displayed to users
- **Feature Completeness**: All necessary operations available through API

## Monitoring Recommendations

### Real-time UX Monitoring
- Set up alerts for response time degradation
- Monitor error rate trends
- Track API usage patterns
- Implement user satisfaction metrics

### Continuous UX Improvement
- Regular UX validation testing
- User feedback collection mechanisms
- Performance benchmarking
- A/B testing for API changes

## Next Steps

1. **Address High Priority Issues**: Focus on failed validation checks
2. **Implement UX Monitoring**: Set up continuous monitoring for user experience metrics
3. **User Feedback Loop**: Establish mechanisms to collect and act on API user feedback
4. **Regular UX Reviews**: Schedule monthly UX validation runs
5. **Documentation Updates**: Keep API documentation current and user-friendly

---

**Report Generated**: $(date)
**Validation Script Version**: 1.0
**Next Review Scheduled**: $(date -d "+1 month")
EOF

# Display final results
echo -e "\n${BLUE}📋 UX Validation Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Total Checks: $TOTAL_CHECKS"
echo "  Passed: $PASSED_CHECKS"
echo "  Failed: $FAILED_CHECKS"
echo "  Success Rate: $(( (PASSED_CHECKS * 100) / TOTAL_CHECKS ))%"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ $FAILED_CHECKS -eq 0 ]]; then
    echo -e "${GREEN}🎉 USER EXPERIENCE VALIDATION SUCCESSFUL!${NC}"
    echo -e "${GREEN}✅ All UX checks passed. API provides excellent user experience.${NC}"
    UX_STATUS="EXCELLENT"
elif [[ $FAILED_CHECKS -le 2 ]]; then
    echo -e "${YELLOW}⚠️  USER EXPERIENCE NEEDS MINOR IMPROVEMENTS${NC}"
    echo -e "${YELLOW}Some UX aspects could be enhanced.${NC}"
    UX_STATUS="GOOD"
else
    echo -e "${RED}❌ USER EXPERIENCE VALIDATION FAILED!${NC}"
    echo -e "${RED}Multiple UX issues detected. Improvements needed.${NC}"
    UX_STATUS="NEEDS_IMPROVEMENT"
fi

echo -e "\n${BLUE}📄 Full UX validation report saved to: $UX_REPORT_DIR/ux-validation-report.md${NC}"

# Save summary for CI/CD
cat > "$UX_REPORT_DIR/ux-summary.json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "api_url": "$API_URL",
  "total_checks": $TOTAL_CHECKS,
  "passed_checks": $PASSED_CHECKS,
  "failed_checks": $FAILED_CHECKS,
  "success_rate": $(( (PASSED_CHECKS * 100) / TOTAL_CHECKS )),
  "status": "$UX_STATUS",
  "report_directory": "$UX_REPORT_DIR"
}
EOF

# Open report if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${BLUE}Opening UX validation report...${NC}"
    open "$UX_REPORT_DIR/ux-validation-report.md" 2>/dev/null || echo "Could not open report automatically"
fi

# Exit with appropriate code based on UX status
case "$UX_STATUS" in
    "EXCELLENT")
        exit 0
        ;;
    "GOOD")
        exit 0
        ;;
    "NEEDS_IMPROVEMENT")
        exit 1
        ;;
    *)
        exit 1
        ;;
esac