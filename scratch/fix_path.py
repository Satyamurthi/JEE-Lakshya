import winreg
import os

git_cmd_path = r"C:\Program Files\Git\cmd"

try:
    key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment", 0, winreg.KEY_ALL_ACCESS)
    try:
        current_path, _ = winreg.QueryValueEx(key, "Path")
    except FileNotFoundError:
        current_path = ""

    if git_cmd_path.lower() not in current_path.lower():
        new_path = current_path + (";" if current_path and not current_path.endswith(";") else "") + git_cmd_path
        winreg.SetValueEx(key, "Path", 0, winreg.REG_EXPAND_SZ, new_path)
        print("SUCCESS: C:\\Program Files\\Git\\cmd permanently added to Windows User PATH!")
    else:
        print("INFO: Git path already exists in Windows User PATH.")
    winreg.CloseKey(key)
except Exception as e:
    print("ERROR:", e)
