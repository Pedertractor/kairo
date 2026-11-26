import type { AtRule, Plugin as PostcssPlugin } from 'postcss'
import postcssPresetEnv from 'postcss-preset-env'

/**
 * Shop-floor Android tablets run Chrome 101, which supports `@layer`, `:is()`
 * and `:where()` but not the rest of what Tailwind v4 emits: `oklch()`,
 * `color-mix()`, range media queries (`width >= 40rem`) and native nesting.
 * This lowers the built CSS for them while modern browsers render the same.
 */
export const LEGACY_BROWSERS = [
  'chrome >= 101',
  'and_chr >= 101',
  'android >= 101',
  'samsung >= 18',
  'safari >= 15.4',
  'ios_saf >= 15.4',
  'firefox >= 97',
]

const RGB_VALUE =
  /^rgba?\(\s*(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i
const VAR_ALIAS = /^var\(\s*(--[\w-]+)\s*\)$/
const COLOR_MIX_VAR =
  /color-mix\(\s*in\s+(?:oklab|srgb|oklch|lab)\s*,\s*var\(\s*(--[\w-]+)\s*\)\s+([\d.]+)%\s*,\s*transparent\s*\)/gi

/**
 * Tailwind's fallback for `bg-primary/10` without color-mix support is the
 * fully opaque color, which hides text sitting on top of it (e.g. the active
 * timer). Expose every color custom property as an `r, g, b` channel list and
 * emit `rgba(var(--x-rgb), alpha)` fallbacks next to each color-mix rule.
 */
function colorMixFallback(): PostcssPlugin {
  return {
    postcssPlugin: 'kairo-color-mix-fallback',
    OnceExit(root) {
      const channelVars = new Set<string>()

      root.walkDecls(/^--/, (decl) => {
        if (decl.prop.endsWith('-rgb')) return
        const value = decl.value.trim()
        const rgb = value.match(RGB_VALUE)
        if (rgb) {
          decl.cloneAfter({
            prop: `${decl.prop}-rgb`,
            value: `${rgb[1]}, ${rgb[2]}, ${rgb[3]}`,
          })
          channelVars.add(decl.prop)
          return
        }
        const alias = value.match(VAR_ALIAS)
        if (alias) {
          decl.cloneAfter({ prop: `${decl.prop}-rgb`, value: `var(${alias[1]}-rgb)` })
          channelVars.add(decl.prop)
        }
      })

      const supportsRules: AtRule[] = []
      root.walkAtRules('supports', (atRule) => {
        if (/color-mix/i.test(atRule.params)) supportsRules.push(atRule)
      })

      for (const atRule of supportsRules) {
        const fallback = atRule.clone()
        let kept = 0

        fallback.walkDecls((decl) => {
          if (!/color-mix/i.test(decl.value)) {
            decl.remove()
            return
          }
          let convertible = true
          const value = decl.value.replace(COLOR_MIX_VAR, (_match, name: string, pct: string) => {
            if (!channelVars.has(name)) convertible = false
            return `rgba(var(${name}-rgb), ${Number(pct) / 100})`
          })
          if (!convertible || /color-mix/i.test(value)) {
            decl.remove()
            return
          }
          decl.value = value
          kept += 1
        })

        if (kept === 0) continue

        // Drop rules/at-rules left empty after removing declarations.
        fallback.walk((node) => {
          if ((node.type === 'rule' || node.type === 'atrule') && node.nodes?.length === 0) {
            node.remove()
          }
        })
        atRule.before(fallback.nodes ?? [])
      }
    },
  }
}

const TW_TRANSLATE = /^var\(--tw-translate-x\)\s+var\(--tw-translate-y\)$/
const TW_SCALE = /^var\(--tw-scale-x\)\s+var\(--tw-scale-y\)$/
const ANGLE = /^-?\d*\.?\d+(deg|turn|rad|grad)$/
const LEGACY_TRANSFORM =
  'translate(var(--tw-translate-x, 0), var(--tw-translate-y, 0)) ' +
  'rotate(var(--kairo-legacy-rotate, 0deg)) ' +
  'scale(var(--tw-scale-x, 1), var(--tw-scale-y, 1))'

/**
 * Tailwind v4 moves elements with the individual `translate`, `rotate` and
 * `scale` properties (Chrome 104+). Chrome 101 ignores them, so centered
 * dialogs (`-translate-x-1/2 -translate-y-1/2`) end up off-center. Each such
 * rule gets an equivalent `transform` inside `@supports not (translate: 0)`,
 * which browsers that support `translate` never apply.
 */
function transformFallback(): PostcssPlugin {
  return {
    postcssPlugin: 'kairo-transform-fallback',
    OnceExit(root, { AtRule }) {
      let usesRotate = false

      root.walkRules((rule) => {
        const parent = rule.parent
        if (parent?.type === 'atrule' && /keyframes$/i.test((parent as AtRule).name)) return

        const decls = (rule.nodes ?? []).filter(
          (node) => node.type === 'decl' && /^(translate|rotate|scale)$/.test(node.prop),
        )
        if (decls.length === 0) return

        const fallback = rule.clone({ nodes: [] })
        for (const decl of decls) {
          if (decl.type !== 'decl') continue
          const value = decl.value.trim()
          if (decl.prop === 'translate' && TW_TRANSLATE.test(value)) continue
          if (decl.prop === 'scale' && TW_SCALE.test(value)) continue
          if (decl.prop === 'rotate' && ANGLE.test(value)) {
            fallback.append({ prop: '--kairo-legacy-rotate', value })
            usesRotate = true
            continue
          }
          return // Unknown shape: leave this rule alone rather than guess.
        }
        fallback.append({ prop: 'transform', value: LEGACY_TRANSFORM })

        const supports = new AtRule({ name: 'supports', params: 'not (translate: 0)' })
        supports.append(fallback)
        rule.after(supports)
      })

      if (usesRotate) {
        // Not inherited, so a rotated parent doesn't rotate its children twice.
        // Insert after the leading license comment so the minifier keeps it.
        const first = root.first
        const insert = first?.type === 'comment' ? first.after.bind(first) : root.prepend.bind(root)
        insert(
          new AtRule({
            name: 'property',
            params: '--kairo-legacy-rotate',
            nodes: [],
          }).append(
            { prop: 'syntax', value: '"*"' },
            { prop: 'inherits', value: 'false' },
            { prop: 'initial-value', value: '0deg' },
          ),
        )
      }
    },
  }
}

const SMALL_VIEWPORT_UNIT = /(\d*\.?\d+)(svh|dvh|lvh|svw|dvw|lvw)\b/g

/**
 * `h-svh`/`min-h-svh` (sidebar layout) need Chrome 108. Put a `vh`/`vw`
 * declaration before each one: browsers that know `svh` still use it (it comes
 * last), older ones drop it and keep the `vh` value.
 */
function viewportUnitFallback(): PostcssPlugin {
  return {
    postcssPlugin: 'kairo-viewport-unit-fallback',
    Declaration(decl) {
      if (decl.prop.startsWith('--') || !SMALL_VIEWPORT_UNIT.test(decl.value)) return
      SMALL_VIEWPORT_UNIT.lastIndex = 0
      const prev = decl.prev()
      const legacyValue = decl.value.replace(SMALL_VIEWPORT_UNIT, (_m, n: string, unit: string) =>
        `${n}${unit.slice(1)}`,
      )
      if (prev?.type === 'decl' && prev.prop === decl.prop && prev.value === legacyValue) return
      decl.cloneBefore({ value: legacyValue })
    },
  }
}

/** PostCSS plugins applied to production CSS (see vite.config.ts). */
export function legacyCssPlugins() {
  return [
    postcssPresetEnv({
      browsers: LEGACY_BROWSERS,
      stage: 0,
      // Custom properties can't fall back (the last declaration always wins),
      // so modern colors must be replaced rather than preserved alongside.
      preserve: false,
      features: {
        // Every target supports cascade layers natively; keep them as-is.
        'cascade-layers': false,
        'oklab-function': { preserve: false },
        'color-mix': { preserve: false },
      },
    }),
    colorMixFallback(),
    transformFallback(),
    viewportUnitFallback(),
  ]
}
