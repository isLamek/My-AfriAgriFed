@echo off
rem Puts the latest main on the LIVE site: https://afriagrifed-ebc30.web.app
rem Run it from a Command Prompt:   scripts\deploy-live.cmd
rem
rem What it does: gets the latest main, installs, runs every test, builds the website with NO backend
rem address (so visitors' browsers are never sent to localhost), checks that, then deploys the website
rem and the database rules together. It stops at the first problem and tells you which step failed.
rem Nothing secret is printed or stored here. You sign in to Firebase in your browser when asked.

setlocal
cd /d "%~dp0.."

echo.
echo === 1/6  Getting the latest main
git checkout main || goto :fail
git pull origin main || goto :fail

echo.
echo === 2/6  Installing
call npm ci || goto :fail

echo.
echo === 3/6  Running every test
set CI=true
call npm test -- --watchAll=false || goto :fail

echo.
echo === 4/6  Building the website (no backend address yet)
set CI=false
rem A single space: it beats the localhost address in your .env and counts as "not set".
set "REACT_APP_API_URL= "
call npm run build || goto :fail

echo.
echo === 5/6  Checking the build does not point at your own computer
findstr /s /m /c:"localhost:5000" build\static\js\*.js >nul 2>&1
if not errorlevel 1 (
  echo STOP: the build still contains http://localhost:5000. Nothing was deployed.
  goto :fail
)
echo OK

echo.
echo === 6/6  Deploying the website and the database rules to the LIVE site
call npx firebase-tools login || goto :fail
call npx firebase-tools deploy --only "hosting,firestore:rules,database" --project afriagrifed-ebc30 || goto :fail

echo.
echo Done. Open https://afriagrifed-ebc30.web.app and press Ctrl+F5.
echo The chatbot, payments and delivery need the backend online: see docs\YOUR_TODO.md, section 2.
exit /b 0

:fail
echo.
echo *** Stopped: the step above failed. Nothing further was run. ***
exit /b 1
