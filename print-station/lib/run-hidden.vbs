' Starts the Print Station with no window at all.
'
' The shop asked the obvious question: why must a black window stay open on
' the counter PC all day? It must not. This is the same program, started
' with the window hidden, so closing nothing stops printing.
'
' It works out its own folder rather than being told one, so the shop can
' move or rename the folder and this keeps working.
Option Explicit

Dim fso, shell, folder
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

folder = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))

If Not fso.FileExists(folder & "\station.mjs") Then
  WScript.Quit 1
End If

shell.CurrentDirectory = folder
' 0 = no window, False = do not wait for it to finish.
shell.Run "node """ & folder & "\station.mjs""", 0, False
