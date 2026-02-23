---
vsf:
  date: 2026-02-23
  mode: CFO_RUN
  trace_id: vsf-TEST-CFO-001
  stage: F4
  target: "SaaS breakeven 12m — narrative safe"
  language: "EN"
  status: LOCKED
  tags: ["runtime_enforcement","fail_closed","gating","reason_codes"]
  notion_page: ""
---

# Runtime Enforcement Contract v1 (CFO) — vsf-TEST-CFO-001

## A) Enforcement Contract v1

### A1. Ingress: Required Artifacts (Fail-Closed)
The Worker MUST ingest exactly four artifacts as JSON objects:
1) `micro_case`
2) `trigger_spec`
3) `gating_rules`
4) `outcome_contract`

**Checks (deterministic):**
- RUNTIME-A1-1: All four top-level keys exist and are non-null.
  - If missing any: reason_code = CFO-01, outcome = NEEDS_INPUT
- RUNTIME-A1-2: Each artifact parses as valid JSON and matches expected root shape:
  - `micro_case.micro_case` object exists
  - `trigger_spec.trigger_spec` object exists
  - `gating_rules.gating_rules` object exists
  - `outcome_contract.outcome_contract` object exists
  - If invalid/parse error: reason_code = CFO-02, outcome = REJECTED
  - If wrong root shape: reason_code = CFO-03, outcome = REJECTED

### A2. Units, Windows, and Cadence Consistency (No Ambiguity)
All triggers and success criteria MUST be evaluable with explicit units, windows, and cadence.

**Global unit policy:**
- Money: USD (allow "$" as alias, normalized to USD)
- Percent: percent (0–100 scale unless explicitly labeled as ratio)
- Multipliers: "x"
- Time: months / weeks / days where stated

**Checks:**
- RUNTIME-A2-1: Every trigger has:
  - `id`, `name`, `formula`, `threshold.pass/watch/fail`, `measurement_window`, and at least one action in `action_if_pass` and `action_if_fail`.
  - If missing: reason_code = CFO-04, outcome = REJECTED
- RUNTIME-A2-2: Every threshold statement must be machine-normalizable into a comparator set (>=, <=, <, >) and numeric value(s) with unit.
  - If not normalizable (e.g., free text without numbers): reason_code = CFO-05, outcome = REJECTED
- RUNTIME-A2-3: Window alignment:
  - If trigger declares "Trailing 3-month average" then formula must reference 3mo_avg (or equivalent) OR be explicitly mapped in normalization rules.
  - If mismatch: reason_code = CFO-06, outcome = REJECTED
- RUNTIME-A2-4: Outcome success_criteria units must match trigger units when same metric name is used (e.g., NRR percent, GrossMargin percent).
  - If mismatch: reason_code = CFO-07, outcome = REJECTED

### A3. Variance Requirement (Bands Over Points)
“No fake precision” is mandatory: all targets MUST be expressed as ranges/bands.

**Checks:**
- RUNTIME-A3-1: In `outcome_contract.success_criteria`, every target is `target_range` with two numbers [min,max].
  - If any metric uses a single point: reason_code = CFO-08, outcome = REJECTED
- RUNTIME-A3-2: In `micro_case.constraints_and_non_negotiables.non_negotiables`, presence of “No fake precision” requirement is treated as binding:
  - If missing from micro_case (unexpected): reason_code = CFO-09, outcome = NEEDS_INPUT

### A4. Breakeven Metric Selection Rule (FCF Primary)
Primary breakeven is FCF; EBITDA is secondary; both are reported.

**Checks:**
- RUNTIME-A4-1: `outcome_contract.breakeven_definition_selected.preferred` must equal "FCF breakeven" and `alternate` must include "EBITDA breakeven".
  - If absent or different: reason_code = CFO-10, outcome = REJECTED
- RUNTIME-A4-2: Triggers must include both T1 (FCF) and T2 (EBITDA).
  - If missing either: reason_code = CFO-11, outcome = REJECTED
- RUNTIME-A4-3: If cash_on_hand is unknown (micro_case baseline has range but not point), runway trigger T4 cannot be computed deterministically unless actual `cash_balance` data is provided at runtime.
  - If runtime evaluation requested without cash_balance input: reason_code = CFO-12, outcome = NEEDS_INPUT

### A5. Trigger Rules: Evaluation, Normalization, and State
#### A5.1 Trigger State Machine
Each trigger evaluates to one of: PASS, WATCH, FAIL.
- If evaluation cannot be computed due to missing inputs: state = UNKNOWN (internal), and enforcement behaves fail-closed.

