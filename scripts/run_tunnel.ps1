$Cwd = "d:\JEE"
$LogPath = "$Cwd\serveo_run.log"
$UrlFile = "$Cwd\public\backend_url.txt"
$Pat = "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"

# 1. Kill any existing ssh processes running serveo
Get-Process -Name "ssh" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. Delete old log file
Remove-Item -Path $LogPath -Force -ErrorAction SilentlyContinue

# 3. Start SSH serveo tunnel
Start-Process -FilePath "C:\Windows\System32\OpenSSH\ssh.exe" -ArgumentList "-o", "StrictHostKeyChecking=no", "-o", "ServerAliveInterval=30", "-R", "80:127.0.0.1:8080", "serveo.net" -RedirectStandardOutput $LogPath -RedirectStandardError "$Cwd\serveo_err.log" -WindowStyle Hidden -PassThru

# 4. Wait for the URL to be generated (up to 20 seconds)
$Url = ""
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $LogPath) {
        $LogContent = Get-Content -Path $LogPath -Raw
        if ($LogContent -match '(https://[a-zA-Z0-9\-]+\.serveousercontent\.com)') {
            $Url = $Matches[1]
            break
        }
    }
}

if (-not $Url) {
    Write-Host "Failed to extract tunnel URL from logs."
    exit 1
}

Write-Host "Discovered Tunnel URL: $Url"

# 5. Read current URL if any
$CurrentUrl = ""
if (Test-Path $UrlFile) {
    $CurrentUrl = (Get-Content -Path $UrlFile).Trim()
}

# 6. If URL changed, write new URL and push to GitHub
if ($Url -ne $CurrentUrl) {
    Set-Content -Path $UrlFile -Value $Url
    
    # Run git push using the PAT
    Set-Location -Path $Cwd
    
    # Configure local git user if not set
    git config user.name "System Tunnel Updater"
    git config user.email "satyu000@gmail.com"
    
    git add public/backend_url.txt
    git commit -m "chore: update dynamic backend tunnel URL"
    
    # Push to repositories
    git push "https://$($Pat)@github.com/Satyamurthi/JEE-Lakshya.git" main --force
    git push "https://$($Pat)@github.com/Satyamurthi/JEE-Nexus.git" main --force
    
    Write-Host "Successfully updated backend URL on GitHub!"
} else {
    Write-Host "Tunnel URL has not changed."
}
