# Security Specification & Threat Model
## Sangkhlaburi Hospital Smart Workload & Workforce Assessment System

### 1. Data Invariants
1. **Daily Record ID Integrity**: Every daily record ID must follow standard naming (e.g. `sk-rec-YYYY-MM-DD` or alphanumeric hyphenated, <= 128 chars).
2. **Date Format & Immutability**: The record's date string must be non-empty and must not be tampered with in cross-date overwrites.
3. **Department Completeness**: A record must contain valid workload blocks for ER, OPD, IPD1, IPD2, and LR.
4. **Data Isolation & Accessibility**: Authorized hospital nurses and supervisors can read records for clinical decision-making, trend analysis, and duty handover.
5. **No Orphaned Records**: Deletions and updates must target explicit record IDs.
6. **Config Integrity**: The standard weights configuration must maintain valid numerical parameters for care hours.

### 2. The Dirty Dozen Attack Payloads
1. **Payload 1 (ID Injection)**: Attempt to inject a 100KB malicious path variable into `{recordId}`.
2. **Payload 2 (Ghost Field Attack)**: Sending a write with `isAdmin: true` or `_shadowPrivilege: 1`.
3. **Payload 3 (Empty Ward Data)**: Attempting to save a daily record missing required department structures.
4. **Payload 4 (Corrupted Staff Counts)**: Negative staff numbers or non-numeric types for on-duty nurses.
5. **Payload 5 (Cross-Hospital Tenant Injection)**: Attempting to attach another hospital's ID or untrusted external URL.
6. **Payload 6 (Oversized Documentation Text)**: Injecting 2MB payload into notes to execute Denial of Wallet attacks.
7. **Payload 7 (Arbitrary Collection Scraping)**: Attempting blanket queries on arbitrary collections.
8. **Payload 8 (Standard Weights Tampering)**: Setting ER triage1 time to negative numbers or NaN.
9. **Payload 9 (Test Document Pollution)**: Trying to write arbitrary arbitrary spam to `/test/{docId}`.
10. **Payload 10 (Type Poisoning on Counters)**: Submitting arrays or objects where number is expected in patient triage counts.
11. **Payload 11 (Unauthenticated Config Wipe)**: Malicious actor attempting to delete system standard weights without authorization.
12. **Payload 12 (Replay / Stale Modification)**: Overwriting existing daily logs without valid timestamp update.
