@echo off
set ANTHROPIC_API_KEY=YOUR_KEY_HERE
set OPENAI_API_KEY=YOUR_KEY_HERE
cd /d "%~dp0"

echo ==========================================
echo   NOOR STUDIO — AI Video Content
echo ==========================================
echo.
echo Stopping any other running servers first...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo Done. Starting Noor Studio...
echo Open http://localhost:3000 in your browser
echo Press Ctrl+C to stop.
echo ==========================================
echo.
npm run dev
pause
