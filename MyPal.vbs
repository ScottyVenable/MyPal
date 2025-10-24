' MyPal Launcher
' Launches AUTORUN.ps1 in a PowerShell window
'
' This VBScript wrapper provides a double-clickable launcher for MyPal
' without requiring users to open a terminal manually.

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
scriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)

' Path to AUTORUN.ps1
autorunScript = objFSO.BuildPath(scriptDir, "AUTORUN.ps1")

' Check if AUTORUN.ps1 exists
If Not objFSO.FileExists(autorunScript) Then
    MsgBox "Error: AUTORUN.ps1 not found in " & scriptDir, vbCritical, "MyPal Launcher"
    WScript.Quit 1
End If

' Launch PowerShell with AUTORUN.ps1
' -NoExit keeps window open, -ExecutionPolicy Bypass allows script execution
' -File executes the script
command = "powershell.exe -NoExit -ExecutionPolicy Bypass -File """ & autorunScript & """"

' Run the command in a normal window (not hidden)
objShell.Run command, 1, False

WScript.Quit 0
