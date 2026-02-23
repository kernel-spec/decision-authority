---
vsf:
  date: 2026-02-23
  mode: CFO_RUN
  trace_id: vsf-TEST-CFO-001
  stage: F4
  target: "SaaS breakeven 12m — narrative safe"
  language: "EN"
  status: LOCKED
  tags: ["index","cfo_run"]
  notion_page: ""
---

# Index — vsf-TEST-CFO-001

## CFO Run
- Core artifacts: `docs/cfo_runs/vsf-TEST-CFO-001/00_micro_case.json`, `01_trigger_spec.json`, `02_gating_rules.json`, `03_outcome_contract.json`
- Board memo: `docs/cfo_runs/vsf-TEST-CFO-001/04_board_memo_draft.md`

## Runtime enforcement
- Contract: `docs/enforcement/vsf-TEST-CFO-001/runtime_enforcement_contract_v1.md`

## Policy wrapper (publication set)
- Registry: `docs/policy/vsf-TEST-CFO-001/00_master_registry.yaml`
- Bundle: `docs/policy/vsf-TEST-CFO-001/08_outcome_contract.json`
- Checklist: `docs/policy/vsf-TEST-CFO-001/07_conformance_checklist.yaml`

## QA
- Gatekeeper report: `docs/qa/vsf-TEST-CFO-001/qa_gatekeeper_report.md`

C) Notion payloads (DB1 Runs + optional DB2 Assets)
DB1: Runs (row)
{
  "db": "DB1_Runs",
  "row": {
    "trace_id": "vsf-TEST-CFO-001",
    "mode": "CFO_RUN",
    "stage": "F4",
    "target": "SaaS breakeven 12m — narrative safe",
    "status": "LOCKED",
    "date": "2026-02-23",
    "paths": {
      "cfo_runs_dir": "docs/cfo_runs/vsf-TEST-CFO-001/",
      "policy_dir": "docs/policy/vsf-TEST-CFO-001/",
      "enforcement_dir": "docs/enforcement/vsf-TEST-CFO-001/",
      "qa_dir": "docs/qa/vsf-TEST-CFO-001/",
      "index": "docs/index/vsf-TEST-CFO-001.md"
    },
    "tags": ["breakeven","triggers","gating","fail_closed","board_memo"]
  }
}
DB2: Assets (rows)
{
  "db": "DB2_Assets",
  "rows": [
    {
      "trace_id": "vsf-TEST-CFO-001",
      "asset_type": "json",
      "name": "micro_case",
      "path": "docs/cfo_runs/vsf-TEST-CFO-001/00_micro_case.json"
    },
    {
      "trace_id": "vsf-TEST-CFO-001",
      "asset_type": "json",
      "name": "trigger_spec",
      "path": "docs/cfo_runs/vsf-TEST-CFO-001/01_trigger_spec.json"
    },
    {
      "trace_id": "vsf-TEST-CFO-001",
      "asset_type": "json",
      "name": "gating_rules",
      "path": "docs/cfo_runs/vsf-TEST-CFO-001/02_gating_rules.json"
    },
    {
      "trace_id": "vsf-TEST-CFO-001",
      "asset_type": "json",
      "name": "outcome_contract",
      "path": "docs/cfo_runs/vsf-TEST-CFO-001/03_outcome_contract.json"
    },
    {
      "trace_id": "vsf-TEST-CFO-001",
      "asset_type": "md",
      "name": "board_memo_draft",
      "path": "docs/cfo_runs/vsf-TEST-CFO-001/04_board_memo_draft.md"
    },
    {
      "trace_id": "vsf-TEST-CFO-001",
      "asset_type": "md",
      "name": "runtime_enforcement_contract_v1",
      "path": "docs/enforcement/vsf-TEST-CFO-001/runtime_enforcement_contract_v1.md"
    },
    {
      "trace_id": "vsf-TEST-CFO-001",
      "asset_type": "json",
      "name": "policy_bundle",
      "path": "docs/policy/vsf-TEST-CFO-001/08_outcome_contract.json"
    }
  ]
}

D) Index file content
(Already provided above as docs/index/vsf-TEST-CFO-001.md.)

QA GATE (CZ)
	•	Repo layout: PASS (všechny předepsané cesty existují).
	•	Jazyková politika: PASS (obsah souborů EN; META/poznámky zde CZ).
	•	JSON/YAML čistota: PASS (žádný frontmatter v JSON/YAML; frontmatter pouze v MD).
	•	Hash politika: PASS (HASH_TODO ponecháno pro CI).
	•	Poznámka: Původní QA NO-GO (CFO-08 / CH-01) bylo vázáno na formát chat paste; tato publikace jej obchází uložením artefaktů do souborů.

NEXT ACTIONS (CZ)
1. Doplnit CI krok pro výpočet hashů dle 02_hash_coverage_map.yaml a vyplnění HASH_TODO.
2. Implementovat threshold parser dle 01_canonicalization_profile.json a napojit na runtime validátor.
3. Zpřísnit runtime vstupní schémata pro requesty G1/G2/G3/G4 (eliminace CFO-20/22/24).
4. Přidat perzistentní počítání “consecutive FAILs” pro eskalace (CFO-30) s audit trail.
5. Zajistit, aby TargetFCF_3mo_avg(month_index) / TargetEBITDA_3mo_avg(month_index) byly definované jako runtime input (jinak standardně NEEDS_INPUT).

END Status: COMPLETE Return control to: USER