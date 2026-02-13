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
if [ -f "$SETTINGS_FILE" ]; then
    # Check if python3 is available for JSON manipulation
    if command -v python3 &> /dev/null; then
        python3 -c "
import json, sys

settings_path = '$SETTINGS_FILE'
hook_script = '$HOOK_SCRIPT'
events = $( printf '%s\n' "${EVENTS[@]}" | python3 -c "import sys,json; print(json.dumps([l.strip() for l in sys.stdin]))" )

with open(settings_path, 'r') as f:
    settings = json.load(f)

existing_hooks = settings.get('hooks', [])

# Remove any existing ai-monitor hooks
existing_hooks = [h for h in existing_hooks if not any(
    hook.get('command', '').endswith('monitor-hook.sh')
    for hook in h.get('hooks', [])
)]

# Add new hooks
for event in json.loads(events):
    existing_hooks.append({
        'matcher': event,
        'hooks': [{'type': 'command', 'command': hook_script}]
    })

settings['hooks'] = existing_hooks

with open(settings_path, 'w') as f:
    json.dump(settings, f, indent=2)

print('Hooks installed successfully into', settings_path)
"
    else
        echo "Error: python3 is required to safely merge hooks into existing settings."
        echo "Please install Python 3 or manually add hooks to $SETTINGS_FILE"
        exit 1
    fi
else
    # Create new settings file with hooks
    mkdir -p "$(dirname "$SETTINGS_FILE")"
    echo "$HOOKS_JSON" | python3 -c "
import json, sys
hooks = json.load(sys.stdin)
settings = {'hooks': hooks}
with open('$SETTINGS_FILE', 'w') as f:
    json.dump(settings, f, indent=2)
print('Created', '$SETTINGS_FILE', 'with AI Monitor hooks')
"
fi

echo ""
echo "AI Monitor hooks installed! Events hooked:"
for event in "${EVENTS[@]}"; do
    echo "  - $event"
done
echo ""
echo "Hook script: $HOOK_SCRIPT"
echo "Restart Claude Code for hooks to take effect."