**Checks:**
- RUNTIME-A5-1: All trigger IDs are unique.
  - If duplicate: reason_code = CFO-13, outcome = REJECTED
- RUNTIME-A5-2: Trigger IDs referenced in gating_rules critical_triggers and gates must exist in trigger_spec.triggers.
  - If reference missing: reason_code = CFO-14, outcome = REJECTED
- RUNTIME-A5-3: Each trigger declares measurement cadence compatible with trigger_spec.measurement_cadence categories (daily/weekly/monthly_close).
  - If trigger requires cadence not listed: reason_code = CFO-15, outcome = REJECTED

#### A5.2 Required Runtime Inputs by Trigger (Minimum)
To compute triggers, the Worker MUST require the following minimum inputs per evaluation cycle:

- T1 (FCF trajectory): OperatingCashFlow, Capex, TargetFCF_3mo_avg(month_index), month_index
- T2 (EBITDA trajectory): Revenue, COGS, Opex excl D&A, TargetEBITDA_3mo_avg(month_index), month_index
- T3 (Ro40): ARR_Growth_Rate_TTM, EBITDA_Margin_TTM
- T4 (Runway): CashBalance, NetBurn_3mo_avg (or components to derive), and burn nonzero guard
- T5 (NRR): StartingARR, Expansion, Contraction, Churn
- T6 (Pipeline coverage): QualifiedPipelineAmount_next_quarter, BookingsTarget_next_quarter
- T7 (CAC payback): CAC, GrossMargin, NewARR_per_month
- T8 (Gross margin): Revenue, COGS

**Checks:**
- RUNTIME-A5-4: If any required input for a CRITICAL trigger (T1, T4, T5, T8) is missing at evaluation time:
  - reason_code = CFO-16, outcome = NEEDS_INPUT
- RUNTIME-A5-5: If any required input for a NON-critical trigger is missing:
  - reason_code = CFO-17, outcome = NEEDS_INPUT

### A6. Tranche Gating: Allowed/Blocked Decisions (No Bypass)
The Worker MUST enforce gates exactly as specified in `gating_rules.gates`, with the principles:
- Fail-closed on critical guardrails
- Protect retention
- Reallocate before cutting
- Bands over points

#### A6.1 Gate Evaluation Order (Deterministic)
1) Evaluate all triggers -> states
2) Determine if any critical trigger is FAIL / WATCH
3) Apply gate rules (G1..G4) in ascending gate_id order
4) Apply exceptions only if explicitly defined for that gate
5) Apply escalation rules after gate decisions are computed

**Checks:**
- RUNTIME-A6-1: `gating_rules.signal_states` must contain PASS, WATCH, FAIL exactly (order irrelevant).
  - If not: reason_code = CFO-18, outcome = REJECTED
- RUNTIME-A6-2: `gating_rules.critical_triggers` must be a subset of trigger IDs and non-empty.
  - If empty or invalid: reason_code = CFO-19, outcome = REJECTED

#### A6.2 Gate-Specific Enforcement (Exact)
**G1_HEADCOUNT**
- Allowed:
  - If all critical triggers PASS: proceed with approved plan; may add +1–2 critical roles/month only if Ro40 PASS AND CAC Payback PASS.
  - If any critical trigger WATCH: backfills only + retention-critical roles; CFO approval required.
- Blocked:
  - If any critical trigger FAIL: block all net-new hires and non-critical backfills; exception requires CEO+CFO signoff and written ROI case.
- Exception:
  - If T5 WATCH/FAIL: CS/Product roles directly mitigating churn are allowed even during containment, but MUST be offset by cuts elsewhere.

**Checks:**
- RUNTIME-A6-3: Any headcount request without explicit classification {retention-critical | non-critical | backfill | net-new}:
  - reason_code = CFO-20, outcome = NEEDS_INPUT
- RUNTIME-A6-4: Any headcount approval when any critical trigger FAIL and missing CEO+CFO signoff + ROI case:
  - reason_code = CFO-21, outcome = REJECTED

**G2_GTM_SPEND**
- Allowed:
  - If T7 PASS AND T6 PASS AND (T1 or T2) PASS/WATCH: scale +5–15% in proven segments; experiment budget capped 2–5% of GTM spend.
- Blocked:
  - If T7 FAIL or T6 FAIL: freeze scaling; cut lowest ROI channels 10–30%; require ROI proof for reinstatement.
  - If T1 FAIL AND T4 WATCH/FAIL: immediate discretionary GTM spend freeze except commitments; re-approve monthly.
