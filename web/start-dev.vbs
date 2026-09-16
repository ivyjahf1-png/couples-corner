Set objShell = CreateObject("WScript.Shell")
objShell.Run "cmd.exe /c cd /d ""C:\Users\HomePC\Documents\couple's conner\web"" && npm run dev -- --port 3000", 0, False