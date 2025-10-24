# MyPal Launchers

This directory contains simple launcher scripts for starting MyPal without manually opening a terminal.

## Available Launchers

### 1. MyPal.bat (Recommended for Windows)
**Type**: Windows Batch File  
**Usage**: Double-click to launch  
**Pros**:
- Native Windows format
- Most compatible
- Easy to create desktop shortcuts

**How to use**:
1. Double-click `MyPal.bat` in File Explorer
2. PowerShell window will open and run AUTORUN.ps1
3. Follow on-screen prompts to select launch mode

### 2. MyPal.vbs
**Type**: VBScript  
**Usage**: Double-click to launch  
**Pros**:
- Slightly cleaner execution
- Can be configured to run hidden

**How to use**:
1. Double-click `MyPal.vbs` in File Explorer
2. PowerShell window will open automatically

## Creating a Desktop Shortcut

### Windows 10/11:

1. **Right-click on `MyPal.bat`** in File Explorer
2. Select **"Send to" → "Desktop (create shortcut)"**
3. (Optional) Rename shortcut to "MyPal"
4. (Optional) Change icon:
   - Right-click shortcut → **Properties**
   - Click **"Change Icon..."**
   - Browse to `app/media/images/icon.ico` (if available)
   - Click **OK** → **Apply**

### Alternative Method:

1. Right-click on Desktop → **New → Shortcut**
2. For location, enter: `C:\path\to\MyPal\MyPal.bat`
3. Name it "MyPal"
4. Click **Finish**
5. (Optional) Right-click → Properties → Change Icon

## Creating an EXE (Advanced)

If you want a true `.exe` file instead of `.bat` or `.vbs`, you can use tools like:

### Option 1: Ps1 To Exe
- Tool: **Ps1 To Exe** (free)
- Download: https://github.com/MScholtes/PS2EXE
- Converts PowerShell scripts to standalone executables

**Steps**:
```powershell
# Install ps2exe
Install-Module -Name ps2exe

# Create EXE from AUTORUN.ps1
Invoke-ps2exe -inputFile ".\AUTORUN.ps1" -outputFile ".\MyPal.exe" -noConsole:$false -title "MyPal Launcher"
```

### Option 2: Bat To Exe Converter
- Tool: **Bat To Exe Converter** (free)
- Download: http://www.f2ko.de/en/b2e.php
- Converts batch files to executables with custom icons

**Steps**:
1. Open Bat To Exe Converter
2. Load `MyPal.bat`
3. (Optional) Set icon to `app/media/images/icon.ico`
4. Click "Compile"
5. Output: `MyPal.exe`

### Option 3: IExpress (Built into Windows)
Windows includes a tool for creating self-extracting executables:

1. Run `iexpress.exe` from Start menu
2. Select "Create new Self Extraction Directive file"
3. Choose "Extract files and run an installation command"
4. Add `MyPal.bat` to files list
5. Set install program: `MyPal.bat`
6. Follow wizard to completion

**Note**: IExpress creates larger files (~200KB+) but requires no third-party tools.

## Troubleshooting

### "Scripts are disabled on this system"

**Problem**: Windows blocks PowerShell script execution by default.

**Solution**: Run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

This allows locally-created scripts to run without being digitally signed.

### "AUTORUN.ps1 not found"

**Problem**: Launcher can't find the PowerShell script.

**Solution**: Ensure you're running the launcher from the MyPal root directory where `AUTORUN.ps1` is located.

### "npm command not found"

**Problem**: Node.js is not installed or not in PATH.

**Solution**: 
1. Install Node.js from https://nodejs.org/
2. Restart terminal
3. Try launching again

## Advanced: Silent Background Launch

To launch MyPal completely hidden (no console window), create `MyPal-Silent.vbs`:

```vbscript
Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

scriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
autorunScript = objFSO.BuildPath(scriptDir, "AUTORUN.ps1")

command = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & autorunScript & """ -NoServerConsole"

' 0 = Hidden window
objShell.Run command, 0, False
```

**Warning**: This hides all output and errors. Only use after confirming MyPal works correctly.

## Custom Launch Options

Pass arguments to AUTORUN.ps1 through the launchers:

### MyPal.bat with arguments:
```batch
powershell.exe -NoExit -ExecutionPolicy Bypass -File "%SCRIPT_DIR%AUTORUN.ps1" -SkipInstall -LogTimeFormat 24hour
```

### MyPal.vbs with arguments:
```vbscript
command = "powershell.exe -NoExit -ExecutionPolicy Bypass -File """ & autorunScript & """ -SkipInstall"
```

Available arguments:
- `-SkipInstall` - Skip dependency checks (faster restarts)
- `-NoServerConsole` - Don't auto-open log console
- `-LogTimeFormat 24hour` - Use 24-hour time format for logs
- `-LogTimeFormat timestamp` - Use timestamp format (HHmmss)

## Tips

1. **Pin to Taskbar**: Drag `MyPal.bat` to Windows Taskbar for quick access
2. **Start Menu**: Move `MyPal.bat` to `%APPDATA%\Microsoft\Windows\Start Menu\Programs\`
3. **Startup**: Move shortcut to `shell:startup` to launch MyPal on Windows boot
4. **Custom Icon**: Use `app/media/images/icon.ico` if available for a branded experience

## Related Documentation

- `AUTORUN.ps1` - Main launcher script with all options
- `docs/development/TAURI_SETUP.md` - Complete Tauri environment setup
- `README.md` - Project overview and quick start
