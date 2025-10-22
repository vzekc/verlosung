#!/bin/bash

# Check if Python 3 is available
if command -v python3 &>/dev/null; then
    echo "Starting Python HTTP server on http://localhost:8555"
    python3 -m http.server 8555
elif command -v python &>/dev/null; then
    # Check if Python is version 3
    if python -c 'import sys; sys.exit(0 if sys.version_info[0] == 3 else 1)'; then
        echo "Starting Python HTTP server on http://localhost:8555"
        python -m http.server 8555
    else
        echo "Error: Python 3 is required but not found"
        exit 1
    fi
else
    echo "Error: Python 3 is required but not found"
    exit 1
fi 
