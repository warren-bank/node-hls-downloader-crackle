#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
workspace="${DIR}/workspace"

[ -d "$workspace" ] && rm -rf "$workspace"
mkdir "$workspace"
cd "$workspace"

npm init -y
npm install --save "${DIR}/.."
clear

PATH="${workspace}/node_modules/.bin:${PATH}"

# ------------------------------------------------------------------------------

# =================================
# download a movie
# (link format used on home page)
#
# movie: Speed
# =================================

crackdl -q -mc 5 -u 'https://www.crackle.com/watch/playlist/10000013/2507152'

# ------------------------------------------------------------------------------

# =================================
# download a movie
# (link format used on 'Movies' page)
#
# movie: Taxi Driver
# =================================

crackdl -q -mc 5 -u 'https://www.crackle.com/watch/541'

# ------------------------------------------------------------------------------

# =================================
# download an episode
# (link format used on home page)
#
# TV episode: Going From Broke S01E07
# =================================

crackdl -q -mc 5 -u 'https://www.crackle.com/watch/playlist/2131144/2509683'

# ------------------------------------------------------------------------------

# =================================
# download an episode
# (link format used on pages categorized under 'TV series')
#
# TV episode: Who's The Boss S07E03
# =================================

crackdl -q -mc 5 -u 'https://www.crackle.com/watch/3023/2510731'

# ------------------------------------------------------------------------------

# =================================
# download a series
# (link format used on 'TV series' page)
#
# TV series: Who's The Boss
# =================================

crackdl -mc 5 -u 'https://www.crackle.com/watch/3023'

# ------------------------------------------------------------------------------

# =================================
# print a trace of the operations
# that would occur IF a series
# were to be downloaded
#
# TV series: Who's The Boss
# =================================

crackdl -dr -ll 1 -u 'https://www.crackle.com/watch/3023'
crackdl -dr -ll 2 -u 'https://www.crackle.com/watch/3023'
crackdl -dr -ll 3 -u 'https://www.crackle.com/watch/3023'

# ------------------------------------------------------------------------------

# =================================
# download a series (advanced)
#
# TV series: Who's The Boss
# =================================

crackdl -dr -ll 1 -u 'https://www.crackle.com/watch/3023' >'episode_urls.txt'
crackdl -dr -ll 2 -u 'https://www.crackle.com/watch/3023' >'convert_mp4s.sh'

crackdl -nm -mc 5 -i 'episode_urls.txt' >'log.txt' 2>&1

./convert_mp4s.sh

# ------------------------------------------------------------------------------
