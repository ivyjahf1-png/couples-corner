Set objShell = CreateObject("WScript.Shell")
Set objFso = CreateObject("Scripting.FileSystemObject")
webDir = objFso.GetParentFolderName(WScript.ScriptFullName)
objShell.Run "cmd.exe /c cd /d """ & webDir & """ && npm run dev -- --port 3000", 0, False