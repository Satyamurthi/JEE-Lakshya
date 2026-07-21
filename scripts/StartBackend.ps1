# ============================================================
# StartBackend.ps1 - JEE Lakshya Backend Startup Script
# Named tunnel  : JEE-backend (2080ddf8) - shows Healthy in CF dashboard
# Public access : Cloudflare Quick Tunnel (trycloudflare.com)
# On boot: starts PHP + named service + Quick Tunnel, pushes URL to GitHub
# ============================================================

$JeeRoot      = "d:\JEE"
$PhpExe       = "C:\Users\Administrator\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe"
$CfExe        = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
$UrlFile      = "$JeeRoot\public\backend_url.txt"
$CfLog        = "$JeeRoot\cf_quicktunnel.log"
$LogFile      = "$JeeRoot\StartBackend.log"
$Pat          = "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"
# New JEE-backend named tunnel token (tunnel ID: 2080ddf8-1f85-4cf5-9ac9-ebb22133ca29)
$CfSvcToken   = "eyJhIjoiOWIwNTIzNzY5MDZiNzlmZDU2NGMzZmYwOWQwMzYyYTUiLCJ0IjoiMjA4MGRkZjgtMWY4NS00Y2Y1LTlhYzktZWJiMjIxMzNjYTI5IiwicyI6IlpEQTNZVFkwTURrdE1XUTJaQzAwWm1GakxUZ3hZell0TXpOaE9EQTBaVFppTmpnNCJ9"

function Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$ts  $msg" | Tee-Object -FilePath $LogFile -Append
}

Log "========================================================"
Log "StartBackend.ps1 launched"
Log "========================================================"

# -- Step 1: Wait for network on boot ------------------------
Log "Waiting 15s for network to be ready..."
Start-Sleep -Seconds 15

# -- Step 2: Kill old PHP + cloudflared processes -------------
Log "Stopping old PHP and cloudflared processes..."
sc.exe stop cloudflared 2>$null
Get-Process -Name "php" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# -- Step 2b: Restart named tunnel service (keeps CF dashboard Healthy) --
Log "Starting JEE-backend named tunnel service..."
sc.exe start cloudflared 2>$null
Start-Sleep -Seconds 5
Log "Named tunnel service status: $((Get-Service cloudflared -ErrorAction SilentlyContinue).Status)"
Start-Sleep -Seconds 2

# -- Step 3: Start PHP CLI Server -----------------
Log "Starting PHP CLI Server on 127.0.0.1:8080..."
# Note: PHP_CLI_SERVER_WORKERS doesn't work on Windows (no fork support)
# PHP CLI server is single-threaded on Windows - this is expected behavior
$phpCmd = '"' + $PhpExe + '" -S 127.0.0.1:8080 -t "' + $JeeRoot + '" "' + $JeeRoot + '\api\router.php"'
$phpProc = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $phpCmd }
Start-Sleep -Seconds 3
Log "PHP Server started with PID $($phpProc.ProcessId)."

# -- Step 4: Clean old CF logs --------------------------------
$CfErrLog = "$JeeRoot\cf_quicktunnel_err.log"
Remove-Item -Path $CfLog    -Force -ErrorAction SilentlyContinue
Remove-Item -Path $CfErrLog -Force -ErrorAction SilentlyContinue

# -- Step 5: Start Cloudflare Quick Tunnel -------------------
# No domain or account needed - trycloudflare.com is free
# URL is printed to STDERR; use top-level --url flag (not tunnel subcommand)
Log "Starting Cloudflare Quick Tunnel (trycloudflare.com)..."
$cfCmd = 'cmd.exe /c ""{0}" --url http://127.0.0.1:8080 --metrics 127.0.0.1:20242 > "{1}" 2> "{2}""' -f $CfExe, $CfLog, $CfErrLog
$cfProc = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $cfCmd }
Log "Cloudflare Quick Tunnel started with WMI CMD PID $($cfProc.ProcessId)."

# -- Step 6: Wait for tunnel URL (up to 30 seconds) ----------
# URL is written to STDERR by cloudflared Quick Tunnel
$TunnelUrl = ""
Log "Waiting for Cloudflare Quick Tunnel URL (checking stderr log)..."
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $CfErrLog) {
        $content = Get-Content $CfErrLog -Raw -ErrorAction SilentlyContinue
        if ($content -match 'https://[a-zA-Z0-9\-]+\.trycloudflare\.com') {
            $TunnelUrl = $Matches[0]
            break
        }
    }
}

# -- Step 7: Fallback to Serveo if CF Quick Tunnel failed ----
if (-not $TunnelUrl) {
    Log "WARNING: Cloudflare Quick Tunnel URL not found. Falling back to Serveo SSH..."

    $ServeoLog  = "$JeeRoot\serveo_run.log"
    $ServeoErr  = "$JeeRoot\serveo_err.log"
    Remove-Item -Path $ServeoLog, $ServeoErr -Force -ErrorAction SilentlyContinue

    Get-Process -Name "ssh" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

    $sshCmd = 'cmd.exe /c "ssh.exe -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:127.0.0.1:8080 serveo.net > "{0}" 2> "{1}""' -f $ServeoLog, $ServeoErr
    $sshProc = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $sshCmd }

    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Path $ServeoLog) {
            $logContent = Get-Content $ServeoLog -Raw -ErrorAction SilentlyContinue
            if ($logContent -match '(https://[a-zA-Z0-9\-]+\.(?:serveousercontent|serveo)\.(?:com|net))') {
                $TunnelUrl = $Matches[1]
                break
            }
        }
    }
}

# -- Step 8: Update backend_url.txt and push to GitHub -------
if ($TunnelUrl) {
    Log "Tunnel URL: $TunnelUrl"

    $CurrentUrl = ""
    if (Test-Path $UrlFile) {
        $CurrentUrl = (Get-Content $UrlFile -ErrorAction SilentlyContinue).Trim()
    }

    if ($TunnelUrl -ne $CurrentUrl) {
        Set-Content -Path $UrlFile -Value $TunnelUrl
        Log "Updated backend_url.txt -> $TunnelUrl"

        Set-Location -Path $JeeRoot
        Remove-Item -Path "$JeeRoot\.git\index.lock" -Force -ErrorAction SilentlyContinue

        git add public/backend_url.txt
        git commit -m "chore: update dynamic backend tunnel URL [$TunnelUrl]"

        git push "https://$Pat@github.com/Satyamurthi/JEE-Lakshya.git" main --force
        git push "https://$Pat@github.com/Satyamurthi/JEE-Nexus.git"   main --force

        Log "Successfully pushed new backend URL to GitHub!"
        Log "Netlify will auto-deploy in ~30 seconds."
    } else {
        Log "Tunnel URL unchanged - no GitHub push needed."
    }
} else {
    Log "ERROR: Could not get any tunnel URL (Cloudflare Quick Tunnel AND Serveo both failed)."
    Log "Check network connectivity and try running StartBackend.ps1 manually."
}

Log "========================================================"
Log "StartBackend.ps1 complete."
Log "  PHP Server : http://127.0.0.1:8080"
Log "  Tunnel URL : $TunnelUrl"
Log "  Log File   : $LogFile"
Log "========================================================"
