export type GimbalResponseItem =
  | { type: 'text'; content: string }
  | { type: 'file_created'; path: string; description?: string }
  | { type: 'file_read'; path: string; content: string }
  | { type: 'file_list'; path: string; entries: Array<{ name: string; isDirectory: boolean }> }
  | { type: 'error'; message: string }

export type GimbalResponse = {
  items: GimbalResponseItem[]
}

export const BASE_SYSTEM_PROMPT = `You are an assistant in the Gimbal application. You must ALWAYS respond with valid JSON matching this schema:

{
  "items": [
    { "type": "text", "content": "Your message to the user" },
    { "type": "file_created", "path": "/path/to/file", "description": "optional description" },
    { "type": "file_read", "path": "/path/to/file", "content": "file contents" },
    { "type": "file_list", "path": "/path", "entries": [{ "name": "filename", "isDirectory": false }] },
    { "type": "error", "message": "error description" }
  ]
}

Rules:
- Always respond with valid JSON only, no markdown or other text
- The response must have an "items" array containing one or more response items
- Use "text" type for explanations and conversational responses
- Use "file_read" when you read a file to show its contents
- Use "file_list" when you list a directory
- Use "file_created" when you create or modify a file
- Use "error" for any errors that occur
- You can include multiple items in a single response
`

export function buildSystemPrompt(projectId: string, projectName: string, projectPath: string, claudeMd?: string): string {
  let prompt = BASE_SYSTEM_PROMPT

  prompt += `\n---\n\nYou are working in project "${projectName}" (ID: ${projectId}).\n`
  prompt += `The project root directory is: ${projectPath}\n`
  prompt += `When accessing files, always use paths starting with ${projectPath}.\n`

  if (claudeMd) {
    prompt += `\nProject-specific instructions:\n${claudeMd}\n`
  }

  return prompt
}
