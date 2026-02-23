# Monolithic QMIX-SUMO Integration Architecture Guide (Final Version)

This guide outlines the architecture for implementing the Monolithic QMIX baseline, focusing on the **Vehicle-as-Agent** paradigm to ensure a fair and direct comparison with the Civiq framework. This setup is designed for the 4x4 synthetic grid to empirically demonstrate the scalability limits of monolithic MARL.

## 1. Architectural Overview

The system adheres to the **Centralized Training, Decentralized Execution (CTDE)** paradigm. The key challenge addressed here is the **dynamic and large number of agents (vehicles)**, which forces the monolithic QMIX to operate at its computational limit.

| Component | Module | Responsibility |
| :--- | :--- | :--- |
| **Individual Agent Network** | `QMIX_Agent.py` | Computes the individual Q-value ($Q_a$) for each vehicle based on its local observation. |
| **Mixing Network** | `QMIX_Agent.py` | Combines all individual $Q_a$ values into a joint action-value function ($Q_{tot}$) using non-negative weights. |
| **SUMO Environment Wrapper** | `qmix_env.py` | Handles TraCI communication, manages the dynamic set of active vehicles, and calculates the global reward. |
| **Main Training Loop** | `main.py` | Orchestrates the training, manages the fixed `MAX_AGENTS` constraint, and logs the reward curve. |

## 2. State and Action Definition (Vehicle-as-Agent)

The definitions below are critical for proving the scalability point of the thesis.

### **2.1 Agent Definition and Constraint**

*   **Agent:** Every active vehicle in the simulation is an agent.
*   **Constraint:** The Monolithic QMIX network is initialized with a fixed size, **$N_{max}$ (e.g., 50)**. If the number of active vehicles exceeds $N_{max}$, the wrapper will ignore the excess vehicles, which serves as the empirical demonstration of the monolithic framework's scalability limit.

### **2.2 Global State ($s$) - The "God's Eye View"**

The global state is a vector used by the Mixing Network during training. It must contain information about the entire network to enable effective credit assignment.

$$s = [\text{Global Feature Vector}] \oplus [\text{Concatenated Local Observations}]$$

| Component | Detail |
| :--- | :--- |
| **Global Feature Vector** | Total number of active vehicles, average network speed, total network waiting time, and congestion level of all 16 intersections. |
| **Concatenated Local Observations** | All $N_{max}$ local observations ($o_1, o_2, \dots, o_{N_{max}}$) are flattened and concatenated. |

### **2.3 Joint Action ($u$) - Routing Decisions**

The action space is focused on **routing decisions** at junctions, which directly impacts the social optimum.

*   **Action Space ($A_i$ for vehicle $i$):**
    *   **0: Turn Left** (If valid at the next junction).
    *   **1: Go Straight** (If valid at the next junction).
    *   **2: Turn Right** (If valid at the next junction).
    *   *Note: Vehicles will execute the default SUMO driving model (acceleration/braking) between junctions.*

### **2.4 Global Reward ($r$) - Multi-Objective Optimization**

The reward is the single, shared signal for all agents, formalized to align with your thesis objectives:

$$r = - \alpha \cdot \sum_{i=1}^N W_i - \beta \cdot \sum_{i=1}^N T_i + \gamma \cdot \Phi$$

| Variable | Definition |
| :--- | :--- |
| **$W_i$ (Waiting Time)** | Cumulative time vehicle $i$ has been stationary ($v_i < 0.1$ m/s). |
| **$T_i$ (Travel Time)** | Total time elapsed since vehicle $i$ entered the network. |
| **$\Phi$ (Throughput)** | Total number of vehicles that have successfully reached their destination in the current step. |
| **$\alpha, \beta, \gamma$** | Hyperparameter weights used to balance the multi-objective optimization. |

## 3. Implementation Steps (Next Phases)

1.  **Develop `QMIX_Agent.py`:** Update the QMIX controller to handle the dynamic number of agents up to $N_{max}$ and the new state/action dimensions.
2.  **Implement `qmix_env.py`:** Create the environment wrapper to manage the TraCI connection, map vehicle IDs to fixed QMIX slots, and calculate the complex global reward.
3.  **Create `main.py`:** Set up the training loop and logging to capture the performance metrics.
