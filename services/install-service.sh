#!/usr/bin/env bash
# Install AI Monitor as a background service (macOS/Linux)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
ACTION="${1:-install}"
ENV_FILE="$PROJECT_DIR/.env"

# Read port from .env (default 6821)
PORT="6821"
if [ -f "$ENV_FILE" ]; then
    PORT=$(grep -E '^AI_MONITOR_PORT=' "$ENV_FILE" | cut -d= -f2 | tr -d '[:space:]')
    PORT="${PORT:-6821}"
fi

mkdir -p "$LOG_DIR"

install_macos() {
    local PLIST_SRC="$SCRIPT_DIR/macos/com.ai-monitor.plist"
    local PLIST_DST="$HOME/Library/LaunchAgents/com.ai-monitor.plist"

    # Stop existing service if running
    launchctl bootout "gui/$(id -u)/com.ai-monitor" 2>/dev/null || true

    # Template the plist with actual paths and port
    sed -e "s|__INSTALL_DIR__|${PROJECT_DIR}|g" -e "s|__PORT__|${PORT}|g" "$PLIST_SRC" > "$PLIST_DST"

    # Load the service
    launchctl bootstrap "gui/$(id -u)" "$PLIST_DST"

    echo "AI Monitor installed as macOS LaunchAgent."
    echo "  Plist: $PLIST_DST"
    echo "  Logs:  $LOG_DIR/ai-monitor.log"
    echo ""
    echo "Commands:"
    echo "  Start:   launchctl kickstart gui/$(id -u)/com.ai-monitor"
    echo "  Stop:    launchctl kill SIGTERM gui/$(id -u)/com.ai-monitor"
    echo "  Status:  launchctl print gui/$(id -u)/com.ai-monitor"
    echo "  Logs:    tail -f $LOG_DIR/ai-monitor.log"
}

uninstall_macos() {
    launchctl bootout "gui/$(id -u)/com.ai-monitor" 2>/dev/null || true
    rm -f "$HOME/Library/LaunchAgents/com.ai-monitor.plist"
    echo "AI Monitor LaunchAgent removed."
}

install_linux() {
    local SERVICE_SRC="$SCRIPT_DIR/linux/ai-monitor.service"
    local SERVICE_DST="$HOME/.config/systemd/user/ai-monitor.service"

    mkdir -p "$HOME/.config/systemd/user"

    # Template the service file with actual paths and port
    sed -e "s|__INSTALL_DIR__|${PROJECT_DIR}|g" -e "s|__PORT__|${PORT}|g" "$SERVICE_SRC" > "$SERVICE_DST"

    # Reload and enable
    systemctl --user daemon-reload
    systemctl --user enable ai-monitor.service
    systemctl --user start ai-monitor.service

    echo "AI Monitor installed as systemd user service."
    echo "  Unit: $SERVICE_DST"
    echo "  Logs: $LOG_DIR/ai-monitor.log"
    echo ""
    echo "Commands:"
    echo "  Status:  systemctl --user status ai-monitor"
    echo "  Stop:    systemctl --user stop ai-monitor"
    echo "  Restart: systemctl --user restart ai-monitor"
    echo "  Logs:    journalctl --user -u ai-monitor -f"
}

uninstall_linux() {
    systemctl --user stop ai-monitor.service 2>/dev/null || true
    systemctl --user disable ai-monitor.service 2>/dev/null || true
    rm -f "$HOME/.config/systemd/user/ai-monitor.service"
    systemctl --user daemon-reload
    echo "AI Monitor systemd service removed."
}

# Detect OS and run
OS="$(uname -s)"
case "$ACTION" in
    install)
        case "$OS" in
            Darwin) install_macos ;;
            Linux)  install_linux ;;
            *)      echo "Unsupported OS: $OS. Use services/windows/install-service.ps1 for Windows." ; exit 1 ;;
        esac
        ;;
    uninstall)
        case "$OS" in
            Darwin) uninstall_macos ;;
            Linux)  uninstall_linux ;;
            *)      echo "Unsupported OS: $OS" ; exit 1 ;;
        esac
        ;;
    *)
        echo "Usage: $0 [install|uninstall]"
        exit 1
        ;;
esac
