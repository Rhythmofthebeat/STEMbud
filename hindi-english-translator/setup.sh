#!/bin/sh
set -eu
cd "$(dirname "$0")"
PYTHON_BIN=${PYTHON_BIN:-python3.11}
"$PYTHON_BIN" -c 'import sys; assert sys.version_info[:2] == (3, 11), "Use Python 3.11"'
if [ ! -x .venv/bin/python ]; then
  "$PYTHON_BIN" -m venv .venv
fi
if [ "$(uname -s)" = Darwin ] && command -v xcrun >/dev/null 2>&1; then
  SDK_PATH=$(xcrun --show-sdk-path)
  export CPLUS_INCLUDE_PATH="$SDK_PATH/usr/include/c++/v1${CPLUS_INCLUDE_PATH:+:$CPLUS_INCLUDE_PATH}"
fi
.venv/bin/python -m pip install --no-cache-dir -r requirements.txt
.venv/bin/python -m pip check
printf '\nSetup complete. Run ./run.sh and open http://127.0.0.1:7860\n'
