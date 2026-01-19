# Gimbal + Claude Agents & Skills

> A living document capturing learnings, ideas, and experiments around building Gimbal as an Anthropic-native product.

**Decision:** Go all-in with Anthropic. No model neutrality. This unlocks deeper integration with Claude's agent capabilities.

---

## Current State

**What Gimbal uses today:**
- Claude Agent SDK with `@anthropic-ai/claude-code` (permissionMode: 'bypassPermissions')
- MCP servers: filesystem (scoped to project) + fetch (HTTP GET)
- Session resumption for multi-turn conversations
- Structured JSON responses via system prompt

**What we don't yet use:**
- Skills / lazy-loaded capabilities
- Multi-agent architectures
- Tool use beyond MCP
- Extended thinking
- Computer use

---

## Concepts to Understand

### 1. Claude Agent SDK

The SDK we already use. Key capabilities:
- **Sessions**: Multi-turn conversations with context preservation
- **Tools**: MCP servers, custom tools
- **Permissions**: Control what the agent can do
- **Streaming**: Real-time status and responses

**Questions to explore:**
- What's the full tool ecosystem available?
- How do we extend beyond MCP?
- What's the cost/latency profile at scale?

### 2. Skills (Lazy-Loaded Capabilities)

Skills are specialized instruction sets loaded on-demand. Rather than bloating the system prompt with everything Claude might need to do, skills are injected when relevant.

**How skills work (conceptual):**
- Base system prompt is lean
- When user intent matches a skill, its instructions are loaded
- Skill provides focused context, tools, and behavior for that task

**Potential Gimbal skills:**
- `research` - Web search, summarization, citation
- `code` - Write, run, debug code in project
- `document` - Create/edit structured documents
- `data` - Analyze CSVs, create visualizations
- `plan` - Break down complex tasks, create action plans

**Questions:**
- How do we detect which skill to load?
- Can skills compose (use multiple at once)?
- What's the UX for skill switching?

### 3. Multi-Agent Architectures

Instead of one agent doing everything, specialized agents collaborate.

**Patterns:**
- **Orchestrator + Workers**: Central agent delegates to specialists
- **Pipeline**: Agents in sequence (research → analyze → write)
- **Parallel**: Multiple agents work simultaneously, results merged

**Conclusion: Not pursuing for Gimbal.** ❌

After discussion, multi-agent is out of scope. Reasoning:

1. **Target user doesn't need it.** A small business owner or mechanic doesn't need orchestrated specialist agents. They need Claude to understand their workflow and execute it.

2. **Skills cover the capability gap.** Multi-agent solves "one agent can't do everything well" through complexity. Skills solve it through context-switching—same agent, different instructions loaded. Simpler, cheaper, same outcome.

3. **Complexity tax.** Multi-agent systems are hard to debug, hard to explain to users, and add failure modes. Gimbal's brand is simplicity.

4. **Economics don't work.** Each agent = separate API calls. Coordination adds more calls. A simple request becomes 3-5x the cost. At $10/mo target price, this doesn't pencil.

5. **The SDK + skills is the right level.** We get capability differentiation through skills without the architectural complexity of multi-agent.

**Exception noted:** Background/async processing for long-running tasks (research that takes minutes) could be valuable later. But that's job queuing, not multi-agent architecture—still one Claude task, just running asynchronously.

### 4. Extended Thinking

Claude can "think" before responding - useful for complex reasoning.

**When to use:**
- Planning multi-step tasks
- Analyzing complex problems
- Making decisions that need justification

**Questions:**
- How does this interact with streaming?
- Cost implications?
- Can users see the thinking?

### 5. Computer Use

Claude can control a computer (click, type, screenshot).

**Relevance to Gimbal:**
- Probably not core to Gimbal's value prop
- Could enable "show me how" demonstrations
- Interesting for automation workflows

---

## Ideas to Explore

### Idea 1: Skill-Based Project Types

When user creates a project, they pick a type (or Gimbal infers it):
- "Research Project" → loads research skill by default
- "Code Project" → loads code skill, different file handling
- "Writing Project" → loads document skill, focus on drafts

The base Gimbal experience stays simple, but capabilities deepen based on context.

### Idea 2: Implicit Skill Detection

Don't make users choose. Analyze their prompt and load relevant skills:
- "Find me information about X" → research skill
- "Write a Python script that..." → code skill
- "Help me outline a blog post" → document skill

Could use a fast classifier (haiku?) to route.

### Idea 3: Agent Workspace

The project folder isn't just storage—it's an agent's workspace:
- `_agents/` folder with agent state
- Agents can leave notes for themselves across sessions
- Project becomes a persistent context for the AI

### Idea 4: Background Agents

Long-running tasks don't block the chat:
- "Research competitors and summarize" → spawns background agent
- User continues chatting
- Agent reports back when done (notification? appears in chat?)

### Idea 5: Agent Transparency

Show users what's happening:
- Which skill is active
- What tools are being used
- Why the agent made certain choices

Builds trust, especially for non-technical users.

### Idea 6: Skill Builder Skill ⭐

**The meta-skill**: A skill that helps users create their own skills.

**Why this is interesting:**
- Democratizes customization for non-technical users
- Claude is good at understanding intent and generating instructions
- Aligns with "project is a folder"—skills are just files
- Recursive leverage: one skill unlocks infinite personalization

