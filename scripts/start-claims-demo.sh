#!/bin/bash

# Cross-platform Claims Demo startup script
# Builds core SDK packages and launches the platform server,
# .NET Claims API and Angular Claims app.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ensure API keys are available for logging and email notifications
if [ -z "$LOGGING_API_KEY" ] || [ -z "$EMAIL_API_KEY" ]; then
  echo "Warning: LOGGING_API_KEY or EMAIL_API_KEY not set; logging or email notifications may be disabled." >&2
else
  export LOGGING_API_KEY EMAIL_API_KEY
fi

build_pkg() {
  local pkg=$1
  echo "Building $pkg package..."
  if (cd "$SCRIPT_DIR/../packages/$pkg" && npm install && npm run build); then
    echo "Built $pkg"
  else
    echo "Warning: $pkg package build failed, continuing..." >&2
  fi
}

# Build SDK packages
for pkg in auth-client auth logging rbac; do
  build_pkg "$pkg"
done

# Start platform server
echo "Starting Platform server (http://localhost:5000)..."
(
  cd "$SCRIPT_DIR/.." && npm run dev
) &
platform_pid=$!
sleep 2

# Start .NET Claims API
echo "Starting .NET Claims API (http://localhost:5299)..."
(
  cd "$SCRIPT_DIR/../examples/claims-dotnet" && dotnet run --urls http://localhost:5299
) &
dotnet_pid=$!
sleep 2

# Start Angular Claims App
echo "Starting Angular Claims App (http://localhost:5173)..."
(
  cd "$SCRIPT_DIR/../examples/claims-angular" && npm install && npx ng serve --port 5173 --open
) &
angular_pid=$!

echo "Platform PID: $platform_pid"
echo ".NET API PID: $dotnet_pid"
echo "Angular PID: $angular_pid"
echo "Use Ctrl+C to stop all processes."

wait
