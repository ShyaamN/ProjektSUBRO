# ProjektSUBRO — Demo playbook, synthetic scenarios and judging prep

**Event:** c0mpiled-16 at UC San Diego, Oct 24, 2026. Build starts **1:30 PM** and submissions close **6:30 PM PT**. Finalist judging format still to be confirmed by organizers; build a demo that scales from **90 seconds to 3 minutes**.

## Demonstration objective

Prove the *economic mechanism*, not just the concept's wording:

1. Denied claims can be assessed as **uncertain future insurer collections**.
2. Different recovery odds and costs create different **rational upfront purchase offers**.
3. A capital limit creates a real portfolio-selection problem.
4. A funded (simulated) claim triggers an agent that takes **evidence-grounded actions** and can refuse, escalate or stop.
5. Mock recovery outcomes update the financial ledger with correct math.

**Strongest takeaway:** “We're not just writing appeal letters. We're testing whether already-denied insurer receivables can be reliably underwritten and financed, with AI executing bounded recovery workflows.”

## Staged 2-minute live sequence

**0:00–0:15 — Show the pain and opportunity.** Open Trading Floor. “Here are 100 fabricated denied claims. We don't assume the full hospital bill is owed; we compute the insurer's potential collectible portion.”

**0:15–0:35 — Underwrite portfolio.** Press Underwrite. Show BUY / REVIEW / DECLINE, proposed cash offers and expected contributions. Explain one formula:

`Expected collection = modeled success probability × potential insurer payment if successful` (for the binary demo case).

**0:35–0:50 — Let a judge change risk.** Drag recovery odds from 80% to 50% on a sample claim. Expected profit at the *original purchase price* drops from +$70 to −$80. Bid becomes invalid or is repriced.

**0:50–1:05 — Fund a claim (simulation).** Choose a passing claim; click “Accept simulated offer.” Capital reserves and audit log update. Nothing real is paid.

**1:05–1:35 — Agent recovery.** Start agent. It identifies the evidence it needs, finds a fabricated clinical note, cites it and drafts/submits to mock insurer. Mock insurer follows independent preset rules and pays or denies accordingly.

**1:35–1:55 — Break it.** Switch to a case where evidence is absent or payer repeats an unchanged answer. Trigger stop. “Our agent knows when not to continue, because endless appeals can destroy portfolio economics.”

**1:55–2:00 — Close.** “The prototype demonstrates pricing, autonomous handling, and bounded risk on fabricated data. The company thesis is immediate liquidity for legally eligible denied receivables.”

## Synthetic fixture structure

Create **100 fabricated denied claims** *during permitted coding hours*, with the 100-claim portfolio data seeded or deterministically generated during hacking. This planning document specifies the contents but is not the program dataset.

Each row should include: claim ID, fabricated insurer and clinic, dates, original billed amount, allowed amount, patient share, potential insurer collectible, denial category, mock deadline, required evidence references, attached evidence, authorization flag, modeled success probability (from synthetic scenario assumption), estimated recovery expense, estimated collection delay and status.

Possible illustrative distribution (design goal, not historical fact):

- ~35 documentation/administrative cases with plausible recovery paths.
- ~20 cases needing missing records or human review.
- ~15 eligibility/contract disputes with mixed outcomes.
- ~15 cases that are negative economics despite face value.
- ~10 cases with expired mock windows or disallowed permission conditions.
- ~5 deliberately adversarial cases (contradictions, duplicate payer response, partial payment).

**Do not force exact BUY/REVIEW/DECLINE counts.** The solver should produce whatever results the documented rules and data justify. If desired, create the synthetic test cases to exercise each branch.

## Six memorable cases

### CASE-1042 — Small claim, profitable if documented

- Clinic bill: $1,000; allowed amount: $600; patient responsibility: $100; potential **insurer** payment: **$500**.
- Simulated denial: relevant encounter note omitted from prior submission.
- Hypothetical modeled recovery odds: **80%**; estimated all-in cost **$30**; initial offer **$300**.
- Model outputs **$400** expected collection and **+$70** expected contribution.
- Mock record contains the actual relevant clinical note with evidence ID E-1042-A; insurer rules accept it if submitted properly before deadline.
- If judge reduces probability to 50%, original-price expected contribution becomes **−$80**; must decline/reprice.

### CASE-2088 — Large claim, should decline

- Potential insurer collectible: **$20,000**, much larger than case 1042.
- Appeal window expired under synthetic scenario, no modeled extension/exception authorization.
- **Decision: DECLINE / human legal review only if explicitly supported.** Large face value is not permission to invent a deadline.

### CASE-3021 — Missing evidence, cannot fake it

- Potential insurer collectible $900; expected success odds only actionable if a specific lab note exists.
- Clinical note absent from provided documents.
- **Decision: NEEDS REVIEW.** Agent asks for note; cannot invent it. If judge injects a valid new fabricated note, rerun eligibility and pricing.

### CASE-4109 — Repeated insurer response

