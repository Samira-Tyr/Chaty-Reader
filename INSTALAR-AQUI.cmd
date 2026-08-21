@echo off
chcp 65001 >nul
title Instalar Chaty Reader

echo.
echo  CHATY READER
echo  AI Memory Decoder - instalacion local y privada
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0interno\Instalar.ps1"

if errorlevel 1 (
  echo.
  echo No se pudo completar la instalacion de Chaty Reader.
  echo Deja esta ventana abierta y revisa el mensaje anterior.
) else (
  echo.
  echo Instalacion completada. Ya puedes cerrar esta ventana.
)

echo.
pause
