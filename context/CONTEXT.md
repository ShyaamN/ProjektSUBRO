# ProjektSUBRO — Product and business context

**Status:** Pre-hackathon planning document; not application code.  
**Event:** c0mpiled-16, UC San Diego, Saturday October 24, 2026.  
**Track:** **Unsupervised** (autonomous agents that recognize limits, loops, expense, and conditions for stopping).  
**Build window:** 1:30–6:30 PM Pacific; preparation and ideation beforehand are permitted, but actual code must begin at the event.  
**Audience:** Startup founders and technical/business judges.  
**Build objective:** A convincing, interactive *synthetic-data* proof of concept, not a real insurance or financial service.

## The elevator pitch

**ProjektSUBRO is a proposed autonomous underwriting and recovery platform for already-denied medical insurance claims.** Instead of merely selling software that helps clinics write appeal letters, ProjektSUBRO evaluates whether a denied, legally eligible insurer receivable is worth financing, makes a risk-adjusted *simulated* upfront offer, and sends an autonomous recovery agent to pursue documented, authorized next steps. The clinic obtains liquidity under an appropriately structured future agreement; ProjektSUBRO or its capital partner assumes specified nonpayment risk and seeks to collect the recovery.

**One-line thesis:** Turn uncertain but potentially recoverable medical reimbursements into priced financial opportunities, with AI reducing the cost and delay of recovery.

**Important:** No actual financing, claim purchase, insurance appeal, insurer contact, or real medical-record processing happens in the hackathon prototype.

## Industry vocabulary: use these terms consistently

- **Patient:** Individual who receives healthcare.
- **Doctor / clinician:** Medical professional delivering care.
- **Provider:** Person or organization delivering healthcare. **For this demo, provider always means the clinic or hospital sending claims and seeking payment.**
- **Insurer / payer:** The health plan or insurance organization deciding what is payable. Call it **insurer** in UI and presentations, except in established terms such as payer contract.
- **Claim:** Payment request submitted by the provider to the insurer for a service delivered.
- **Submission rejection:** Claim rejected in transmission/validation before full adjudication; often requires correction, not a formal appeal.
- **Denial:** Claim (or service line) adjudicated and not paid, wholly or partially, by the insurer.
- **Appeal:** A formal challenge to a denial, subject to relevant authorization, deadlines and rules. Some issues instead require corrected claims or reconsideration.
- **Billed charge:** Provider's list price; **not** necessarily what insurer owes.
- **Allowed amount:** Amount recognized under the applicable contract/coverage terms; may be split between insurer and patient.
- **Patient responsibility:** Portion assigned to patient under applicable plan terms; **do not** assume ProjektSUBRO buys it.
- **Potential insurer collectible:** The **insurer's** potential payment on successful resolution, net of patient responsibility, contractual adjustments and other relevant limitations. Basis for the demo's underwriting.
- **Receivable (A/R):** A claimed right to receive money for rendered services, subject to the terms and disputes governing that right.
- **Underwriting:** Assessing probability, amount, timing, operational costs and legal eligibility to decide whether to offer financing and at what price.
- **Non-recourse:** Defined nonpayment risk is carried by purchaser/financier rather than automatically charged back to provider, **subject to negotiated exceptions** (e.g., fraud, breach, invalid representations). Not a universal guarantee.
- **Authorized representative:** Person/entity allowed under applicable plan procedures to handle an appeal. **Appeal authority is not automatically transferred by buying a receivable.**
- **Recovery:** Cash actually collected or payable after resolving a claim. Distinguish this from a written appeal or a favorable insurer response.
- **EHR:** Electronic Health Record with clinical documents; separate from the claims/remittance data stream.
- **RCM:** Revenue Cycle Management: the provider's work of billing, collecting and resolving insurance payment issues.

## Explain ProjektSUBRO like a middle schooler

1. Sunshine Clinic treats John and submits an insurance claim.
2. Suppose the clinic bills **$1,000**, but its contracted allowed amount is **$600**. Assume John owes **$100** and the insurer would owe **$500** if payable. The **$400 contractual adjustment is neither John's debt nor collectible by ProjektSUBRO** for an ordinary covered in-network service.
3. Insurer denies its **$500** portion because a required clinical document appears to be missing.
4. ProjektSUBRO checks denial details, contract assumptions, available records, deadline and legal transfer/representation eligibility.
5. Under **hypothetical, unvalidated assumptions**, it estimates an **80%** chance of recovering the full $500 and total expected recovery/financing costs of **$30**.
6. It proposes **$300 upfront** for the legally eligible receivable (simulation only).
7. If the simulated provider accepts, ProjektSUBRO records a *paper-trade* purchase, then runs a bounded agent that checks records and drafts a documented response to a simulated insurer.
8. If successful, ProjektSUBRO recovers $500, yielding $170 **realized contribution** in this simplified success case. On failure it loses $330. Weighted at 80%/20%, **expected contribution** = $70. This is *not* a validated win rate, profit forecast or guaranteed return.

## Problem and customer

