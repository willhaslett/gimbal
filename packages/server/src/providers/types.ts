/**
 * AI Provider Abstraction
 *
 * Minimal interface to support different AI backends.
 * Currently Claude-only, designed for future extensibility.
 */

export interface QueryParams {
  prompt: string
  projectPath: string
  systemPrompt: string
  sessionId?: string
}

export interface QueryResult {
  messages: unknown[]
  sessionId?: string
}

export interface AIProvider {
  readonly id: string
  readonly name: string

  /**
   * Execute a query and stream results
   * @param params Query parameters
   * @param onMessage Callback for each message (for streaming status updates)
   * @returns Final result with all messages and session ID
   */
  query(
    params: QueryParams,
    onMessage?: (message: unknown) => void
  ): Promise<QueryResult>
}

/**
 * Provider configuration - extensible for different auth modes
 */
export interface ProviderConfig {
  type: 'gimbal-provided' | 'byom-api-key' | 'byom-subscription'
  apiKey?: string
  // Future: subscription auth tokens, etc.
}
