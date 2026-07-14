@echo off
setlocal EnableDelayedExpansion

rem Backup script for data-capture-app
rem Creates a timestamped zip of the project excluding node_modules and build artifacts

set PROJECT_DIR=C:\Users\kimgr\data-capture-app
set BACKUP_DIR=C:\Users\kimgr\data-capture-app\backups
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (
    set MYDATE=%%c-%%a-%%b
)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (
    set MYTIME=%%a%%b
)
set TIMESTAMP=%MYDATE%_%MYTIME%
set BACKUP_NAME=backup_data-capture_%TIMESTAMP%
set BACKUP_PATH=%BACKUP_DIR%\%BACKUP_NAME%

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Backing up %PROJECT_DIR% to %BACKUP_PATH%.zip ...

powershell -NoProfile -ExecutionPolicy Bypass -Command "
    $source = '%PROJECT_DIR%';
    $dest = '%BACKUP_PATH%.zip';
    $exclude = @('node_modules', '.expo', 'dist', 'android', 'ios', '*.zip');
    Get-ChildItem -Path $source -Recurse -Exclude $exclude |
        Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\.expo\\' -and $_.FullName -notmatch '\\dist\\' -and $_.FullName -notmatch '\\backups\\' } |
        Compress-Archive -DestinationPath $dest -Update
"

if %ERRORLEVEL% == 0 (
    echo Backup created: %BACKUP_PATH%.zip
) else (
    echo Backup failed.
)

pause
