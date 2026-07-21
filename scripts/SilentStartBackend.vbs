' SilentStartBackend.vbs — Runs StartBackend.ps1 silently on Windows startup
' No CMD window will appear on boot
Dim WShell
Set WShell = CreateObject("WScript.Shell")
WShell.Run "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File ""d:\JEE\scripts\StartBackend.ps1""", 0, False
Set WShell = Nothing
