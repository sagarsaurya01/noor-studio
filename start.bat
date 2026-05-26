@echo off
set ANTHROPIC_API_KEY=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
set OPENAI_API_KEY=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
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
