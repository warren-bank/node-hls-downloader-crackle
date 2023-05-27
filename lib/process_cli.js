const mkdirSync = require('@warren-bank/mkdir-sync')
const {requestHTTP, downloadHTTP, downloadHLS} = require('@warren-bank/node-hls-downloader')

const Digest    = require('digest-js')
const path      = require('path')
const fs        = require('fs')
const parse_url = require('url').parse
const promisify = require('util').promisify
const exec      = require('child_process').exec

const spawn     = promisify(exec)

// -----------------------------------------------------------------------------
// returns a Promise that resolves after all downloads are complete.

const process_cli = function(argv_vals){
  // ---------------------------------------------------------------------------

  const download_file = async function(url, headers){
    const options = (!headers)
      ? url
      : Object.assign({}, parse_url(url), {headers})

    let file
    try {
      file = await requestHTTP(options)
      file = file.response.toString()
    }
    catch(err) {
      file = ""
    }
    return file
  }

  const download_json = async function(url, headers){
    const json = await download_file(url, headers)
    let data
    try {
      data = JSON.parse(json)
    }
    catch(err) {
      data = null
    }
    return data
  }

  const pad_zeros = (num, len) => {
    let str = num.toString()
    let pad = len - str.length
    if (pad > 0)
      str = ('0').repeat(pad) + str
    return str
  }

  // ---------------------------------------------------------------------------
  // API

  const API = {
    // -------------------------------------------------------------------------

    url_regex: {
      series: new RegExp('^/watch/([\\d]+)$', 'i'),
      video:  new RegExp('^/watch(?:/playlist)?/[\\d]+/([\\d]+)$', 'i')
    },

    get_url_pathname: (url) => (new URL(url)).pathname,

    get_url_type: (url) => {
      const pathname = API.get_url_pathname(url)

      if (API.url_regex.series.test(pathname))
        return 'series'
      if (API.url_regex.video.test(pathname))
        return 'video'

      throw new Error(`Error: cannot parse format of Crackle URL: '${url}'`)
    },

    get_video_id: (url) => {
      const pathname = API.get_url_pathname(url)

      return pathname.replace(API.url_regex.video, '$1')
    },

    get_series_id: (url) => {
      const pathname = API.get_url_pathname(url)

      return pathname.replace(API.url_regex.series, '$1')
    },

    // -------------------------------------------------------------------------

    get_video_urls_in_series: async (series_id) => {
      const get_video_ids = async (series_id) => {
        const media_playlist_url = `https://web-api-us.crackle.com/Service.svc/channel/${series_id}/playlists/all/US`
        const req_headers = {
          'Accept' : 'application/json'
        }
        const media     = await download_json(media_playlist_url, req_headers)
        const video_ids = []

        if ((media instanceof Object) && media.Playlists && Array.isArray(media.Playlists) && media.Playlists.length) {
          for (const playlist of media.Playlists) {
            if ((playlist instanceof Object) && playlist.Items && Array.isArray(playlist.Items) && playlist.Items.length) {
              for (const item of playlist.Items) {
                if ((item instanceof Object) && item.MediaInfo && (item.MediaInfo instanceof Object) && item.MediaInfo.Id) {
                  video_ids.push(item.MediaInfo.Id)
                }
              }
            }
          }
        }
        return video_ids
      }

      const video_ids  = await get_video_ids(series_id)
      const video_urls = video_ids.map(video_id => `https://www.crackle.com/watch/${series_id}/${video_id}`)

      return video_urls
    },

    process_series_url: async (series_url) => {
      const series_id = API.get_series_id(series_url)
      const video_urls = await API.get_video_urls_in_series(series_id)

      // assertion
      if (!video_urls.length)
        throw new Error(`Assertion Error: no videos are available in series at Crackle URL: '${series_url}'`)

      return {video_urls}
    },

    // -------------------------------------------------------------------------

    get_video_metadata: async (video_id) => {
      // https://github.com/ytdl-org/youtube-dl/blob/master/youtube_dl/extractor/crackle.py

      let metadata = {series_title: null, video_title: null, hls_url: null, vtt_url: null, vtt_language: null}

      const buf2hex = (buffer) => Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('').toUpperCase()

      const get_hmac = (media_detail_url, timestamp) => {
        const key = 'IGSLUQCBDFHEOIFM'
        const msg = [media_detail_url, timestamp].join('|')

        const mac = new Digest.HMAC_SHA1()
        mac.setKey(key)
        mac.update(msg)

        return buf2hex(mac.finalize())
      }

      const preprocess_HLS_url = (hls_url) => {
        const embedded_advertising_qs_params = /(?:expand|ad|ad\.locationDesc|ad\.bumper|ad\.preroll|extsid|ad\.metr|euid)=[^&]*[&]?/ig
        return hls_url.replace(embedded_advertising_qs_params, '')
      }

      const countries = ['US', 'AU', 'CA', 'AS', 'FM', 'GU', 'MP', 'PR', 'PW', 'MH', 'VI']
      for (const country of countries) {
        const media_detail_url = `https://web-api-us.crackle.com/Service.svc/details/media/${video_id}/${country}?disableProtocols=true`

        // %Y%m%d%H%M @ https://strftime.org/ => 197001012359
        const timestamp = ((d) => `${d.getUTCFullYear()}${pad_zeros(d.getUTCMonth() + 1, 2)}${pad_zeros(d.getUTCDate(), 2)}${pad_zeros(d.getUTCHours(), 2)}${pad_zeros(d.getUTCMinutes(), 2)}`)(new Date())

        const hmac = get_hmac(media_detail_url, timestamp)

        const req_headers = {
          'Accept'        : 'application/json',
          'Authorization' : [hmac, timestamp, '117', '1'].join('|')
        }

        const media = await download_json(media_detail_url, req_headers)

        if ((media instanceof Object) && media.MediaURLs && Array.isArray(media.MediaURLs) && media.MediaURLs.length && (media.Title || media.ShowName)) {
          const HLS_urls = media.MediaURLs.filter(obj => ((obj.Type === 'AppleTV.m3u8') && obj.Path)).map(obj => obj.Path).map(url => (url[0] === '/') ? `https:${url}` : url)

          if (HLS_urls.length) {
            let series_title = null
            let video_title  = null
            let hls_url      = null
            let vtt_url      = null
            let vtt_language = null

            let episode_num  = (media.Season && media.Episode)
              ? `S${pad_zeros(media.Season, 2)}E${pad_zeros(media.Episode, 2)}`
              : null

            if (media.ShowName === media.Title) {
              if (episode_num) {
                series_title = media.ShowName
                video_title  = episode_num
              }
              else {
                video_title  = media.Title
              }
            }
            else if (media.Title) {
              // has title, could have show name

              if (media.ShowName)
                series_title = media.ShowName

              video_title = (episode_num)
                ? `${episode_num} - ${media.Title}`
                : media.Title
            }
            else {
              // no title, has show name

              video_title = (episode_num)
                ? `${episode_num} - ${media.ShowName}`
                : media.ShowName
            }

            hls_url = HLS_urls[0]
            hls_url = preprocess_HLS_url(hls_url)

            if (media.ClosedCaptionFiles && Array.isArray(media.ClosedCaptionFiles) && media.ClosedCaptionFiles.length) {
              const VTT_urls = media.ClosedCaptionFiles.filter(obj => ((obj.Type === 'VTT') && obj.Path)).map(obj => obj.Path).map(url => (url[0] === '/') ? `https:${url}` : url)

              if (VTT_urls.length)
                vtt_url = VTT_urls[0]
            }

            if (vtt_url)
              vtt_language = (media.LocalizedLanguage)
                ? media.LocalizedLanguage.toLowerCase()
                : 'english'

            if (video_title && hls_url) {
              metadata = {series_title, video_title, hls_url, vtt_url, vtt_language}
              break
            }
          }
        }
      }
      return metadata
    },

    process_video_url: async (video_url) => {
      const video_id = API.get_video_id(video_url)
      const metadata = await API.get_video_metadata(video_id)

      // assertion
      if (!metadata || !(metadata instanceof Object) || !metadata.video_title || !metadata.hls_url)
        throw new Error(`Assertion Error: no metadata is available for video at Crackle URL: '${video_url}'`)

      // {series_title, video_title, hls_url, vtt_url, vtt_language}
      return metadata
    },

    // -------------------------------------------------------------------------
  }

  // ---------------------------------------------------------------------------

  const process_url = async function(url, type){
    if (!type)
      type = API.get_url_type(url)

    // short-circuit optimization
    if (argv_vals["--dry-run"] && (argv_vals["--log-level"] === 1)) {
      if (type === 'video')  console.log(url)
      if (type !== 'series') return
    }

    switch(type) {
      case 'video':
        await process_video_url(url)
        break
      case 'series':
        await process_series_url(url)
        break
    }
  }

  // ---------------------------------------------------------------------------
  // returns a Promise that resolves after all downloads complete (HLS video, HLS audio, VTT subtitles) for a single movie or TV episode

  const process_video_url = async function(url){
    const {series_title, video_title, hls_url, vtt_url, vtt_language} = await API.process_video_url(url)

    const outputdir = (series_title)
      ? path.join(argv_vals["--directory-prefix"], sanitize_title(series_title), sanitize_title(video_title))
      : path.join(argv_vals["--directory-prefix"], sanitize_title(video_title))

    const configHLS = {
      "--no-clobber":        false,
      "--continue":          true,
    
      "--url":               hls_url,
      "--max-concurrency":   argv_vals["--max-concurrency"],
    
      "--directory-prefix":  path.join(outputdir, 'hls'),
      "--mp4":               ((!argv_vals["--no-mp4"]) ? path.join(outputdir, 'mp4') : null),
    
      "--skip-video":        false,
      "--skip-audio":        false,
      "--skip-subtitles":    true,   // .vtt X-TIMESTAMP-MAP is not currently handled properly by ffmpeg. most videos also include a single aggregate .vtt with captions for the entire video. skip stream and only download aggregate; then convert aggregate to .srt format.
    
      "--min-bandwidth":     null,
      "--max-bandwidth":     null,
      "--highest-quality":   true,
      "--lowest-quality":    false,
    
      "--all-audio":         true,
      "--all-subtitles":     true,
      "--filter-audio":      null,
      "--filter-subtitles":  null
    }

    const configHTTP = {
      "--input-file":        null,
      "--directory-prefix":  path.join(outputdir, 'mp4'),
      "--no-clobber":        true,
      "--max-concurrency":   argv_vals["--max-concurrency"]
    }

    if (!argv_vals["--quiet"]) {
      let ffmpegcmd, vtt2srt
      {
        const mkdir = (vtt_url)  ? '' : `mkdir "${path.join('..', 'mp4')}" & `
        ffmpegcmd   = `cd "${configHLS["--directory-prefix"]}" && ${mkdir}ffmpeg -allowed_extensions ALL -i "master.m3u8" -c copy -movflags +faststart "${path.join('..', 'mp4', 'video.mp4')}"`
        vtt2srt     = (!vtt_url) ? '' : `cd "${configHTTP["--directory-prefix"]}" && ffmpeg -i "video.${vtt_language}.vtt" "video.${vtt_language}.srt"`
      }

      switch(argv_vals["--log-level"]) {
        case 1:
          console.log(url)
          break
        case 2:
          if (vtt2srt) console.log(vtt2srt)
          console.log(ffmpegcmd)
          break
        case 3:
          console.log(`processing page:\n  ${url}\ntype:\n  video\nHLS manifest:\n  ${hls_url}\nVTT subtitles (${vtt_language}):\n  ${vtt_url}\noutput directory:\n  ${outputdir}\nmp4 conversion${argv_vals["--no-mp4"] ? ' (skipped)' : ''}:\n  ${ffmpegcmd}${vtt2srt ? `\nsrt conversion${argv_vals["--no-mp4"] ? ' (skipped)' : ''}:\n  ${vtt2srt}` : ''}`)
          break
        case 0:
        default:
          // noop
          break
      }
    }

    if (!argv_vals["--dry-run"]) {
      const promises = []
      let promise

      promise = start_downloadHLS(configHLS)
      promises.push(promise)

      if (vtt_url) {
        configHTTP["--input-file"] = [`${vtt_url}\tvideo.${vtt_language}.vtt`]

        promise = start_downloadHTTP(configHTTP)

        if (!argv_vals["--no-mp4"]) {
          promise = promise.then(() => {
            // convert .vtt to .srt
            const vtt_path = path.join(configHTTP["--directory-prefix"], `video.${vtt_language}.vtt`)
            const srt_path = path.join(configHTTP["--directory-prefix"], `video.${vtt_language}.srt`)

            const cmd = `ffmpeg -i "${vtt_path}" "${srt_path}"`
            const opt = {cwd: configHTTP["--directory-prefix"]}

            return spawn(cmd, opt)
          })
        }

        promises.push(promise)
      }

      await Promise.all(promises)
    }
  }

  const sanitize_title = (title) => title.replace(/[\\\/\*\?:"<>|]+/g, '')

  const start_downloadHLS = (configHLS) => {
    if (configHLS["--directory-prefix"]) {
      mkdirSync(configHLS["--directory-prefix"], {recursive: true})

      // files
      ;["master.m3u8","video.m3u8"].forEach(child => {
        let childpath = path.join(configHLS["--directory-prefix"], child)
        if (fs.existsSync(childpath))
          fs.unlinkSync(childpath)
      })
    }

    if (configHLS["--mp4"]) {
      mkdirSync(configHLS["--mp4"], {recursive: true})

      configHLS["--mp4"] = path.join(configHLS["--mp4"], 'video.mp4')

      if (fs.existsSync(configHLS["--mp4"]))
        fs.unlinkSync(configHLS["--mp4"])
    }

    // Promise
    return downloadHLS(configHLS)
  }

  const start_downloadHTTP = (configHTTP) => {
    if (configHTTP["--directory-prefix"])
      mkdirSync(configHTTP["--directory-prefix"], {recursive: true})

    // Promise
    return downloadHTTP(configHTTP)
  }

  // ---------------------------------------------------------------------------
  // returns a Promise that resolves after all downloads complete for all episodes in all seasons of a series

  const process_series_url = async function(url){
    const {video_urls} = await API.process_series_url(url)

    while(video_urls.length) {
      let url  = video_urls.shift()
      let type = 'video'
      await process_url(url, type)
    }
  }

  // ---------------------------------------------------------------------------
  // returns a Promise that resolves after all URLs in command-line have been processed

  const process_argv = async function(){
    if (argv_vals["--input-file"] && argv_vals["--input-file"].length) {
      while(argv_vals["--input-file"].length) {
        let url = argv_vals["--input-file"].shift()
        await process_url(url)
      }
    }
    else {
      let url = argv_vals["--url"]
      await process_url(url)
    }
  }

  return process_argv()
}

// -----------------------------------------------------------------------------

module.exports = {requestHTTP, downloadHTTP, downloadHLS, downloadTV: process_cli}