**What is a skill, concretely?**
A skill is a specialized instruction set that gets loaded when relevant. It contains:
- **Trigger conditions**: When should this skill activate?
- **Instructions**: How should Claude behave?
- **Context**: What files/data should Claude reference?
- **Constraints**: What should Claude avoid?
- **Examples**: Sample interactions (few-shot)

**How skill-builder would work:**

1. User says: "I want to create a skill for analyzing my weekly sales reports"

2. Skill-builder activates and interviews the user:
   - "What files should I look at for sales data?"
   - "What kind of analysis do you typically want?"
   - "Any specific metrics or KPIs you track?"
   - "Should I compare to previous periods?"

3. Skill-builder generates a skill file (e.g., `_skills/sales-analysis.md`):
   ```markdown
   # Sales Analysis Skill

   ## Trigger
   When user asks about sales, revenue, weekly numbers, or performance.

   ## Context Files
   - reports/weekly-sales.csv (primary data)
   - reports/targets.csv (comparison benchmarks)

   ## Instructions
   - Always calculate week-over-week change
   - Highlight items below target in the summary
   - Use currency formatting for all dollar amounts
   - Compare to same week last year if data available

   ## Response Format
   Start with a one-line summary, then details.
   ```

4. Next time user asks about sales, Gimbal loads this skill automatically.

**User stories this enables:**

- **Bookkeeper**: "When I ask about expenses, categorize using my chart of accounts and flag anything over $500"
- **Content creator**: "When I'm drafting posts, use my brand voice guide and always suggest 3 headline options"
- **Researcher**: "When analyzing papers, extract methodology, sample size, and key findings into a structured format"
- **Small business owner**: "When I ask about inventory, check my stock levels and warn me about items below reorder point"

**What makes this powerful for Gimbal's target market:**

SMBs and individuals have specific, repeated workflows. They're not going to write code or craft prompts. But they *can* have a conversation about what they need. Skill-builder translates that conversation into persistent, reusable capability.

**Open questions:**
- Where do skills live? Project-level? User-level? Both?
- How does Gimbal detect which skill to load? (Classifier? Keywords? User invokes explicitly?)
- Can skills conflict? How do we handle multiple applicable skills?
- How do users edit/delete/manage their skills?
- What's the skill file format? Markdown? JSON? YAML?

---

## Open Questions

1. **Pricing model**: If we use multiple agents or extended thinking, costs multiply. How does this affect Gimbal's $10/mo target?

2. **Latency**: Multi-agent adds round trips. How do we keep the experience snappy?

3. **Complexity budget**: Gimbal's value is simplicity. How much agent sophistication can we add before we lose that?

4. **Anthropic roadmap**: What capabilities are coming that we should design for?

5. **Differentiation**: If anyone can build on Claude, what makes Gimbal special? (Answer: UX, defaults, the project metaphor—but we should keep asking this.)

---

## Experiments to Run

- [ ] Build a simple skill loader prototype
- [ ] Define skill file format (markdown with conventions?)
- [ ] Prototype skill-builder conversation flow
- [ ] Measure cost/latency for skill-loading approach
- [ ] User test: do people understand/value "skills"?
- [ ] Prototype background task queue for long-running operations

---

## Learnings Log

*As we discover things, capture them here with dates.*

### 2025-01-19

- Started this document
- Current Gimbal uses Agent SDK with MCP, but hasn't explored skills or multi-agent
- Key tension: simplicity (Gimbal's brand) vs capability (agent sophistication)

**Session 2 - Skills deep-dive:**

- **Multi-agent deprioritized** for now—complexity/cost vs benefit doesn't seem worth it yet
- **Skills are more interesting** as a near-term opportunity
- **Skill-builder skill** (meta-skill): Claude helps users create their own skills through conversation. Powerful because it democratizes customization without requiring technical knowledge.
- **Key insight**: Skills solve the "don't repeat yourself" problem. Users find themselves explaining the same workflow to Claude repeatedly → "New Skill" button → describe once, done forever.
- **Non-technical user framing**: The auto mechanic example. "Order a rear axle for a 1971 Bronco from the warehouse means..." User doesn't need to understand prompts or AI—just describe what they keep doing.
- **Shareable skills ecosystem**: If skills are portable documents, users can share them. "Here's my parts-ordering skill, works great for classic Fords." Community-driven value creation. Moderation/security concerns exist but are bounded (skills are instructions, not executable code).
- **First-party skill library**: Standard set of curated skills that ship with Gimbal or can be imported.
- **Skills are additive, not essential**: Gimbal's core value prop (project workspace, no API key, simple UX) already differentiates from Claude Projects. Skills are a growth/power-user vector, not the foundation.
- **Skill storage**: Likely in project folder (`_skills/`) to align with "project is a folder" philosophy. Makes skills visible, editable, portable.
- **Skill activation**: Simple UI affordance—user picks active skill from dropdown. Avoids complexity of auto-detection while keeping UX simple.

**Economic framing emerging:**
- Every agent feature has a cost profile (API calls, tokens, infra)
- Need to catalog cost drivers before speccing features
- Goal: understand operational costs to validate Gimbal's economic viability

**Decision: Multi-agent is out of scope.**
- Complexity, cost, and debugging overhead don't justify the benefits for Gimbal's target user
- Skills provide capability differentiation at a fraction of the complexity
- The Agent SDK + skills is the right architectural level for Gimbal
- Background/async tasks (not multi-agent) may be worth exploring later for long-running operations

---

## Resources

- [Claude Agent SDK docs](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/sdk)
- [MCP specification](https://modelcontextprotocol.io/)
- Anthropic cookbook examples
- (add more as we find them)
