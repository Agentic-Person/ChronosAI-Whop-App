# Load Test Execution Script (PowerShell)
# Runs Artillery load tests with proper configuration and reporting

param(
    [Parameter(Position = 0)]
    [string]$Scenario = "chat-load",

    [string]$TargetUrl = $env:TARGET_URL,

    [string]$ReportFormat = "json,html",

    [switch]$SkipValidation,

    [switch]$NoOpen
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Configuration
$LoadTestsDir = Split-Path -Parent $PSScriptRoot
$ResultsDir = Join-Path $LoadTestsDir "results"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# Default target URL
if (-not $TargetUrl) {
    $TargetUrl = "http://localhost:3000"
}

# Colors
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

# Print banner
Write-ColorOutput Cyan @"

╔════════════════════════════════════════════════╗
║   AI Video Learning Assistant - Load Testing  ║
╚════════════════════════════════════════════════╝

"@

# Validate environment
if (-not $SkipValidation) {
    Write-ColorOutput Yellow "⚙️  Validating environment..."

    if (-not $env:NEXT_PUBLIC_SUPABASE_URL) {
        Write-ColorOutput Red "❌ Error: NEXT_PUBLIC_SUPABASE_URL not set"
        exit 1
    }

    if (-not $env:NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        Write-ColorOutput Red "❌ Error: NEXT_PUBLIC_SUPABASE_ANON_KEY not set"
        exit 1
    }

    Write-ColorOutput Green "✅ Environment validated"
}

# Create results directory
New-Item -ItemType Directory -Force -Path $ResultsDir | Out-Null

# Display configuration
Write-ColorOutput Cyan "`n📋 Test Configuration:"
Write-Output "   Target URL: $TargetUrl"
Write-Output "   Scenario: $Scenario"
Write-Output "   Results: $ResultsDir\${Scenario}_${Timestamp}"
Write-Output "   Report Format: $ReportFormat"

# Check if target is reachable
if (-not $SkipValidation) {
    Write-ColorOutput Yellow "`n🔍 Checking target availability..."
    try {
        $response = Invoke-WebRequest -Uri $TargetUrl -Method Head -TimeoutSec 5 -ErrorAction Stop
        Write-ColorOutput Green "✅ Target is reachable"
    }
    catch {
        Write-ColorOutput Red "❌ Warning: Target may not be reachable"
        $continue = Read-Host "Continue anyway? (y/N)"
        if ($continue -ne "y" -and $continue -ne "Y") {
            exit 1
        }
    }
}

# Run the load test
Write-ColorOutput Yellow "`n🚀 Starting load test: $Scenario..."
Write-ColorOutput Cyan "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"

$ScenarioFile = Join-Path $LoadTestsDir "artillery\scenarios\${Scenario}.yml"

if (-not (Test-Path $ScenarioFile)) {
    Write-ColorOutput Red "❌ Error: Scenario file not found: $ScenarioFile"
    exit 1
}

# Set environment variables
$env:TARGET_URL = $TargetUrl
$env:TIMESTAMP = $Timestamp

# Run Artillery
$ReportFile = Join-Path $ResultsDir "${Scenario}_${Timestamp}"
$ConfigFile = Join-Path $LoadTestsDir "artillery\artillery.config.yml"

try {
    npx artillery run `
        --config $ConfigFile `
        --output "${ReportFile}.json" `
        $ScenarioFile

    $ArtilleryExitCode = $LASTEXITCODE

    # Generate HTML report
    Write-ColorOutput Yellow "`n📊 Generating report..."
    npx artillery report "${ReportFile}.json" --output "${ReportFile}.html"

    # Display results
    Write-ColorOutput Cyan "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if ($ArtilleryExitCode -eq 0) {
        Write-ColorOutput Green "✅ Load test completed successfully!"
    }
    else {
        Write-ColorOutput Red "❌ Load test failed with exit code: $ArtilleryExitCode"
    }

    Write-ColorOutput Cyan "`n📈 Results Location:"
    Write-Output "   JSON: ${ReportFile}.json"
    Write-Output "   HTML: ${ReportFile}.html"

    # Parse and display key metrics (simplified for PowerShell)
    Write-ColorOutput Cyan "`n📊 Quick Summary:"
    if (Test-Path "${ReportFile}.json") {
        $metrics = Get-Content "${ReportFile}.json" | ConvertFrom-Json
        Write-ColorOutput Green @"
   Total Requests: $($metrics.aggregate.requestsCompleted)
   Median Response Time: $($metrics.aggregate.latency.median)ms
   95th Percentile: $($metrics.aggregate.latency.p95)ms
   99th Percentile: $($metrics.aggregate.latency.p99)ms
   Errors: $($metrics.aggregate.errors)
"@
    }

    # Open HTML report
    if (-not $NoOpen) {
        Write-ColorOutput Yellow "`n🌐 Opening HTML report in browser..."
        Start-Process "${ReportFile}.html"
    }

    # Suggest next steps
    Write-ColorOutput Cyan "`n💡 Next Steps:"
    Write-Output "   1. Review detailed metrics in HTML report"
    Write-Output "   2. Check for errors and bottlenecks"
    Write-Output "   3. Compare with baseline metrics"
    Write-Output "   4. Run additional scenarios if needed"

    Write-ColorOutput Cyan "`n🔧 Available Test Scenarios:"
    Write-Output "   - chat-load: RAG chat system load test"
    Write-Output "   - video-upload-load: Video upload pipeline test"
    Write-Output "   - auth-load: Authentication flow test"
    Write-Output "   - database-load: Database connection pool test"
    Write-Output "   - api-rate-limit-test: Rate limit validation"

    Write-ColorOutput Green "`nDone!`n"

    exit $ArtilleryExitCode
}
catch {
    Write-ColorOutput Red "`n❌ Error running load test: $_"
    exit 1
}
