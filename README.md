# Civiq: A Hierarchical Multi-Agent Coordination Framework using QMIX for Urban Traffic Optimization 

![Python](https://img.shields.io/badge/Python-3.12%2B-blue)
![PyTorch](https://img.shields.io/badge/PyTorch-2.0%2B-orange)
![SUMO](https://img.shields.io/badge/Simulator-Eclipse%20SUMO-green)
![Status](https://img.shields.io/badge/Status-Research%20Preview-lightgrey)

> **Thesis:** Scalable Multi-Agent Coordination in Dense Urban Networks via Hierarchical QMIX.

## 📖 Abstract
**Civiq** is a research framework investigating the application of Multi-Agent Reinforcement Learning (MARL) to solve traffic congestion in high-density urban environments. 

This repository houses the implementation of a **3-Level Hierarchical Edge-Cloud Architecture**, designed to overcome the computational scalability limits of centralized traffic signal control. By utilizing **QMIX** for value decomposition, the system coordinates local vehicle actions with global network objectives. The primary testing ground is a realistic, scale model of **Bonifacio Global City (BGC), Philippines**.

## 🏗️ System Architecture



The framework operates on a tiered decentralization model to balance latency and global optimality:

| Tier | Agent Type | Scope | Responsibility |
| :--- | :--- | :--- | :--- |
| **Level 1** | **Vehicle Agents** | Local (Individual) | Micro-maneuvers (lane change, acceleration) based on immediate observation. |
| **Level 2** | **RSU Agents** | Edge (300m Radius) | Aggregates local vehicle states and performs mixing of local Q-values. |
| **Level 3** | **Central Server** | Cloud (Global) | Global coordination, model updates, and optimization of the joint global Q-value ($Q_{tot}$). |

## 🗺️ Environment: BGC Network
The simulation utilizes real-world road network topology extracted from OpenStreetMap (OSM) for Bonifacio Global City.
* **Total Junctions:** [Insert Number]
* **Total Road Length:** [Insert km]
* **Traffic Demand:** Calibrated using hourly traffic flow data (peak vs. off-peak).

## 🚀 Getting Started

### Prerequisites
* **Python 3.12+**
* **Eclipse SUMO:** Ensure SUMO is installed and `SUMO_HOME` is set in your environment variables.
    * *Linux:* `sudo add-apt-repository ppa:sumo/stable && sudo apt-get install sumo sumo-tools sumo-doc`
    * *Windows:* [Download Installer](https://sumo.dlr.de/docs/Downloads.php)

### Installation
1.  **Clone the repository**
    ```bash
    git clone https://github.com/Akiri017/apriori_civiq.git
    cd apriori_civiq
    ```

2.  **Create a Virtual Environment**
    ```bash
    python -m venv venv
    source venv/bin/activate  # Windows: venv\Scripts\activate
    ```

3.  **Install Dependencies**
    ```bash
    pip install -r requirements.txt
    ```

## 💻 Usage

### 1. Training the Agents
To start a training session on the BGC map with default hyperparameters:
```bash
python src/main.py --mode train --map bgc_full --epochs 100
```

### 2. Evaluating Performance
To visualize the trained model in the SUMO GUI:
```bash
python src/main.py --mode eval --load_model outputs/models/checkpoint_latest.pt --gui
```

### 3. Running Unit Tests
Ensure agent logic and environment wrappers are functioning correctly:
```bash
pytest tests/
```

## 📂 Repository Structure
```
civiq-thesis/
├── configs/           # Hyperparameters (YAML)
├── docs/              # Thesis documentation and diagrams
├── scenarios/         # SUMO network files (.net.xml) and routes
├── src/               # Source code for Agents, Core Envs, and Networks
├── tests/             # Pytest unit tests
└── outputs/           # Training logs and model checkpoints (ignored by git)
```

## 🤝 Citation
If you use this code for your research, please cite:

```
Santos, M., Bautista, K., Letada, A., Pascual, M. (2026). 
Civiq: A Hierarchical Multi-Agent Coordination Framework using QMIX for Urban Traffic 
[Unpublished Bachelor's thesis]. Far Eastern University Institute of Technology.
```

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.