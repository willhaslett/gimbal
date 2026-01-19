# Gimbal Pricing Models

> Exploring pricing strategies that balance subscription revenue stability with "pay for what you use" fairness.

---

## The Tension

**Subscriptions are better for business:**
- Predictable revenue
- Higher customer lifetime value
- Psychological commitment (lower churn)
- Easier financial planning

**But users hate paying for nothing:**
- Resentment builds during low-use months
- Feels unfair, especially for sporadic users
- Can prevent initial signup ("what if I don't use it?")

**Gimbal-specific constraint:** Our COGS scales with usage (Claude API tokens). "Unlimited" subscriptions are dangerous—one power user can blow margins. Any subscription needs implicit or explicit caps.

---

## Pricing Model Options

### Option 1: Credits-Based Subscription

Your subscription fee *becomes* credits. Never "wasted" money.

| Tier | Price | Credits | Rollover |
|------|-------|---------|----------|
| Free | $0 | 20/mo | No |
| Pro | $10/mo | 150 credits | Up to 300 max |

**Pros:**
- Psychologically fair—you bought something tangible
- Rollover reduces "use it or lose it" pressure
- Natural usage cap protects margins

**Cons:**
- Credits are an abstraction users must learn
- Rollover cap adds complexity

### Option 2: Subscription as Discount Tier

Everyone can use PAYG. Subscription unlocks better rates.

| Mode | Rate | Included |
|------|------|----------|
| Pay-as-you-go | $0.15/query | Nothing |
| Pro ($10/mo) | $0.05/query | 100 queries |

**Pros:**
- Clear value prop: "subscribe and save"
- PAYG exists for commitment-phobes
- Heavy users obviously benefit from Pro

**Cons:**
- Two mental models to explain
- PAYG users might feel like second-class citizens

### Option 3: Pausable Subscription

Standard subscription, but pause anytime (like Spotify).

| Tier | Price | Queries | Pause |
|------|-------|---------|-------|
| Free | $0 | 20/mo | N/A |
| Pro | $10/mo | 150/mo | Unlimited |

**Pros:**
- Simple mental model (it's just a subscription)
- Pause removes "paying for nothing" guilt
- Users feel in control

**Cons:**
- Revenue less predictable (users pause during slow months)
- Reactivation friction might lose users

### Option 4: Tiered with PAYG Escape Hatch

The "something for everyone" approach.

| Tier | Price | What you get |
|------|-------|--------------|
| Free | $0 | 20 queries/mo |
| Pay-as-you-go | ~$0.10/query | No subscription, no commitment |
| Pro | $10/mo | 150 queries included, $0.05/query overage |

**Pros:**
- Free tier proves value
- PAYG for "I hate subscriptions" crowd
- Pro is clearly best value for regular users (>50 queries/mo)
- Overage model means Pro users never hit a wall

**Cons:**
- Three options might be confusing
- Need to price PAYG high enough that Pro is obviously better

---

## Key Questions to Resolve

1. **What does a query actually cost us?**
   - Average tokens per query (input + output)
   - Claude API pricing at our expected volume
   - This determines minimum viable price points

2. **What's a "query"?**
   - Single user message + Claude response?
   - Or count tool calls separately?
   - Skills might use more tokens—same price?

3. **Usage distribution assumptions:**
   - What % of users are light/medium/heavy?
   - What's the 95th percentile usage we need to sustain?

4. **Free tier economics:**
   - 20 queries/mo × cost per query = acquisition cost per free user
   - What conversion rate do we need to break even?

---

## Current Leaning

**Option 4 (Tiered + PAYG)** feels right for Gimbal's target market:

- **Free tier** is essential for "curious but uncommitted" SMB users
- **PAYG** exists for the principled "I won't pay for nothing" crowd
- **Pro subscription** is the obvious choice for anyone using it regularly
- **Overage pricing** means power users don't hit walls, we capture upside

Next step: Model actual costs once we know query token economics.

---

## Related

- [Agents and Skills](./agents-and-skills.md) — Skills may affect token usage
- [Architecture Brainstorm](./architecture-brainstorm.md) — Infrastructure costs factor in

