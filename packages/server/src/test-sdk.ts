import { query } from '@anthropic-ai/claude-agent-sdk'

async function main() {
  console.log('Testing Claude Agent SDK...')

  for await (const message of query({ prompt: 'Say hello in exactly 5 words.' })) {
    if (message.type === 'assistant') {
      for (const block of message.message.content) {
        if (block.type === 'text') {
          console.log('Response:', block.text)
        }
      }
    }
  }

  console.log('Done.')
}

main().catch(console.error)