- **Initial customer:** US clinic or medical group with a manageable volume of **commercial, in-network, already-adjudicated denied claims** and a meaningful cash-flow burden. Later expansion to different provider segments depends on legal/operational research.
- **Real pain:** Denied claims absorb staff time, create delays and may remain uncollected. Clinics care about **cash sooner**, **less administrative work**, and **clearer certainty**. The provider's primary incentive is immediate working capital and transfer of recovery risk: clinics may rationally accept discounted upfront cash to fund operations and avoid months of uncertain collection and administrative expense.
- **Who pays ProjektSUBRO?** In the long-term proposed model, ProjektSUBRO or capital partners buy/finance selected eligible receivables below their conservative estimated collectible value; the spread after actual recovery and costs is the potential economic return. Alternative or intermediary structures may be necessary.
- **Who supplies capital?** Initially committed balance-sheet financing, then appropriate third-party capital arrangements if underwriting is validated. **Not** customer deposits, a self-issued token, or magical capital.
- **Payer relationship:** The insurer owes only what applicable coverage and contracts require; ProjektSUBRO does not compel payment by presenting a convincing LLM response.

## The product is TWO linked engines, not three disconnected dashboards

1. **Underwriting + capital allocation:** Ingest synthetic claim records and evidence, decide **BUY / REVIEW / DECLINE**, compute an auditable proposed bid and rank/select claims against a portfolio funding limit.
2. **Bounded autonomous recovery:** After an authorized **simulated** purchase, an agent inspects evidence, selects next steps, creates a draft with citations to synthetic records, interacts with a *rule-based* simulated insurer, and **continues / pauses for a human / stops** according to explicit safeguards.
3. **Closed-loop learning (vision only):** Real observed recovery results could eventually improve risk estimates and capital allocation; prototype records synthetic outcomes, not a trained commercial predictive model.

## Differentiation thesis — say precisely, never exaggerate

- **Existing categories:** Denial-recovery automation (e.g., Aegis, Amperos); healthcare receivables financing (e.g., Copay); longstanding providers of RCM services.
- **Proposed gap:** **Claim-level underwriting and purchasing/financing of *already-denied* receivables**, paired with tightly integrated autonomous recovery and portfolio capital allocation.
- **Unproven:** That nobody does this; that the legal purchase/appeal structure works for every insurer; that ProjektSUBRO's model is more accurate than competitors; that claims can be processed for pennies; that the startup has a monopoly.
- **Potential future moat:** Proprietary **permissioned** labeled outcome data, calibrated risk pricing, specialized payer/denial-class expertise, provider relationships, cheaper and committed capital, and compliant integrations. None of those is established on demo day.

## Three business tests that actually matter

1. **Legality and rights:** For a narrow class of commercial claims, can the provider lawfully sell or finance the receivable, grant recovery authority, and route collections using defensible contracts and payer-compatible procedures?
2. **Underwriting economics:** Are realistic, *calibrated* conditional recovery outcomes worth more than provider purchase prices, capital expenses, specialist costs and losses, including adverse selection?
3. **Provider acceptance:** Are clinics willing to accept sufficient discounts for immediate liquidity and transfer of defined risk, when compared with their existing RCM or financing options?

## Guardrails and domain realities

- HIPAA-compliant arrangements would be needed for a commercial launch involving protected health information; **hackathon uses fabricated synthetic people, records, IDs, payers and amounts only**.
- Authorization to handle appeals, assignment of a payment right, and agreement for payment routing are **distinct matters**; contracts and payer rules must be reviewed separately.
- Medicare/Medicaid and some commercial payer agreements have special assignment/payment restrictions; do **not** claim all denials can be purchased or pursued identically.
- Denial reversal is not guaranteed. Some denials are correct; missing evidence cannot be fabricated.
- A claim may pay partially or after many months; *full-or-zero recovery* in the demo is an explicit simplifying assumption for selected scenarios.
- External review does **not** mean every denied medical bill generates an automatic $500 insurer penalty.
- Do not describe ProjektSUBRO as a licensed attorney, insurer, bank or debt collector.
- The name **ProjektSUBRO** is a working brand; legal *projektsubrogation* has a different established meaning from appealing a denied provider claim.

## Evidence and original-source reading

Facts for a judge-facing pitch should be dated and population-qualified, never universalized.

- KFF (Mar. 24, 2026): In **2024 HealthCare.gov qualified health plans**, 20% of all claims were denied in the reported dataset; this is **not** the US nationwide provider denial rate. https://www.kff.org/patient-consumer-protections/claims-denials-and-appeals-in-aca-marketplace-plans-in-2024/
- CMS: Electronic Remittance Advice reports adjustments and standard reason codes (CARC, RARC); group codes can distinguish contractual obligations from patient responsibility. https://www.cms.gov/medicare/coding-billing/electronic-billing/health-care-payment-remittance-advice
- US Department of Labor: Assignment of payment benefits and designation as authorized representative are not equivalent. https://www.dol.gov/agencies/ebsa/about-ebsa/our-activities/resource-center/faqs/benefit-claims-procedure-regulation
- HHS: Claims processing and billing vendors handling PHI may be business associates. https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/business-associates/index.html

**Never pass synthetic demo figures off as market data.** Any claimed recovery success rate, all-in appeal cost, provider purchase discount or capital return is an **assumption** unless verified with data.

## Hackathon success definition

Within a short demo, the judges can (a) change risk/capital/evidence assumptions and see auditable financial decisions recalculate, (b) see a *simulated purchase* linked to capital usage, (c) launch an autonomous, bounded, evidence-based recovery loop against a rule-driven mock insurer, and (d) deliberately break a case so the agent **declines, escalates, or stops** correctly.

**Read next:** `ARCHITECTURE.md` -> `FEATURES.md` -> `AGENT_RULES.md` -> `DEMO.md` -> `DESIGN.md` -> `BUILD_PROMPT.md`.
