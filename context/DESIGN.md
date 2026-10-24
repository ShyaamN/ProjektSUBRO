# ProjektSUBRO — Visual and interaction design direction

**Document type:** Design brief and references, not reusable front-end code or a starter template.  
**Design ambition:** A sophisticated **financial risk terminal** meets an **autonomous operations control room**. Professional enough for YC founders; legible enough that someone new to US healthcare understands it in 20 seconds.

## One visual principle

**Every glow and chart must correspond to a real product state.** A dark Bloomberg-inspired dashboard is appropriate, but avoid a sea of meaningless numbers, fake progress, giant arbitrary percentages or endless AI chat bubbles.

The judges should always see:

1. **What is the claim worth if successfully recovered?**
2. **What is ProjektSUBRO offering now, and why?**
3. **What is the agent doing, what evidence supports it, and when will it stop?**

## Reference mood board (inspiration links only)

Review the current design of these products *for patterns*, not as a code or branding source:

- Bloomberg Terminal, as a conceptual reference for data density, multi-column data tables and precision. Search/brand reference: https://www.bloomberg.com/professional/products/bloomberg-terminal/
- Linear, for compact detail views, polished dark surfaces, calm hierarchy: https://linear.app/
- Stripe Dashboard, for financial clarity, ledger/tracing patterns and status explanations: https://stripe.com/
- Vercel, for clean developer-tool typography and restrained presentation: https://vercel.com/

No copyrighted image, stylesheet, UI kit or repository code should be copied into the hackathon project. Links are visual research references only.

## Brand

- **Working name:** ProjektSUBRO.
- **Short descriptor:** Autonomous claims underwriting & recovery.
- **Tone:** Confident, precise, analytical. Minimal jargon in primary interface. Define financial terminology in tooltips or side explanations.
- **Visual character:** Quantitative, institutional, calm, not casino trading or an insurer intimidation game.
- **Logo direction:** Simple geometric S or layered claim-to-capital symbol. Avoid medical caduceus/Red Cross lookalikes and copied fintech marks.

## Color and typography intent

- Dark charcoal / ink canvas, not absolute black everywhere.
- Slightly lighter neutral surfaces for tables and drawers.
- Restrained teal/cyan accent for selected controls and active processes.
- Green means *eligible / recovered*; amber means *needs evidence / human review*; red means *declined / stopped / negative economics*. Always pair status colors with words/icons.
- Monospace or tabular numerals for currency, probabilities and ID columns; modern sans-serif for copy.
- Large monetary figures get visual emphasis, but annotate with units, provenance and whether **expected** or **realized**.
- Maintain strong contrast and avoid tiny text during projected demos.

## App shell

Desktop target roughly 1440x900 projected; work at 1280x720. Responsive mobile views are beneficial but desktop live demo is the priority.

**Top bar:** ProjektSUBRO logo | Trading Floor / Underwriting / Recovery Arena | Synthetic environment indicator | demo scenario selector | connected agent status.

**Left rail:** Portfolio | Underwrite | Active Recoveries | Ledger | Settings (mock). Avoid nonworking navigational links.

**Main area:** Data table or activity feed.

**Right side panel:** Details/inputs/explanations for currently selected claim or agent.

**Footer/trust strip:** `DEMO MODE · FABRICATED CLAIMS · NO ACTUAL PAYMENTS OR INSURER COMMUNICATION`.

## Screen 1: Trading Floor

**Purpose:** In 10 seconds answer “How much denied revenue is here? Which claims qualify for funding? What is the risk?”

Suggested hierarchy:

- Header: `Denied Claims Exchange` + `Underwrite Portfolio` primary action.
- KPI strip: count of claims; **insurer collectible amount** (potential, not guaranteed); modeled expected collection; proposed funding; remaining simulated capital; expected contribution.
- Main table columns: claim ID; insurer; denial reason; collectible if recovered; modeled recovery probability; projected purchase offer; status; deadline.
- Row click opens underwriting detail.
- Filters: eligible / review / decline; insurer; denial reason; amount; deadline urgency.
- Capital slider + risk tolerance input used to actually recompute offers/selection.
- `Simulated environment` badge constantly visible.

