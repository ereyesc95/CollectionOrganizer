# Packaging SleeveStack for Windows

SleeveStack can be built as a **standalone Windows app** that does not require Python, Node, or any libraries on the target PC.

## What you get

| Output | Description |
|--------|-------------|
| `dist\SleeveStack\SleeveStack.exe` | Double-click to start (opens browser to the app) |
| `dist\SleeveStack-portable.zip` | Zip the folder above and copy to any PC |
| `dist\SleeveStack-Setup-1.0.0.exe` | Optional installer (requires Inno Setup) |

Your data is stored in `data\` next to the executable (`collection.db`, autograph photos).

## Build on your dev machine (one time)

**Requirements:** Windows, [Python 3.11+](https://www.python.org/downloads/), [Node.js](https://nodejs.org/)

```powershell
cd "c:\Users\reyedu01\AI Projects\Collection Organizer"
.\build.ps1
```

This will:

1. Build the React UI (`frontend\dist`)
2. Install Python dependencies + PyInstaller
3. Bundle everything into `dist\SleeveStack\`
4. Create `dist\SleeveStack-portable.zip`

**First launch:** double-click `SleeveStack.exe`. A browser window opens to the app. The server runs locally on port 8765 (or the next free port).

## Optional: Windows installer (.exe setup wizard)

1. Install [Inno Setup 6](https://jrsoftware.org/isinfo.php)
2. Run `build.ps1` first
3. Open `installer\installer.iss` in Inno Setup → **Compile**
4. Output: `dist\SleeveStack-Setup-1.0.0.exe`

Installs to `%LocalAppData%\Programs\SleeveStack` by default (no admin required).

## Optional: custom icon

Place `assets\SleeveStack.ico` before running `build.ps1` (256×256 `.ico`).

## Notes

- **Antivirus:** PyInstaller builds are sometimes flagged falsely. You may need to allowlist the exe or sign it for distribution.
- **Collection.xlsx:** If present in the project root during build, it is copied next to the exe for first-run import.
- **Covers / animations folders:** Still chosen via the app menu; they are not bundled (your image libraries stay external).
- **Updates:** Re-run `build.ps1` after code changes and replace the folder or reinstall.

## Troubleshooting build

```powershell
# Test dev launcher before packaging
python desktop_launcher.py

# Verbose PyInstaller log
python -m PyInstaller --clean SleeveStack.spec --log-level DEBUG
```

If the window flashes and closes, rebuild with `console=True` in `SleeveStack.spec` temporarily to see errors.
