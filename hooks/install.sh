#!/usr/bin/env bash
# Install AI Monitor hooks into ~/.claude/settings.json
# This adds hook entries for all Claude Code event types.

set -e

SETTINGS_FILE="$HOME/.claude/settings.json"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOOK_SCRIPT="${SCRIPT_DIR}/monitor-hook.sh"

# Ensure hook script is executable
chmod +x "$HOOK_SCRIPT"

# Ensure ~/.claude directory exists
mkdir -p "$HOME/.claude"

# Event types to hook into
EVENTS=(
    "PreToolUse"
    "PostToolUse"
    "Notification"
    "SubagentStop"
    "SubagentStart"
    "Stop"
)

# Build the hooks array
HOOKS_JSON="["
FIRST=true
for event in "${EVENTS[@]}"; do
    if [ "$FIRST" = true ]; then
        FIRST=false
    else
        HOOKS_JSON+=","
    fi
    HOOKS_JSON+=$(cat <<ENTRY
    {
      "matcher": "${event}",
      "hooks": [
        {
          "type": "command",
          "command": "${HOOK_SCRIPT}"
        }
      ]
    }
ENTRY
)
done
HOOKS_JSON+="]"

# If settings file exists, merge hooks; otherwise create it
if command -v python3 &> /dev/null; then
    python3 -c "
import json, os

settings_path = '$SETTINGS_FILE'
hook_script = '$HOOK_SCRIPT'
events = ['PreToolUse', 'PostToolUse', 'Notification', 'SubagentStop', 'SubagentStart', 'Stop']

# Load or create settings
if os.path.exists(settings_path):
    with open(settings_path, 'r') as f:
        settings = json.load(f)
else:
    os.makedirs(os.path.dirname(settings_path), exist_ok=True)
    settings = {}

hooks = settings.get('hooks', {})

# hooks is a dict keyed by event name, each value is a list of hook entries
if isinstance(hooks, list):
    hooks = {}  # reset if somehow in wrong format

for event in events:
    event_hooks = hooks.get(event, [])

    # Remove any existing ai-monitor hook entries
    event_hooks = [
        entry for entry in event_hooks
        if not any(
            h.get('command', '').endswith('monitor-hook.sh')
            for h in (entry.get('hooks', []) if isinstance(entry, dict) else [])
        )
    ]

    # Add ai-monitor hook
    event_hooks.append({
        'hooks': [{'type': 'command', 'command': hook_script}]
    })

    hooks[event] = event_hooks

settings['hooks'] = hooks

with open(settings_path, 'w') as f:
    json.dump(settings, f, indent=2)

print('Hooks installed successfully into', settings_path)
"
else
    echo "Error: python3 is required to safely merge hooks into existing settings."
    echo "Please install Python 3 or manually add hooks to $SETTINGS_FILE"
    exit 1
fi

echo ""
echo "AI Monitor hooks installed! Events hooked:"
for event in "${EVENTS[@]}"; do
    echo "  - $event"
done
echo ""
echo "Hook script: $HOOK_SCRIPT"
echo "Restart Claude Code for hooks to take effect."
