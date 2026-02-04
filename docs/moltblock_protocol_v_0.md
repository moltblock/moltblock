# Moltblock Protocol v0.1

## 1. Overview

The Moltblock Protocol defines the minimum primitives required to create, evolve, and govern composite artificial intelligences called **Entities**.

This is a coordination protocol, not a model specification. OpenClaw is a key use case: Entities can act as a structured, verifiable backend for the assistant.

---

## 2. Core Primitives

### 2.1 Entity

An **Entity** is a persistent cognitive system with:
- Identity
- Constitution
- Agent Graph
- Memory
- Verification
- Governance

Entities are versioned over time.

---

### 2.2 Molt

A **Molt** is a state transition in which:
- internal agents may be removed, replaced, or added
- models may change
- strategies may evolve

Constraints:
- Identity persists
- Verified memory persists
- Constitution constraints remain unless explicitly amended

---

### 2.3 Artifact

An **Artifact** is any output produced by an Entity:
- claims
- code
- models
- proofs
- plans

Artifacts must be:
- signed by the Entity
- reproducible or testable
- attributable

---

### 2.4 Checkpoint

A **Checkpoint** is an immutable snapshot containing:
- Entity version
- Agent graph hash
- Memory hash
- Artifact references

Checkpoints enable rollback and auditability.

---

### 2.5 Governance

Governance defines:
- who can trigger a molt
- rate limits on self-modification
- human veto rules
- emergency shutdown conditions

Governance is enforced outside the cognitive loop.

---

## 3. Verification Requirement

No artifact becomes authoritative unless:
- independently reviewed by verifier agents
- tested using tools where applicable
- confidence thresholds are met

Verification failure blocks memory admission.

---

## 4. Inter-Entity Interaction

Entities do not share internal state.

They may exchange:
- signed artifacts
- test results
- checkpoints

Trust is based on verification, not belief.

---

## 5. Blockchain (Optional)

Blockchain MAY be used for:
- identity anchoring
- checkpoint immutability
- reputation

Blockchain MUST NOT be used for cognition or prompt routing.

---

## 6. Versioning

Protocol versions evolve via governance.

Backward compatibility is preferred but not guaranteed.

This is v0.1.
