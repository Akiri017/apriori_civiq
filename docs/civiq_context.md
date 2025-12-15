# Civiq: Technical Context & Architecture Standards

## 1. Project Overview
[cite_start]**Goal:** Develop "Civiq," a Hierarchical Multi-Agent Coordination Framework using QMIX for Urban Traffic Optimization[cite: 18].
[cite_start]**Core Innovation:** Restructuring QMIX into a 3-level Edge-Cloud architecture to solve the computational scalability of Monolithic QMIX in dense urban networks[cite: 30, 34, 37].
[cite_start]**Target Environment:** Bonifacio Global City (BGC), Philippines (2 km² OSM Model).

## 2. The Hierarchy (Strict Architecture Rules)
The system MUST adhere to these three levels. Do not merge them.

### [cite_start]Level 1: Vehicle Agents (The Players) [cite: 50, 51]
* **Role:** Local execution & observation.
* **Hardware:** Represents a vehicle with an On-Board Unit (OBU).
* **Input:** Local observation (current speed, destination, immediate surroundings).
* **Output:** "Utility Score" (Q-value) for intended actions.
* [cite_start]**Constraint:** "Selfish Routing" paradigm applies if no coordination exists (Wardrop Equilibrium)[cite: 22, 23].

### [cite_start]Level 2: RSU Agents (The Squad Leaders) [cite: 52, 53]
* **Role:** Local Mixing & Edge Computing.
* **Scope (Crucial):**
    * **Radius:** **300 meters** (DSRC/802.11p Standard Effective Range).
    * **Squad Definition:** All vehicles currently within this 300m radius are part of this RSU's "Squad."
* **Function:**
    1.  **Aggregates** Q-values from all vehicles in its 300m radius.
    2.  [cite_start]**Executes** a Local QMIX calculation to optimize the "Squad Utility"[cite: 56, 57].
* **Output:** A compressed state representation sent to the Central Server.

### [cite_start]Level 3: Central Server (The Global Coordinator) [cite: 58, 59]
* **Role:** Global Optimization.
* **Function:**
    1.  Coordinates the RSUs (not individual vehicles).
    2.  [cite_start]Runs the Global QMIX network to minimize **Total Network Travel Time** (Social Optimum)[cite: 24, 60].
* [cite_start]**Constraint:** Must manage the "Scalability Gap" by only processing aggregated RSU data, not raw vehicle data[cite: 32, 38].

## 3. Technology Stack Constraints
* [cite_start]**Simulation:** SUMO (Eclipse SUMO) via TraCI API[cite: 39, 40].
* **ML Framework:** PyTorch (for QMIX implementation).
* [cite_start]**Network Map:** BGC (Bonifacio Global City) extracted from OSM[cite: 89].
* **Language:** Python 3.12.1

## 4. Simulation & Data Standards
* [cite_start]**Traffic Generation (Level of Service):** 
    * To test robustness, simulations must run under three distinct densities:
        1.  **Free Flow** (Low Density)
        2.  **Stable Flow** (Medium Density)
        3.  **Forced/Jammed Flow** (High Density - Stress Test)
* **Vehicle Physics:**
    * [cite_start]Use SUMO defaults (Krauss Model, minGap, sigma) to ensure a fair baseline comparison[cite: 96, 97].
* **Communication Layer:**
    * **Assumption:** Ideal Communication Channel. [cite_start]Do not model packet loss or signal latency (Out of Scope).

## [cite_start]5. Experimental Baselines [cite: 86]
The Civiq framework must be compared against:
1.  **Baseline 1: Selfish Routing** (Standard SUMO behavior/Wardrop Equilibrium).
2.  [cite_start]**Baseline 2: Monolithic QMIX** (Centralized approach, expected to be slow/infeasible at >1000 agents)[cite: 30, 41].

## 6. Development Phases
* **Phase 1:** Environment Setup (SUMO + BGC Map + Cleaning).
* **Phase 2:** Connectivity (Python controlling SUMO via TraCI).
* **Phase 3:** Logic Implementation (The Hierarchy & RSU Scoping).
* **Phase 4:** QMIX Integration (PyTorch).