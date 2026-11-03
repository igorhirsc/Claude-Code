# SALABELLA — AAA visual quality rubric

The benchmark is top-tier premium furniture e-commerce (internally: BOOBAM,
boobam.com.br). This sandbox cannot reach that site, so grade against this
rubric at the severity you'd use with the live site open in the next tab.

Every section, every review round, is scored on all eight axes.
**Any single FAIL fails the section.** "Fine for a first pass" is not the
bar; "I'd be embarrassed to ship anything worse" is.

## 1. Typography
- One dominant display statement per section; everything else subordinate.
- Fraunces (`font-display`) for brand moments; Inter for UI/body/labels.
- Body measure 45–75 characters per line (e.g. `max-w-[52ch]`–`[60ch]`).
- No lorem ipsum, no placeholder brackets, no orphaned last words in headlines.

## 2. Color & material
- Every color is a token from `src/styles/tokens.css` or `palette` in
  `src/three/common/materials.ts`. No hardcoded hex in components or shaders.
- 3D materials look physical: fabric sheen, wood clearcoat, real metal.
- No blown pure-white highlights, no crushed pure-black voids.

## 3. Composition & layout
- `max-w-[1440px]` + `px-6 md:px-10` rhythm, same as Header/Footer.
- Clear focal point per section; generous whitespace.
- Works at 390, 768 (exactly — `md:` boundary), 1440, 1920. No overlap/overflow.
- Layout math in JS must agree with Tailwind breakpoints (use
  `useIsSmallViewport`, which flips at 767.98px in lockstep with `md:`).

## 4. Lighting & 3D realism
- Grounded: every object has a shadow that actually touches it. If you fake
  a shadow, scale its position by the same transform as the geometry, and
  check it's visible to *this* camera (a flat XZ plane is invisible to an
  orthographic top-down camera).
- Highlights come from the shared rig in `Lighting.tsx` (use the exported
  `STUDIO_*_POSITION` constants if hand-writing a shader).
- No visible seams where primitives meet. Upholstery reads as one soft
  volume: overlap pieces generously against their *rounded* surfaces, not
  their nominal bounding boxes, and verify from 3+ camera angles.
- Animated objects must look right at every frame of their motion, not just
  the one you screenshot (e.g. a rotating torus must never point its bore at
  the camera).

## 5. Motion & interaction
- Eased, staggered GSAP choreography; never linear, never all-at-once.
- Hover/focus feedback within ~150–250ms.
- Scroll reveals trigger on real viewport entry (ScrollTrigger), with a
  fallback so content can never get stuck at opacity 0.
- Every interaction has a keyboard path (a real `<button>`), not pointer-only.
- Physics/impulses are derived from real mass/inertia (`rb.mass()`,
  `rb.principalInertia()`), and verified visually: the motion must be
  clearly visible but stay on screen.
- One cursor system only: never write `document.body.style.cursor` from a 3D
  component; use the shared cursor API.
- Respect `prefers-reduced-motion`.

## 6. Craft & detail
- Zero console errors. Every input has a real accessible name. Text contrast
  ≥ 4.5:1 (WCAG AA) — compute it, don't eyeball it.
- Links promise what they deliver (a "Sofás" link must land on a filtered view).
- Shared constants (contact data, etc.) imported from `src/data/`, never duplicated.

## 7. Brand cohesion
- Same spacing, tokens, type pairing, easing as the rest of the site.
- pt-BR copy: warm, confident, editorial, specific — never corporate filler.

## 8. Performance
- All 3D via `CanvasShell` (capped DPR). Mount near the viewport and switch to
  `frameloop="demand"` when off-screen (`useSectionVisibility` in
  `src/hooks/useMediaFlags.ts` gives both signals).
- One WebGL context per section at most; share a canvas for repeated icons.

## Hard technical constraints (immediate fail)
- **No runtime network requests**: no CDN fonts/textures/HDRIs, no drei
  `<Environment preset>`, no remote images, no map iframes. Procedural only.
- Use the shared `CanvasShell`, `StudioLighting`, materials, `PostFX`.

## Checking your work
Dev server: `http://localhost:5173`. From `salabella/`:
```
node scripts/shot.mjs /  /tmp/home.png 1440 900 --selector="#hero"
node scripts/shot.mjs /  /tmp/home-m.png 390 844 --full
```
Read every PNG back before claiming something is done. Under load a shot can
take 60–120s; retry rather than assume failure.
