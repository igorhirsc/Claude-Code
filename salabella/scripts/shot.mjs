#!/usr/bin/env node
// Screenshot helper for build + critic agents.
// Usage: node scripts/shot.mjs <url-path> <out.png> [width] [height] [--full] [--selector="#id"]
// --selector scrolls that element into view and shoots a normal (non-full)
// frame around it — use it to capture one section of the long home page.
import { chromium } from 'playwright'

const [, , urlPath = '/', out = '/tmp/shot.png', widthArg, heightArg, ...rest] = process.argv
const width = Number(widthArg || 1440)
const height = Number(heightArg || 900)
const fullPage = rest.includes('--full')
const selectorArg = rest.find((a) => a.startsWith('--selector='))
const selector = selectorArg ? selectorArg.slice('--selector='.length) : null
const base = process.env.SHOT_BASE_URL || 'http://localhost:5173'
const url = urlPath.startsWith('http') ? urlPath : `${base}${urlPath}`

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
page.setDefaultTimeout(90000)
const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})
page.on('pageerror', (err) => errors.push(String(err)))

await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
// let webfonts, shader compiles and the preloader settle
await page.waitForTimeout(3500)

// ScrollTrigger reveals key off real scroll events — a plain fullPage
// screenshot never scrolls, so those sections would capture blank. Walk
// down first so every trigger fires.
const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight)
for (let y = 0; y < scrollHeight; y += Math.round(height * 0.8)) {
  await page.evaluate((pos) => window.scrollTo({ top: pos, behavior: 'instant' }), y)
  await page.waitForTimeout(200)
}

if (selector) {
  await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'start', behavior: 'instant' }), selector)
  await page.waitForTimeout(900)
  await page.screenshot({ path: out, fullPage: false })
} else {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(fullPage ? 400 : 700)
  await page.screenshot({ path: out, fullPage })
}
await browser.close()

console.log(JSON.stringify({ url, out, width, height, fullPage, selector, consoleErrors: errors }, null, 2))
process.exit(errors.length ? 2 : 0)
