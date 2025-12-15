# Civiq: MARL Traffic Control

A Hierarchical Multi-Agent Coordination Framework using QMIX for Urban Traffic Optimization.

## Project Overview
This research implements a 3-level Edge-Cloud architecture to solve computational scalability 
in dense urban traffic networks using Multi-Agent Reinforcement Learning (MARL).

**Target Environment:** Bonifacio Global City (BGC), Philippines

## Architecture
1. **Level 1:** Vehicle Agents (Local execution & observation)
2. **Level 2:** RSU Agents (Local mixing at 300m radius)
3. **Level 3:** Central Server (Global coordination)

## Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Run tests
pytest tests/
```

## Technology Stack
- **Simulation:** SUMO (Eclipse SUMO)
- **ML Framework:** PyTorch
- **Language:** Python 3.12+

## Citation
[Thesis details to be added]