**Illustrative first glance:** “100 denied claims · $165,000 potentially insurer-payable · $X modeled expected collections · $Y deployable capital.” Values are determined from synthetic dataset, not hardcoded claims about real markets.

## Screen 2: Underwriting Desk

**Purpose:** A judge can interrogate **one claim** and see why it is fundable or not.

Suggested layout:

- Left card: timeline and claims financial waterfall: `billed -> contractual adjustment -> allowed -> patient responsibility -> insurer collectible`.
- Center: explicit underwriting model inputs; outcome distribution and time-to-recovery assumption.
- Right: decision rationale, missing documents/rights, max bid, risk buffer, available capital, `Offer simulated funding` action only if eligible.
- A fixed disclosure: “Probability is an editable synthetic assumption, not an empirically validated predictive model.”

An explanation should sound like: “Declined: 28-day appeal deadline passed, even though potential insurer collectible is $12,000.”

## Screen 3: Recovery Arena

**Purpose:** Make the *agentic* mechanism undeniable. It must demonstrate bounded action instead of an unstructured chatbot conversation.

Elements:

- **Case header:** claim ID; denial reason; mock insurer; contract eligibility; time left; maximum modeled collectible.
- **Side-by-side actors:** ProjektSUBRO Recovery Agent ↔ Mock Insurer (the insurer's decisions are grounded in scenario rules).
- **Agent event timeline:** Evidence checked, requested note, drafted response, mock insurer acknowledged/denied, loop detected, specialist review. Show source IDs for assertions.
- **Economics sidebar:** projected remaining collection, agent spent/budget left, action count, capital tied up, currently estimated recoverability.
- **Live actions:** `Start Agent`, `Pause`, `Inject Missing Evidence`, `Simulate Payer Repetition`, `Contradict Record`, `Escalate`, `Reset Case`.
- **Final state:** `RECOVERED (SIMULATED)`, `ESCALATED TO HUMAN`, or `STOPPED`, with a reason and no fake win animations.

**Visual finish:** When an approval is earned under the mock rules, a line item moves from expected to realized recovery on the ledger. When a case fails, realized loss appears. No confetti or fake giant green ROI.

## Screen 4 (optional): Ledger

A chronological table of simulated claim purchases, deployed capital, expenses and mock recoveries. Every amount must reconcile to trading-floor KPIs. This can be a tab/drawer rather than another whole screen.

## Micro-interactions worth the build time

- Monetary counters animate modestly when *actual modeled values* change.
- Hover/focus reveals the exact input formula (e.g., 0.80 × $500 = $400), not a vague “AI confidence”.
- Updating a risk slider immediately marks unacceptable bids invalid; do not silently fund negative-value cases.
- Agent actions use timestamped log rows and consistent icons.
- Loading and failure states are first-class. If LLM unavailable, show “Agent unavailable; deterministic simulation available” rather than pretending it ran.

## UI language that avoids industry confusion

Prefer **“Clinic”** over “Provider” in customer-facing headings, though “Provider” is acceptable in technical details.

Prefer **“Insurance company”** or **“Insurer”** over “Payer” in main navigation.

Prefer **“Insurer payment if recovered”** over “Claim value”.

Prefer **“Modeled expected collection”** over “Cash guaranteed”.

Prefer **“Proposed upfront offer (simulated)”** over “Instant payout” unless real payment exists.

Prefer **“Appeal draft created”** over “Insurance successfully fought” when only a draft was created.

## Judge test

- Without explanation, can someone distinguish $1,000 billed from $500 insurer collectible?
- Can someone see how the **current bid** was computed?
- Can a judge alter one financial assumption and see **eligibility and portfolio amounts recalculate**?
- Can a judge break the agent's evidence chain and watch the system **refuse to invent facts**?
- Does every recovery state explain whether it is simulated, expected or realized within the scenario?

If any answer is no, simplify the visuals rather than adding more.
