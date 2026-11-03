#!/usr/bin/env node
// Seam check for the Poltrona Aurora (home #configurador).
//
// Usage (dev server running): node scripts/arm-seam-check.mjs [outDir]
//
// For each camera view it saves a beauty shot AND a flat "mask" render
// (upholstery / legs / background as three flat colours, no shadows or
// callouts) and analyses the mask: any background-coloured region fully
// enclosed by the chair's silhouette is light seen THROUGH the chair — a
// gap between arm and seat, or seat and back. Every view must report 0.
// It also reports the upholstery mesh's connected components (must be 1:
// one continuous volume, no floating arm or cushion).
// Relies on the dev-only window.__aurora hook in ConfiguratorScene.tsx.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const outDir = process.argv[2] || '/tmp/seams'
mkdirSync(outDir, { recursive: true })
const base = process.env.SHOT_BASE_URL || 'http://localhost:5173'

const VIEWS = [
  { name: 'default', az: 0.62, polar: 1.2 },
  { name: 'front-34-left', az: -0.75, polar: 1.15 },
  { name: 'front-low', az: 0.0, polar: 1.42 },
  { name: 'side', az: Math.PI / 2, polar: 1.3 },
  { name: 'near-rear', az: 2.45, polar: 1.1 },
  { name: 'top-down', az: 0.35, polar: 0.6 },
]

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
page.setDefaultTimeout(120000)
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 90000 })
await page.waitForTimeout(2500)
await page.evaluate(() => document.querySelector('#configurador')?.scrollIntoView({ block: 'start', behavior: 'instant' }))
await page.waitForFunction(() => !!window.__aurora && !!document.querySelector('#configurador [data-ready]'), null, { timeout: 120000 })
await page.waitForTimeout(1200)

// Clip shots to the canvas rect (element screenshots wait on "stable",
// which a live WebGL canvas under smooth scroll never quite is).
const clip = await page.evaluate(() => {
  const r = document.querySelector('#configurador canvas').getBoundingClientRect()
  return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) }
})
const canvas = { screenshot: (o) => page.screenshot({ ...o, clip }) }
const components = await page.evaluate(() => window.__aurora.meshComponents())

/** Classify pixels and count background regions not connected to the border. */
async function analyse(png) {
  return page.evaluate(async (b64) => {
    const img = new Image()
    img.src = 'data:image/png;base64,' + b64
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const { data, width: W, height: H } = ctx.getImageData(0, 0, c.width, c.height)
    // Background is the lightest, least saturated class; anything clearly
    // darker or more chromatic belongs to the chair.
    const bg = new Uint8Array(W * H)
    for (let i = 0; i < W * H; i++) {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      bg[i] = max > 150 && max - min < 40 ? 1 : 0
    }
    // flood fill background from the border
    const seen = new Uint8Array(W * H)
    const stack = []
    const push = (i) => {
      if (bg[i] && !seen[i]) {
        seen[i] = 1
        stack.push(i)
      }
    }
    for (let x = 0; x < W; x++) push(x), push((H - 1) * W + x)
    for (let y = 0; y < H; y++) push(y * W), push(y * W + W - 1)
    while (stack.length) {
      const i = stack.pop()
      const x = i % W, y = (i / W) | 0
      if (x > 0) push(i - 1)
      if (x < W - 1) push(i + 1)
      if (y > 0) push(i - W)
      if (y < H - 1) push(i + W)
    }
    // enclosed background = background pixels the border fill never reached
    let holes = 0, chair = 0
    const holePx = []
    for (let i = 0; i < W * H; i++) {
      if (!bg[i]) chair++
      else if (!seen[i]) {
        holes++
        if (holePx.length < 10) holePx.push([i % W, (i / W) | 0])
      }
    }
    return { holes, chairPx: chair, sample: holePx }
  }, png.toString('base64'))
}

const results = []
for (const v of VIEWS) {
  await page.evaluate(({ az, polar }) => window.__aurora.setView(az, polar), v)
  await page.waitForTimeout(500)
  await canvas.screenshot({ path: `${outDir}/${v.name}.png` })
  await page.evaluate(() => {
    window.__aurora.setMask(true)
    const st = document.createElement('style')
    st.id = 'seam-mask'
    st.textContent = '#configurador [data-stage-overlay], #configurador [data-callout-pill] { display: none !important }'
    document.head.append(st)
  })
  await page.waitForTimeout(400)
  const mask = await canvas.screenshot({ path: `${outDir}/${v.name}-mask.png` })
  await page.evaluate(() => {
    window.__aurora.setMask(false)
    document.getElementById('seam-mask')?.remove()
  })
  const a = await analyse(mask)
  results.push({ view: v.name, enclosedBackgroundPx: a.holes, chairPx: a.chairPx, sample: a.sample })
}
await browser.close()

const pass = components === 1 && results.every((r) => r.enclosedBackgroundPx === 0) && errors.length === 0
console.log(JSON.stringify({ outDir, upholsteryComponents: components, results, consoleErrors: errors, pass }, null, 2))
process.exit(pass ? 0 : 1)
