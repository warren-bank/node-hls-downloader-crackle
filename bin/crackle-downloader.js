#! /usr/bin/env node

const argv_vals    = require('./crackle-downloader/process_argv')
const {downloadTV} = require('../lib/process_cli')

downloadTV(argv_vals)
.catch(err => {
  console.log(err)
})
.then(() => {
  process.exit(0)
})
