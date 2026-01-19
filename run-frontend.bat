@echo off
echo Starting KalshiProto Frontend...
cd /d "%~dp0frontend"

IF NOT EXIST "node_modules" (
    echo Installing dependencies...
    npm install
)

echo.
echo ========================================
echo Starting dashboard on http://localhost:5173
echo ========================================
echo.

npm run dev