- Required controls:
  - Discount governance by segment; CFO approval for exceptions
  - Quota capacity check alignment with coverage thresholds

**Checks:**
- RUNTIME-A6-5: Any GTM spend change request missing: segment, channel, amount, expected ROI/payback, and whether it is "experiment" vs "proven":
  - reason_code = CFO-22, outcome = NEEDS_INPUT
- RUNTIME-A6-6: Any discount exception without CFO approval:
  - reason_code = CFO-23, outcome = REJECTED

**G3_PRODUCT_AND_RND**
- Allowed:
  - If T5 PASS or WATCH: prioritize retention-critical roadmap; limit new big bets to quantified retention/upsell impact.
- Blocked:
  - If T1 FAIL and T5 PASS: pause non-core R&D; focus on cost-to-serve, reliability, upsell enablers.
  - If T5 FAIL: block any roadmap that risks churn; mandate churn-reduction tiger team and reliability focus.

**Checks:**
- RUNTIME-A6-7: Any roadmap initiative missing classification {retention-critical | non-core | big-bet} and quantified impact (retention/upsell):
  - reason_code = CFO-24, outcome = NEEDS_INPUT
- RUNTIME-A6-8: Any approval of a roadmap item flagged as “risks churn” while T5 FAIL:
  - reason_code = CFO-25, outcome = REJECTED

**G4_VENDOR_AND_NON_LABOR**
- Allowed:
  - If T1 PASS and T4 PASS: renewals allowed; new spend requires ROI case if >$5k/month.
- Blocked:
  - If T4 WATCH/FAIL: renegotiate top vendors; approve only mission-critical; target 10–20% savings within 60 days.

**Checks:**
- RUNTIME-A6-9: Any new vendor spend >$5k/month without ROI case:
  - reason_code = CFO-26, outcome = REJECTED
- RUNTIME-A6-10: Any vendor approval under T4 WATCH/FAIL without mission-critical justification:
  - reason_code = CFO-27, outcome = REJECTED

### A7. Defensive Mode (Fail-Closed Policy)
From outcome_contract.fail_closed_policy:
- Default: If any critical trigger is FAIL, system enters DEFENSIVE mode until two consecutive PASS cycles.

**Checks:**
- RUNTIME-A7-1: If any critical trigger FAIL:
  - enforce DEFENSIVE actions set:
    - Hiring freeze except retention-critical
    - Discretionary spend reduction 10–25%
    - Weekly cash focus and collections push
    - Reallocation of GTM spend to proven ROI or retention
  - If Worker attempts to remain in non-defensive mode: reason_code = CFO-28, outcome = REJECTED
- RUNTIME-A7-2: Exit criteria requires two consecutive cycles where all critical triggers PASS.
  - If exit attempted without meeting criteria: reason_code = CFO-29, outcome = REJECTED

### A8. Escalation Rules (Mandatory)
From gating_rules.escalation_rules:
- Two consecutive monthly FAILs on T1/T2 -> Board-level review; stronger cost program; revise guidance narrative
- Four consecutive weekly FAILs on T4 -> activate financing/strategic options; immediate burn reduction

**Checks:**
- RUNTIME-A8-1: If condition met and escalation not emitted as required event:
  - reason_code = CFO-30, outcome = REJECTED

### A9. Data Requirements & Quality SLA (Minimum Enforceable Set)
From outcome_contract.data_requirements:
- Systems: Accounting/ERP, CRM, Billing/Subscriptions, Data warehouse (if exists)
- Minimum fields: ARR bridge, COGS breakdown, Opex by function, Pipeline stages/targets, Headcount by function with fully-loaded cost assumptions
- SLA: close timeliness range [5,10] days; CRM hygiene enforced

**Checks:**
- RUNTIME-A9-1: If any minimum_fields are absent from available runtime dataset for monthly close evaluation:
  - reason_code = CFO-31, outcome = NEEDS_INPUT
- RUNTIME-A9-2: If monthly close is delivered outside SLA (>10 business days) and Worker is asked to certify trigger states as final:
  - reason_code = CFO-32, outcome = REJECTED
- RUNTIME-A9-3: If CRM hygiene required fields not enforced (missing stage definitions/required qualification fields) and pipeline triggers are used for gating:
  - reason_code = CFO-33, outcome = NEEDS_INPUT

