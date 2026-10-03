@echo off
title Bots - Launcher
:menu
cls
echo ==========================================
echo              BOT LAUNCHER
echo ==========================================
echo.
echo   [1] Wissens-Manager
echo   [2] Dev-Chat-Bot
echo   [3] Lern Chat-Bot
echo   [4] Ebook Bot
echo.
echo   [b] Beenden
echo.
echo ==========================================
set /p choice="Auswahl: "

if /i "%choice%"=="1" goto wissen
if /i "%choice%"=="2" goto devbot
if /i "%choice%"=="3" goto lernbot
if /i "%choice%"=="4" goto ebook
if /i "%choice%"=="b" goto ende
goto menu

:wissen
start "Wissens-Manager" cmd /k "cd /d C:\Users\on1722454\Desktop\Projekte\devHunt\bots\wissens-manager && python main.py"
goto menu

:devbot
start "Dev-Chat-Bot" cmd /k "cd /d C:\Users\on1722454\Desktop\Projekte\devHunt\bots\dev-chatbot && python main.py"
goto menu

:lernbot
start "Lern Chat-Bot" cmd /k "cd /d C:\Users\on1722454\Desktop\Projekte\devHunt\bots\lern-bot && python main.py"
goto menu

:ebook
start "Ebook-Bot" cmd /k "cd /d C:\Users\on1722454\Desktop\Projekte\devHunt\bots\ebook-bot && python main.py"
goto menu

:ende
exit