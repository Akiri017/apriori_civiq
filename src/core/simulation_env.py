"""Simulation Env Module."""

# VERSION 1 OF SIM_ENV

import traci
import sys
import os
from configs.config_loader import CONFIG

class CiviqEnv:
    def __init__(self):
        self.step_count = 0
        self.connection_label = "civiq_sim"
        self.traci_conn = None
        
        # 1. Resolve Map Path
        # We look for the .sumocfg file inside the map folder defined in YAML
        map_folder = CONFIG['network']['map_path']
        sumo_cfg = os.path.join(map_folder, "osm.sumocfg")
        
        if not os.path.exists(sumo_cfg):
             sys.exit(f">>> ERROR: osm.sumocfg not found in {map_folder}")

        # 2. Build Command from YAML settings
        self.sumo_cmd = [
            "sumo-gui",
            "-c", sumo_cfg,
            "--step-length", str(CONFIG['simulation']['step_length']),
            "--time-to-teleport", str(CONFIG['simulation']['teleport_time']),
            "--no-step-log", "true",
            "--start", "true"
        ]

    def start(self):
        try:
            traci.start(self.sumo_cmd, label=self.connection_label)
            self.traci_conn = traci.getConnection(self.connection_label)
            print(f">>> CIVIQ ENV: Simulation Initialized (Duration: {CONFIG['simulation']['duration']}s)")
        except traci.FatalTraCIError:
            sys.exit(">>> FATAL ERROR: SUMO failed to start.")

    def step(self):
        try:
            self.traci_conn.simulationStep()
            self.step_count += 1
        except traci.FatalTraCIError:
            print(">>> CONNECTION LOST.")

    def get_time(self):
        """Get the current simulation time in seconds."""
        try:
            return self.traci_conn.simulation.getTime()
        except traci.FatalTraCIError:
            print(">>> CONNECTION LOST.")
            return None

    def close(self):
        try:
            traci.close()
        except:
            pass

    def reset(self):
        self.close()
        self.step_count = 0
        self.start()