### A10. No-Bypass Invariants (Hard Stops)
The following are absolute:
1) Any approval that violates a gate’s `blocked_if` is forbidden unless an explicit exception exists AND required signoffs are present.
2) Any attempt to approve discretionary growth spend or net-new headcount while any critical trigger is FAIL is forbidden (except explicit retention_protection exception for CS/Product roles, with offset requirement).
3) All approvals/denials must be logged with: request_id, gate_id, trigger_states, rationale, signoffs, expected ROI band.

**Checks:**
- RUNTIME-A10-1: Gate decision without decision log entry:
  - reason_code = CFO-34, outcome = REJECTED
- RUNTIME-A10-2: Retention_protection exception used without documented offset cuts:
  - reason_code = CFO-35, outcome = REJECTED

---

## B) Reason Codes Taxonomy (CFO-01..)
- CFO-01 Missing required artifact(s) (NEEDS_INPUT)
- CFO-02 JSON parse error (REJECTED)
- CFO-03 Wrong root shape / missing expected root object (REJECTED)
- CFO-04 Trigger missing required fields (REJECTED)
- CFO-05 Threshold not machine-normalizable (REJECTED)
- CFO-06 Measurement window/formula mismatch (REJECTED)
- CFO-07 Units mismatch between triggers and outcome criteria (REJECTED)
- CFO-08 Point target without range (REJECTED)
- CFO-09 Missing “no fake precision” non-negotiable (NEEDS_INPUT)
- CFO-10 Breakeven preference/alternate mismatch (REJECTED)
- CFO-11 Missing T1 or T2 trigger (REJECTED)
- CFO-12 Missing cash inputs for runway computation at runtime (NEEDS_INPUT)
- CFO-13 Duplicate trigger IDs (REJECTED)
- CFO-14 Gating references unknown trigger IDs (REJECTED)
- CFO-15 Cadence category mismatch (REJECTED)
- CFO-16 Missing inputs for CRITICAL trigger evaluation (NEEDS_INPUT)
- CFO-17 Missing inputs for NON-critical trigger evaluation (NEEDS_INPUT)
- CFO-18 Invalid signal_states set (REJECTED)
- CFO-19 Invalid/empty critical_triggers list (REJECTED)
- CFO-20 Headcount request missing classification (NEEDS_INPUT)
- CFO-21 Headcount exception missing signoff/ROI (REJECTED)
- CFO-22 GTM spend request missing required details (NEEDS_INPUT)
- CFO-23 Discount exception missing CFO approval (REJECTED)
- CFO-24 Roadmap item missing classification/quantified impact (NEEDS_INPUT)
- CFO-25 Roadmap approval risks churn while T5 FAIL (REJECTED)
- CFO-26 Vendor spend >$5k/mo missing ROI case (REJECTED)
- CFO-27 Vendor approval under low runway without mission-critical justification (REJECTED)
- CFO-28 Not entering DEFENSIVE mode on critical FAIL (REJECTED)
- CFO-29 Exiting DEFENSIVE mode without two PASS cycles (REJECTED)
- CFO-30 Escalation event not emitted when condition met (REJECTED)
- CFO-31 Missing minimum required data fields (NEEDS_INPUT)
- CFO-32 Close timeliness outside SLA but treated as final (REJECTED)
- CFO-33 CRM hygiene insufficient for pipeline-based gating (NEEDS_INPUT)
- CFO-34 Missing decision log entry (REJECTED)
- CFO-35 Retention exception without offset cuts documented (REJECTED)

---

## C) Runtime Response Mapping (NEEDS_INPUT vs REJECTED)
**NEEDS_INPUT** (recoverable; provide missing data/fields and re-run):
- Missing required artifacts (CFO-01)
- Missing runtime inputs for evaluation (CFO-12, CFO-16, CFO-17)
- Missing request metadata required to classify/enforce gates (CFO-20, CFO-22, CFO-24)
- Missing minimum data fields / CRM hygiene issues that prevent reliable evaluation (CFO-31, CFO-33)
- Missing binding “no fake precision” clause in micro_case (CFO-09)

**REJECTED** (non-recoverable without changing artifacts or violating policy; must correct spec or stop action):
- Any JSON/shape invalidity (CFO-02, CFO-03)
- Any trigger/threshold/unit/window inconsistency (CFO-04..CFO-08, CFO-10..CFO-15, CFO-18..CFO-19)
- Any attempt to bypass gates/defensive mode/escalations/logging (CFO-21, CFO-23, CFO-25..CFO-30, CFO-32, CFO-34..CFO-35)

---

## D) Minimal Validation Report Schema
The Worker MUST emit a validation report for every run.

