### [_Crackle_ Downloader](https://github.com/warren-bank/node-hls-downloader-crackle)

Command-line utility for downloading an offline copy of [_Crackle_](https://www.crackle.com/) HLS video streams.

#### Installation:

```bash
npm install --global @warren-bank/node-hls-downloader-crackle
```

#### Features:

* accepts URLs that identify:
  - a single movie
  - a single episode contained in a series
  - an entire series
    * includes all episodes in every seasons
* downloads:
  - the highest available quality for each video stream
  - _vtt_ subtitles for all available languages
  - will continue upon restart after an abrupt interruption
* resulting file structure:
  ```bash
    |- {title_series}/
    |  |- {title_episode}/
    |  |  |- hls/
    |  |  |  |- video/
    |  |  |  |  |- *.ts
    |  |  |  |- audio/
    |  |  |  |  |- {language}/
    |  |  |  |  |  |- *.ts
    |  |  |  |  |- {language}.m3u8
    |  |  |  |- video.m3u8
    |  |  |  |- master.m3u8
    |  |  |- mp4/
    |  |  |  |- video.mp4
    |  |  |  |- video.{language}.vtt
    |  |  |  |- video.{language}.srt
  ```

#### Usage:

```bash
crackdl <options>

options:
========
"-h"
"--help"
    Print a help message describing all command-line options.

"-v"
"--version"
    Display the version.

"-q"
"--quiet"
    Do not print a verbose log of operations.

"-ll" <integer>
"--log-level" <integer>
    Specify the log verbosity level.
      0 = no output (same as --quiet)
      1 = include only episode Crackle URLs
      2 = include only episode ffmpeg commands
      3 = include all operational metadata (default)

"-dr"
"--dry-run"
    Do not write to the file system.

"-nm"
"--no-mp4"
    Do not use "ffmpeg" to bundle the downloaded video stream into an .mp4 file container.

"-mc" <integer>
"--max-concurrency" <integer>
"--threads" <integer>
    Specify the maximum number of URLs to download in parallel.
    The default is 1, which processes the download queue sequentially.

"-P" <dirpath>
"--directory-prefix" <dirpath>
    Specifies the directory where the resulting file structure will be saved to.
    The default is "." (the current directory).

"-u" <URL>
"--url" <URL>
    Specify a Crackle URL. (movie, episode, or series)

"-i <filepath>"
"--input-file <filepath>"
    Read Crackle URLs from a local text file. Format is one URL per line.
```

#### Example:

* download a movie (link format used on [home](https://www.crackle.com/) page):
  ```bash
    # movie: Speed
    crackdl -q -mc 5 -u 'https://www.crackle.com/watch/playlist/10000013/2507152'
  ```
* download a movie (link format used on [Movies](https://www.crackle.com/movies) page):
  ```bash
    # movie: Taxi Driver
    crackdl -q -mc 5 -u 'https://www.crackle.com/watch/541'
  ```
* download an episode (link format used on [home](https://www.crackle.com/) page):
  ```bash
    # TV episode: Going From Broke S01E07
    crackdl -q -mc 5 -u 'https://www.crackle.com/watch/playlist/2131144/2509683'
  ```
* download an episode (link format used on pages categorized under [TV series](https://www.crackle.com/shows)):
  ```bash
    # TV episode: Who's The Boss S07E03
    crackdl -q -mc 5 -u 'https://www.crackle.com/watch/3023/2510731'
  ```
* download a series (link format used on [TV series](https://www.crackle.com/shows) page):
  ```bash
    # TV series: Who's The Boss
    crackdl -mc 5 -u 'https://www.crackle.com/watch/3023'
  ```
* print a trace of the operations that would occur IF a series were to be downloaded:
  ```bash
    # TV series: Who's The Boss
    crackdl -dr -ll 1 -u 'https://www.crackle.com/watch/3023'
    crackdl -dr -ll 2 -u 'https://www.crackle.com/watch/3023'
    crackdl -dr -ll 3 -u 'https://www.crackle.com/watch/3023'
  ```
* download a series (advanced):
  ```bash
    # TV series: Who's The Boss
    crackdl -dr -ll 1 -u 'https://www.crackle.com/watch/3023' >'episode_urls.txt'
    crackdl -dr -ll 2 -u 'https://www.crackle.com/watch/3023' >'convert_mp4s.sh'

    crackdl -nm -mc 5 -i 'episode_urls.txt' >'log.txt' 2>&1

    ./convert_mp4s.sh
  ```

##### suggestions:

1. download with options: `--no-mp4 --log-level 3`
   * redirect stdout to a log file
   * when download completes, check the log file for any error messages
   * if any _.ts_ chunks encountered a download problem
     - identify the url of the _Crackle_ page that was being processed when this error occurred
     - redownload that page (using the same `--directory-prefix`)
       * all previously downloaded data __not__ be modified or deleted
       * only missing data will be retrieved
2. repeat the above process until the log file shows no download errors
3. finally, convert the HLS stream to _mp4_
   * the `ffmpeg` command to perform this conversion is included in the log file
   * when converting the episodes in a series, a list of all `ffmpeg` commands can be generated with the options: `--dry-run --log-level 2`

#### Requirements:

* Node version: v6.13.0 (and higher)
  * [ES6 support](http://node.green/)
    * v0.12.18+: Promise
    * v4.08.03+: Object shorthand methods
    * v5.12.00+: spread operator
    * v6.04.00+: Proxy constructor
    * v6.04.00+: Proxy 'apply' handler
    * v6.04.00+: Reflect.apply
  * [URL](https://nodejs.org/api/url.html)
    * v6.13.00+: [Browser-compatible URL class](https://nodejs.org/api/url.html#url_class_url)
  * tested in:
    * v7.9.0
* FFmpeg
  * not required in `PATH` when using the `--no-mp4` CLI option
  * successfully tested with version: _4.1.3_

#### Legal:

* copyright: [Warren Bank](https://github.com/warren-bank)
* license: [GPL-2.0](https://www.gnu.org/licenses/old-licenses/gpl-2.0.txt)
