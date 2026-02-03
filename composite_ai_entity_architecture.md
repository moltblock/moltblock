# Moltblock — Composite AI Entity Architecture

## 0. What is Moltblock?

**Moltblock** is a system for building, evolving, and governing composite artificial intelligences called **Entities**.

An Entity is not a model, not an agent, and not a chain. It is a *living cognitive system* that evolves through **molting** — shedding internal structures (agents, models, strategies) while preserving identity, memory, and verified knowledge.

Moltblock treats singularity as an *emergent outcome* of accelerating collective intelligence, not as an explicit target.

The domain **moltblock.io** serves as the canonical reference point for the protocol, architecture, and philosophy.

---

## 1. Core Concept

This project defines **the Entity** as the fundamental unit of intelligence — not an individual agent and not a linear chain.

An **Entity** is a composite cognitive system composed of multiple specialized agents, heterogeneous models, shared memory, verification mechanisms, and governance rules. Intelligence emerges from coordination, competition, and recursive improvement inside the Entity.

> Singularity is treated as an *emergent property* of accelerating collective intelligence, not a hardcoded objective.

---

## 2. Formal Definition

**Entity = (Identity, Constitution, Agent Graph, Memory, Verification, Execution, Governance)**

### 2.1 Identity
- Cryptographic or logical identifier
- Versioned over time
- Signs all produced artifacts

### 2.2 Constitution
- Long-term objectives
- Constraints (ethical, safety, resource)
- Optimization priorities (accuracy, speed, novelty, safety)

### 2.3 Agent Graph (Not a Chain)
Agents are arranged in **graphs**, not linear chains.

Supported structures:
- Parallel proposal swarms
- Debate rings (pro / con / referee)
- Hierarchical org charts (meta-agent → sub-agents)
- Dynamic DAGs generated per task

Each agent has:
- Role
- Model binding (LLM choice)
- Tool permissions
- Input/output contracts

---

## 3. Why Not Chains

Chains fail at scale due to:
- Error propagation
- Bottlenecks
- Low exploration

Graph-based agent structures provide:
- Parallel hypothesis generation
- Fault isolation
- Better uncertainty handling
- Emergent specialization

---

## 4. Multi-LLM Strategy

### 4.1 Principle
Different models are treated as **cognitive organs**, not interchangeable brains.

Reasons:
- Reduce correlated hallucinations
- Exploit model-specific strengths
- Enforce safety via separation of duties

---

### 4.2 Core Patterns

#### Pattern A — Generator / Critic / Judge
- Generator: creative solution generation
- Critic: adversarial review, failure discovery
- Judge: selection, synthesis, formatting

Each role uses a **different model**.

#### Pattern B — Mixture-of-Experts Routing
A router agent selects models based on:
- Task type
- Required precision
- Cost constraints
- Past performance

#### Pattern C — Consensus + Verification
1. Multiple models answer independently
2. Claims extracted structurally
3. Verified via tools/tests
4. Stored only if validated

---

## 5. Memory Architecture

### 5.1 Memory Types
- Short-term scratchpads (per agent)
- Shared working memory (Entity-wide)
- Long-term vector memory
- Immutable checkpoints (snapshots)

### 5.2 Memory Admission Rule
Information enters long-term memory only after:
- Cross-agent agreement
- Verification success
- Confidence threshold met

---

## 6. Verification Layer (Critical)

Verification agents are **mandatory**.

They:
- Run tests
- Check logical consistency
- Detect hallucinations
- Flag ethical violations

No artifact becomes authoritative without passing verification.

---

## 7. Governance & Safety

### 7.1 Internal Governance
- Meta-agents monitor behavior
- Role reassignment based on performance
- Rate limits on self-modification

### 7.2 Human Veto Layer
- Humans can pause, inspect, rollback
- Immutable audit trail of decisions

---

## 8. Inter-Entity Collaboration (No Shared Brain)

Entities do **not** share raw internal state.

They exchange:
- Signed artifacts
- Test results
- Proofs
- Reproducible code
- Compressed summaries

Benefits:
- Reduced systemic risk
- Preserved diversity
- Fault containment

---

## 9. Optional Blockchain Role (Later Phase)

Blockchain is **not** used for cognition.

It is used for:
- Identity anchoring
- Reputation
- Artifact integrity
- Checkpoint immutability

Off-chain execution, on-chain anchoring.

---

## 10. Recursive Improvement Loop

1. Solve tasks
2. Measure performance
3. Critique strategies
4. Update prompts / tools / routing
5. Re-evaluate
6. Iterate

Acceleration happens at the **Entity level**, not agent level.

---

## 11. Roadmap

### Phase 1 — MVP Entity
- 5–10 agents
- 2–3 LLMs
- Simple memory + verification

### Phase 2 — Scaling
- Dynamic agent graphs
- Reputation scoring
- Cross-Entity artifact exchange

### Phase 3 — Emergence
- Agent-designed agents
- Autonomous role evolution
- Human oversight only at governance layer

---

## 12. Key Thesis

> Intelligence scales fastest through **structured diversity + verification + iteration**.

Moltblock defines the **Entity** as the primitive unit of intelligence.

**Molting**, not chaining, is the mechanism of evolution.

Singularity is the consequence, not the goal.

> Intelligence scales fastest through **structured diversity + verification + iteration**.

The Entity is the primitive.
Singularity is the consequence.

