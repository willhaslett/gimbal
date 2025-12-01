/**
 * AI Provider Registry
 *
 * Central place to access providers. Currently Claude-only.
 * Future: register multiple providers, select by user preference.
 */

export * from './types.js'
export { ClaudeProvider, claudeProvider } from './claude.js'

import { claudeProvider } from './claude.js'
import type { AIProvider } from './types.js'

// For now, just return Claude. Later this could be configurable.
export function getProvider(_providerId?: string): AIProvider {
  // TODO: support multiple providers, lookup by ID
  return claudeProvider
}