```json
{
  "trace_id": "vsf-TEST-CFO-001",
  "timestamp_utc": "YYYY-MM-DDTHH:MM:SSZ",
  "artifacts_present": {
    "micro_case": true,
    "trigger_spec": true,
    "gating_rules": true,
    "outcome_contract": true
  },
  "normalization": {
    "unit_normalization": {
      "USD_aliases": ["$", "USD"],
      "percent_scale": "0-100",
      "multipliers": ["x"]
    },
    "thresholds_parsed": [
      { "trigger_id": "T1_FCF_BREAKEVEN_TRAJECTORY", "parsed": true, "notes": "" }
    ]
  },
  "trigger_evaluation": [
    {
      "trigger_id": "T4_RUNWAY_FLOOR",
      "state": "PASS|WATCH|FAIL|UNKNOWN",
      "inputs_missing": ["CashBalance"],
      "computed_values": { "RunwayMonths": null }
    }
  ],
  "gate_decisions": [
    {
      "request_id": "REQ-123",
      "gate_id": "G1_HEADCOUNT",
      "decision": "ALLOWED|BLOCKED",
      "basis": {
        "critical_triggers": { "T1": "PASS", "T4": "WATCH", "T5": "PASS", "T8": "PASS" },
        "noncritical_triggers": { "T6": "PASS", "T7": "PASS", "T3": "WATCH" }
      },
      "exceptions_used": [
        { "exception_id": "retention_protection", "offset_documented": false }
      ],
      "signoffs": ["CFO"],
      "roi_case_attached": true,
      "reason_codes": ["CFO-35"]
    }
  ],
  "escalations_emitted": [
    { "rule": "Two consecutive monthly FAILs on T1/T2", "emitted": false }
  ],
  "decision_log_written": true,
  "final_outcome": {
    "outcome": "NEEDS_INPUT|REJECTED",
    "reason_codes": ["CFO-16"]
  }
}

---

### file_path: docs/policy/vsf-TEST-CFO-001/00_master_registry.yaml
id: vsf-TEST-CFO-001.master_registry
version: "1.0.0"
created_at: "2026-02-23T00:00:00Z"
scope:
  trace_id: "vsf-TEST-CFO-001"
  domain: "CFO governance decision authority"
  publication_set: "Governance Publication Set"
invariants:
  - "Fail-closed is the default enforcement stance."
  - "Published artifacts are deterministic and versioned."
  - "Hashes may be HASH_TODO until computed in CI."
hash: "HASH_TODO"
artifacts:
  - file: "01_canonicalization_profile.json"
    id: "vsf-TEST-CFO-001.canonicalization_profile"
    type: "canonicalization_profile"
    version: "1.0.0"
    hash: "HASH_TODO"
  - file: "02_hash_coverage_map.yaml"
    id: "vsf-TEST-CFO-001.hash_coverage_map"
    type: "hash_coverage_map"
    version: "1.0.0"
    hash: "HASH_TODO"
  - file: "03_fail_closed_mapping.yaml"
    id: "vsf-TEST-CFO-001.fail_closed_mapping"
    type: "fail_closed_mapping"
    version: "1.0.0"
    hash: "HASH_TODO"
  - file: "04_compatibility_policy.yaml"
    id: "vsf-TEST-CFO-001.compatibility_policy"
    type: "compatibility_policy"
    version: "1.0.0"
    hash: "HASH_TODO"
  - file: "05_reference_graph_policy.yaml"
    id: "vsf-TEST-CFO-001.reference_graph_policy"
    type: "reference_graph_policy"
    version: "1.0.0"
    hash: "HASH_TODO"
  - file: "06_decision_package_taxonomy.yaml"
    id: "vsf-TEST-CFO-001.decision_package_taxonomy"
    type: "decision_package_taxonomy"
    version: "1.0.0"
    hash: "HASH_TODO"
  - file: "07_conformance_checklist.yaml"
    id: "vsf-TEST-CFO-001.conformance_checklist"
    type: "conformance_checklist"
    version: "1.0.0"
    hash: "HASH_TODO"
  - file: "08_outcome_contract.json"
    id: "vsf-TEST-CFO-001.outcome_contract_bundle"
    type: "decision_package_bundle"
    version: "1.0.0"
    hash: "HASH_TODO"
  - file: "09_design_conformance_report.yaml"
    id: "vsf-TEST-CFO-001.design_conformance_report"
    type: "design_conformance_report"
    version: "1.0.0"
    hash: "HASH_TODO"
  - file: "README.md"
    id: "vsf-TEST-CFO-001.readme"
    type: "readme"
    version: "1.0.0"
    hash: "HASH_TODO"