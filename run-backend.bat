@echo off
echo Starting KalshiProto Backend...
cd /d "%~dp0backend"

IF NOT EXIST "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating venv...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt -q

echo.
echo ========================================
echo Starting API server on http://localhost:8000
echo Docs: http://localhost:8000/docs
echo ========================================
echo.

uvicorn main:app --reload
