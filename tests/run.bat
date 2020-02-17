@echo off

set DIR=%~dp0.
set workspace=%DIR%\workspace

if exist "%workspace%" rmdir /Q /S "%workspace%"
mkdir "%workspace%"
cd "%workspace%"

call npm init -y
call npm install --save "%DIR%\.."
cls

set PATH=%workspace%\node_modules\.bin;%PATH%

rem :: -------------------------------------------------------------------------

rem :: =================================
rem :: download a movie
rem :: (link format used on home page)
rem ::
rem :: movie: Speed
rem :: =================================

call crackdl -q -mc 5 -u "https://www.crackle.com/watch/playlist/10000013/2507152"

rem :: -------------------------------------------------------------------------

rem :: =================================
rem :: download a movie
rem :: (link format used on 'Movies' page)
rem ::
rem :: movie: Taxi Driver
rem :: =================================

call crackdl -q -mc 5 -u "https://www.crackle.com/watch/541"

rem :: -------------------------------------------------------------------------

rem :: =================================
rem :: download an episode
rem :: (link format used on home page)
rem ::
rem :: TV episode: Going From Broke S01E07
rem :: =================================

call crackdl -q -mc 5 -u "https://www.crackle.com/watch/playlist/2131144/2509683"

rem :: -------------------------------------------------------------------------

rem :: =================================
rem :: download an episode
rem :: (link format used on pages categorized under 'TV series')
rem ::
rem :: TV episode: Who's The Boss S07E03
rem :: =================================

call crackdl -q -mc 5 -u "https://www.crackle.com/watch/3023/2510731"

rem :: -------------------------------------------------------------------------

rem :: =================================
rem :: download a series
rem :: (link format used on 'TV series' page)
rem ::
rem :: TV series: Who's The Boss
rem :: =================================

call crackdl -mc 5 -u "https://www.crackle.com/watch/3023"

rem :: -------------------------------------------------------------------------

rem :: =================================
rem :: print a trace of the operations
rem :: that would occur IF a series
rem :: were to be downloaded
rem ::
rem :: TV series: Who's The Boss
rem :: =================================

call crackdl -dr -ll 1 -u "https://www.crackle.com/watch/3023"
call crackdl -dr -ll 2 -u "https://www.crackle.com/watch/3023"
call crackdl -dr -ll 3 -u "https://www.crackle.com/watch/3023"

rem :: -------------------------------------------------------------------------

rem :: =================================
rem :: download a series (advanced)
rem ::
rem :: TV series: Who's The Boss
rem :: =================================

call crackdl -dr -ll 1 -u "https://www.crackle.com/watch/3023" >"episode_urls.txt"
call crackdl -dr -ll 2 -u "https://www.crackle.com/watch/3023" >"convert_mp4s.bat"

call crackdl -nm -mc 5 -i "episode_urls.txt" >"log.txt" 2>&1

call "convert_mp4s.bat"

rem :: -------------------------------------------------------------------------

echo.
pause
