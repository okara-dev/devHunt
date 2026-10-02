@echo off
title Bots - Launcher
:menu
cls
echo ==========================================
echo              BOT LAUNCHER
echo ==========================================
echo.
echo   [1] Wissens-Manager
echo   [2] Haushalts-Assistent
echo   [3] Dev-Chat-Bot
echo   [4] Lern Chat-Bot
echo   [5] Ebook Bot
echo.
echo   [b] Beenden
echo.
echo ==========================================
set /p choice="Auswahl: "

if /i "%choice%"=="1" goto wissen
if /i "%choice%"=="2" goto haushalt
if /i "%choice%"=="3" goto devbot
if /i "%choice%"=="4" goto lernbot
if /i "%choice%"=="5" goto ebook
if /i "%choice%"=="b" goto ende
goto menu

:wissen
start "Wissens-Manager" cmd /k "cd /d C:\Users\on1722454\Desktop\Projekte\programme\bots\wissens-manager && python main.py"
goto menu

:haushalt
start "Haushalts-Assistent" cmd /k "cd /d C:\Users\on1722454\Desktop\Projekte\programme\bots\haushalts-assistent && python main.py"
goto menu

:devbot
start "Dev-Chat-Bot" cmd /k "cd /d C:\Users\on1722454\Desktop\Projekte\programme\bots\dev-chatbot && python main.py"
goto menu

:lernbot
start "Lern Chat-Bot" cmd /k "cd /d C:\Users\on1722454\Desktop\Projekte\programme\bots\lern-bot && python main.py"
goto menu

:ebook
start "Ebook-Bot" cmd /k "cd /d C:\Users\on1722454\Desktop\Projekte\programme\bots\ebook-bot && python main.py"
goto menu

:ende
exit