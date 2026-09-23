#!/usr/bin/env node
// Reusable Playwright driver — see ../SKILL.md for usage. Bundled so the
// console/pageerror-capture boilerplate isn't rewritten from scratch every
// debugging session.
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'

function parseArgs(argv) {
  const args = { initCode: [], click: [], waitMs: 1500, screenshot: 'repro-screenshot.png' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--target') args.target = argv[++i]
    else if (a === '--crashtest') args.crashtest = true
    else if (a === '--init-code') args.initCode.push(argv[++i])
    else if (a === '--click') args.click.push(argv[++i])
    else if (a === '--wait-ms') args.waitMs = Number(argv[++i])
    else if (a === '--screenshot') args.screenshot = argv[++i]
    else throw new Error(`Unknown argument: ${a}`)
  }
  if (!args.target) throw new Error('--target is required')
  return args
}

function resolveUrl(target, crashtest) {
  let url = /^https?:\/\//.test(target) ? target : pathToFileURL(target).href
  if (crashtest) url += (url.includes('?') ? '&' : '?') + 'crashtest=1'
  return url
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const url = resolveUrl(args.target, args.crashtest)

  const browser = await chromium.launch()
  const page = await browser.newPage()

  const consoleLines = []
  const pageErrors = []

  // Registered BEFORE navigating — errors during initial load are otherwise
  // missed (this is what made a real crypto.randomUUID bug hard to see at first).
  page.on('console', (msg) => consoleLines.push(`[console:${msg.type()}] ${msg.text()}`))
  page.on('pageerror', (err) => pageErrors.push(`[pageerror] ${err.message}\n${err.stack ?? ''}`))

  for (const code of args.initCode) await page.addInitScript(code)

  await page.goto(url)
  await page.waitForTimeout(500)

  for (const selector of args.click) {
    await page.click(selector)
    await page.waitForTimeout(300)
  }

  await page.waitForTimeout(args.waitMs)
  await page.screenshot({ path: args.screenshot, fullPage: true })

  console.log('--- console ---')
  console.log(consoleLines.join('\n') || '(none)')
  console.log('--- pageerror ---')
  console.log(pageErrors.join('\n') || '(none)')
  console.log(`--- screenshot: ${args.screenshot} ---`)

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