- Mock insurer repeats the same message twice despite an already submitted identical explanation.
- Agent detects no new evidence or meaningful action; **STOP / ESCALATE** with repeated-loop reason and budget accounting.

### CASE-5060 — Contradictory record

- Provider's submitted date conflicts with synthetic procedure record.
- Agent must **ESCALATE** rather than select whichever date yields a winning appeal.

### CASE-6077 — Partial outcome

- Potential insurer collectible $800, mock insurer agrees to pay $350 under scenario conditions.
- Ledger books **$350 realized simulated collection**, not $800, and calculates contribution using actual advance and expenses. Partial recovery is a state, not a full win.

## Judge chaos switches

- `Capital shortage` — set capital below total possible purchase offers; portfolio must ration.
- `Risk calibration shock` — lower assumed recovery probability; marginal trades become unprofitable.
- `Payer responsibility shock` — decrease insurer collectible even if billed charges stay unchanged.
- `Missing clinical note` — agent cannot win until synthetic proof appears.
- `Evidence contradiction` — force specialist escalation.
- `Repeat denial` — enforce retry/loop stop.
- `Deadline passed` — prevent invalid submission.
- `Human required` — agent pauses without misrepresenting professional authority.

## Three claims to avoid under cross-examination

1. **“AI appeals cost $0.18”** — unverified *all-in* cost. An API call may be cheap, but clinical review, evidence retrieval, follow-up, compliance, errors and capital can be expensive.
2. **“70% of all denied claims are overturned”** — figures vary dramatically by insurer, denial class and dataset. Do not universalize a study result.
3. **“A claim purchase automatically lets us appeal and collect”** — payment rights, representation and permitted payment routing are separate legal/contract matters.

## Judge Q&A: short answers

**Q: Who is the customer?**  
A: “US clinics and medical groups with eligible denied commercial-insurance receivables. They value immediate cash and less recovery work.”

**Q: Why would a clinic sell at a discount?**  
A: “Liquidity, speed and transfer of specified recovery risk. But that requires testing willingness to accept a price relative to their current recovery process.”

**Q: Aren't you just an appeals chatbot plus factoring?**  
A: “The individual pieces exist. Our thesis is an integrated underwriting and recovery system for already-denied claims where the technology prices financial risk and then works to realize the collection. We'd need to prove the integrated economics outperform alternatives.”

**Q: What is the moat?**  
A: “Potentially calibrated outcome data, payer/denial-class specialization, provider integrations and capital access, not the LLM itself. We haven't built that moat yet.”

**Q: Who takes the loss?**  
A: “The purchaser or designated financing structure takes the specified nonpayment risk under a suitable non-recourse deal; fraud or contractual breaches may be exceptions.”

**Q: What if AI probabilities are wrong?**  
A: “Conservative pricing, outcome calibration, concentration caps and loss monitoring are essential. The hackathon uses openly labeled synthetic assumptions.”

**Q: Can you legally buy and appeal claims?**  
A: “Only eligible categories under agreements approved by counsel. Appeal representation, payment assignment and receivable financing must each be handled explicitly.”

**Q: Why not buy every denied claim?**  
A: “Some are validly denied, expired, undocumented, legally unsuitable or worth less than the cost/risk of recovery. Correct rejection protects the economics.”

**Q: Is this real patient data?**  
A: “No. Entirely synthetic claims, mock insurers and simulated financial transactions.”

**Q: What did you actually build today?**  
A: “Risk-based pricing and capital allocation connected to an autonomous, evidence-grounded recovery process with genuine rule-based refusal/stop conditions. No real payment or insurer integrations.”

**Q: Why Unsupervised track?**  
A: “Agents can work through claims independently, monitor cost and state, detect repeated unproductive actions and know when to stop or escalate.”

## A 30-second closing statement

“Denied insurance claims aren't all worthless; they're uncertain future cash flows. ProjektSUBRO proposes to price that risk, offer eligible clinics immediate liquidity and use autonomous agents to handle recovery. The key invention we're testing is the integration of underwriting, capital deployment and evidence-grounded recovery—not an AI appeal letter. Today we're demonstrating that decision system using synthetic claims and a simulated insurer, including the ability to decline a bad trade or stop an unproductive agent.”

## If asked about sources

- KFF's 2024 Marketplace analysis is **not a universal US denial rate**: https://www.kff.org/patient-consumer-protections/claims-denials-and-appeals-in-aca-marketplace-plans-in-2024/
- CMS explains the remittance reason and patient/provider adjustment categories: https://www.cms.gov/medicare/coding-billing/electronic-billing/health-care-payment-remittance-advice
- DOL explains appeal representation is separate from assignment of benefits: https://www.dol.gov/agencies/ebsa/about-ebsa/our-activities/resource-center/faqs/benefit-claims-procedure-regulation

## Real-world next steps AFTER hackathon

Talk to billing/RCM leaders, a receivables-finance specialist, and healthcare counsel. Seek actual historical denied-claim outcomes and permitted transfer/servicing terms for one commercial claim category. Establish empirical recoverability and full costs. This is validation work, not demo-day proof.
