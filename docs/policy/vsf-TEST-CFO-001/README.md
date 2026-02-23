---
vsf:
  date: 2026-02-23
  mode: CFO_RUN
  trace_id: vsf-TEST-CFO-001
  stage: F4
  target: "SaaS breakeven 12m — narrative safe"
  language: "EN"
  status: LOCKED
  tags: ["policy","publication_set","governance"]
  notion_page: ""
---

# Governance Publication Set — vsf-TEST-CFO-001

## What this is
A deterministic, versioned, commit-ready publication set for CFO governance decision authority:
- micro_case
- trigger_spec
- gating_rules
- outcome_contract
- runtime enforcement contract (included)

## Files
- 00_master_registry.yaml — registry and pointers
- 01_canonicalization_profile.json — deterministic normalization rules (units, thresholds)
- 02_hash_coverage_map.yaml — what must be hashed for enforcement integrity
- 03_fail_closed_mapping.yaml — fail-closed behavior mapping
- 04_compatibility_policy.yaml — semver and breaking-change rules
- 05_reference_graph_policy.yaml — reference integrity requirements
- 06_decision_package_taxonomy.yaml — artifact taxonomy
- 07_conformance_checklist.yaml — machine-checkable conformance checks
- 08_outcome_contract.json — bundled artifacts + enforcement contract pointer + schemas
- 09_design_conformance_report.yaml — publication conformance report

## Enforcement note
Runtime behavior is governed by the published Runtime Enforcement Contract v1:
- Missing required inputs => NEEDS_INPUT
- Parsing/shape/semantic invalidity => REJECTED
- Any critical FAIL/UNKNOWN => DEFENSIVE (fail-closed)

## Hashing
All hash fields are set to HASH_TODO and should be computed in CI using the hash coverage map.
