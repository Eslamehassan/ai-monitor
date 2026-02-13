Stop the running AI Monitor server, then redeploy it with a fresh frontend build.

## Environment

First, set the project root:
```bash
PROJECT_DIR="$(cd "$(dirname "$(find . -name '.env' -maxdepth 1 2>/dev/null | head -1)")/../" 2>/dev/null && pwd)" || PROJECT_DIR="$PWD"
```

## Steps

1. Stop the currently running service:

**macOS / Linux:**
```bash
"$PROJECT_DIR/services/install-service.sh" uninstall
```

**Windows** (tell the user to run this in PowerShell as Administrator):
```powershell
powershell -ExecutionPolicy Bypass -File services\windows\install-service.ps1 -Action uninstall
```

2. Now run the `/deploy` command to rebuild and start the server.
