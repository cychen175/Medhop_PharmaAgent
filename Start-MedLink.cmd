@echo off
setlocal
cd /d "%~dp0"
set "PYTHONUTF8=1"
set "PYTHONDONTWRITEBYTECODE=1"
if not defined MEDLINK_PYTHON if exist "%~dp0.venv\Scripts\python.exe" set "MEDLINK_PYTHON=%~dp0.venv\Scripts\python.exe"
if not defined MEDLINK_PYTHON if exist "%~dp0..\..\work\api314\Scripts\python.exe" set "MEDLINK_PYTHON=%~dp0..\..\work\api314\Scripts\python.exe"
if not defined MEDLINK_PYTHON (
  echo Python 3.14 environment not found. Create .venv and install requirements.txt; see README.md.
  pause
  exit /b 1
)
if not defined MEDHOP_PYTHON if exist "C:\Users\labpc\Downloads\MedLink_PharmaAgent\.venv\Scripts\python.exe" set "MEDHOP_PYTHON=C:\Users\labpc\Downloads\MedLink_PharmaAgent\.venv\Scripts\python.exe"
"%MEDLINK_PYTHON%" -c "import sys;assert sys.version_info[:2]==(3,14),'Python 3.14 required'"
if errorlevel 1 exit /b 1
start "" "http://127.0.0.1:8502"
"%MEDLINK_PYTHON%" -B -m uvicorn asgi:app --host 127.0.0.1 --port 8502 --no-access-log
pause
