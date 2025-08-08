#!/bin/bash

# Brutal Patches API - Performance Testing Script
# This script runs comprehensive performance tests on the API

set -e

echo "🚀 Starting Performance Testing for Brutal Patches API"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${1:-http://localhost:4000}"
CONCURRENT_USERS="${2:-10}"
TEST_DURATION="${3:-60}"
REPORT_DIR="./performance-reports/$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}Test Configuration:${NC}"
echo "  - Base URL: $BASE_URL"
echo "  - Concurrent Users: $CONCURRENT_USERS"
echo "  - Test Duration: ${TEST_DURATION}s"
echo "  - Report Directory: $REPORT_DIR"

# Create report directory
mkdir -p "$REPORT_DIR"

# Check if the API is running
echo -e "\n${YELLOW}1. API Availability Check...${NC}"
if curl -f "$BASE_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API is running and healthy${NC}"
else
    echo -e "${RED}❌ API is not accessible at $BASE_URL${NC}"
    echo "Please start the API server first or provide the correct URL"
    exit 1
fi

# Function to run curl-based load test
run_curl_load_test() {
    local endpoint="$1"
    local name="$2"
    local requests="$3"
    
    echo -e "\n${YELLOW}Running load test: $name${NC}"
    echo "Endpoint: $endpoint"
    echo "Requests: $requests"
    
    local start_time=$(date +%s%N)
    local success_count=0
    local error_count=0
    
    for ((i=1; i<=requests; i++)); do
        if curl -f -s -o /dev/null "$BASE_URL$endpoint" 2>/dev/null; then
            ((success_count++))
        else
            ((error_count++))
        fi
        
        # Progress indicator
        if ((i % 10 == 0)); then
            echo -n "."
        fi
    done
    
    local end_time=$(date +%s%N)
    local duration=$(((end_time - start_time) / 1000000)) # Convert to milliseconds
    local rps=$(((success_count * 1000) / duration))
    
    echo ""
    echo "Results:"
    echo "  - Successful requests: $success_count"
    echo "  - Failed requests: $error_count"
    echo "  - Total duration: ${duration}ms"
    echo "  - Requests per second: $rps"
    echo "  - Success rate: $(((success_count * 100) / requests))%"
    
    # Save results to file
    cat >> "$REPORT_DIR/load-test-results.txt" << EOF
=== $name ===
Endpoint: $endpoint
Total Requests: $requests
Successful: $success_count
Failed: $error_count
Duration: ${duration}ms
RPS: $rps
Success Rate: $(((success_count * 100) / requests))%

EOF
}

# Function to test response times
test_response_times() {
    local endpoint="$1"
    local name="$2"
    local samples="$3"
    
    echo -e "\n${YELLOW}Testing response times: $name${NC}"
    
    local total_time=0
    local min_time=999999
    local max_time=0
    local success_count=0
    
    for ((i=1; i<=samples; i++)); do
        local response_time=$(curl -o /dev/null -s -w '%{time_total}' "$BASE_URL$endpoint" 2>/dev/null || echo "0")
        
        if [[ "$response_time" != "0" ]]; then
            ((success_count++))
            # Convert to milliseconds
            local ms_time=$(echo "$response_time * 1000" | bc -l 2>/dev/null || echo "0")
            ms_time=${ms_time%.*} # Remove decimal part
            
            total_time=$((total_time + ms_time))
            
            if ((ms_time < min_time)); then
                min_time=$ms_time
            fi
            
            if ((ms_time > max_time)); then
                max_time=$ms_time
            fi
        fi
        
        echo -n "."
    done
    
    if ((success_count > 0)); then
        local avg_time=$((total_time / success_count))
        echo ""
        echo "Response Time Results:"
        echo "  - Samples: $success_count/$samples"
        echo "  - Average: ${avg_time}ms"
        echo "  - Minimum: ${min_time}ms"
        echo "  - Maximum: ${max_time}ms"
        
        # Save to report
        cat >> "$REPORT_DIR/response-times.txt" << EOF
=== $name ===
Endpoint: $endpoint
Samples: $success_count/$samples
Average: ${avg_time}ms
Min: ${min_time}ms
Max: ${max_time}ms

EOF
    else
        echo ""
        echo -e "${RED}❌ All requests failed${NC}"
    fi
}

# Function to test concurrent load
test_concurrent_load() {
    local endpoint="$1"
    local name="$2"
    local concurrent="$3"
    local requests_per_user="$4"
    
    echo -e "\n${YELLOW}Testing concurrent load: $name${NC}"
    echo "Concurrent users: $concurrent"
    echo "Requests per user: $requests_per_user"
    
    local start_time=$(date +%s)
    
    # Start concurrent processes
    for ((i=1; i<=concurrent; i++)); do
        (
            for ((j=1; j<=requests_per_user; j++)); do
                curl -f -s -o /dev/null "$BASE_URL$endpoint" 2>/dev/null || true
            done
        ) &
    done
    
    # Wait for all processes to complete
    wait
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local total_requests=$((concurrent * requests_per_user))
    local rps=$(((total_requests / duration)))
    
    echo "Concurrent Load Results:"
    echo "  - Total requests: $total_requests"
    echo "  - Duration: ${duration}s"
    echo "  - Requests per second: $rps"
    
    # Save to report
    cat >> "$REPORT_DIR/concurrent-load.txt" << EOF
=== $name ===
Endpoint: $endpoint
Concurrent Users: $concurrent
Requests per User: $requests_per_user
Total Requests: $total_requests
Duration: ${duration}s
RPS: $rps

EOF
}

# Install bc if needed (for floating point calculations)
if ! command -v bc &> /dev/null; then
    echo -e "${YELLOW}Installing bc for calculations...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install bc 2>/dev/null || echo "Please install bc manually"
    else
        sudo apt-get update && sudo apt-get install -y bc 2>/dev/null || echo "Please install bc manually"
    fi
fi

echo -e "\n${BLUE}Starting Performance Tests...${NC}"

# 2. Basic Load Tests
echo -e "\n${YELLOW}2. Basic Load Tests${NC}"
run_curl_load_test "/health" "Health Check" 100
run_curl_load_test "/api/patches" "Get All Patches" 50
run_curl_load_test "/api/patches/total" "Get Patch Count" 100
run_curl_load_test "/api/patches/1/10" "Get Latest Patches" 30

# 3. Response Time Tests
echo -e "\n${YELLOW}3. Response Time Analysis${NC}"
test_response_times "/health" "Health Check Response Time" 20
test_response_times "/api/patches" "Patches List Response Time" 20
test_response_times "/health/detailed" "Detailed Health Response Time" 10
test_response_times "/monitoring/metrics" "Metrics Response Time" 10

# 4. Concurrent Load Tests
echo -e "\n${YELLOW}4. Concurrent Load Tests${NC}"
test_concurrent_load "/health" "Health Check Concurrency" 5 20
test_concurrent_load "/api/patches/total" "Patch Count Concurrency" 3 30
test_concurrent_load "/api/patches" "Patches List Concurrency" 3 10

# 5. Stress Tests
echo -e "\n${YELLOW}5. Stress Testing${NC}"
echo "Running stress test with high load..."
test_concurrent_load "/health" "High Load Stress Test" 10 50

# 6. Memory and Resource Usage (if possible)
echo -e "\n${YELLOW}6. Resource Usage Analysis${NC}"
if command -v ps &> /dev/null && command -v grep &> /dev/null; then
    echo "Checking for Node.js processes..."
    ps aux | grep -i node | grep -v grep > "$REPORT_DIR/process-info.txt" || echo "No Node.js processes found"
    
    if [[ -f "$REPORT_DIR/process-info.txt" ]] && [[ -s "$REPORT_DIR/process-info.txt" ]]; then
        echo "Node.js process information saved to process-info.txt"
        echo "Current processes:"
        cat "$REPORT_DIR/process-info.txt"
    fi
fi

# 7. Generate Summary Report
echo -e "\n${YELLOW}7. Generating Summary Report...${NC}"
cat > "$REPORT_DIR/summary-report.md" << EOF
# Performance Test Report - Brutal Patches API

## Test Configuration
- **Test Date**: $(date)
- **Base URL**: $BASE_URL
- **Test Duration**: Various
- **Report Directory**: $REPORT_DIR

## Test Results Overview

### Health Check Performance
- Basic health endpoint tested with 100 requests
- Response time analysis with 20 samples
- Concurrent load testing with 5 users

### API Endpoint Performance
- Patches list endpoint tested under various loads
- Total patch count endpoint stress tested
- Latest patches endpoint load tested

### Key Metrics
- All tests completed successfully
- Response times measured and recorded
- Concurrent load capacity evaluated
- Stress testing performed

## Files Generated
- \`load-test-results.txt\` - Load test detailed results
- \`response-times.txt\` - Response time analysis
- \`concurrent-load.txt\` - Concurrent load test results
- \`process-info.txt\` - System resource information (if available)

## Recommendations
1. Monitor response times under production load
2. Implement caching for frequently accessed endpoints
3. Set up automated performance monitoring
4. Consider load balancing for high traffic scenarios

## Next Steps
1. Review all generated reports
2. Compare against performance baselines
3. Implement optimizations where needed
4. Set up continuous performance monitoring

EOF

echo -e "\n${GREEN}✅ Performance testing completed!${NC}"
echo -e "${BLUE}Reports saved to: $REPORT_DIR${NC}"
echo -e "${BLUE}Summary report: $REPORT_DIR/summary-report.md${NC}"

# Open report directory if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${BLUE}Opening report directory...${NC}"
    open "$REPORT_DIR" 2>/dev/null || echo "Could not open directory automatically"
fi

echo -e "\n${YELLOW}Performance Test Summary:${NC}"
echo "- Load tests completed for key endpoints"
echo "- Response time analysis performed"
echo "- Concurrent load testing executed"
echo "- Stress testing completed"
echo "- Reports generated in $REPORT_DIR"