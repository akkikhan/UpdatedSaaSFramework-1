#!/bin/bash
# Reset sample data in .NET Claims demo API
set -e
curl -s -X POST http://localhost:5299/claims/reset >/dev/null && echo "Claims demo data reset"
