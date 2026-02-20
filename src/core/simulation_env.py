"""Simulation Env Module."""

# VERSION 1 OF SIM_ENV

import traci
import sys
import os
from configs.config_loader import CONFIG

class CiviqEnv:
    def __init__(self, scenario_name="default"):
        self.step_count = 0
        self.connection_label = "civiq_sim"
        self.traci_conn = None
        self.scenario_name = scenario_name
        
        # 1. Resolve Map Path
        # We look for the .sumocfg file inside the map folder defined in YAML
        map_folder = CONFIG['network']['map_path']
        sumo_cfg = os.path.join(map_folder, "osm.sumocfg")
        
        if not os.path.exists(sumo_cfg):
             sys.exit(f">>> ERROR: osm.sumocfg not found in {map_folder}")

        # 1.5 Create data directory if it doesn't exist (for SUMO output files)
        data_dir = os.path.join(map_folder, "data")
        if not os.path.exists(data_dir):
            os.makedirs(data_dir)
            print(f">>> Created data directory: {data_dir}")

        # 2. Build Command from YAML settings
        # Use absolute paths for output files to avoid directory issues
        tripinfo_output = os.path.join(data_dir, f"tripinfo_{scenario_name}.xml")
        summary_output = os.path.join(data_dir, f"summary_{scenario_name}.xml")
        stats_output = os.path.join(data_dir, f"stats_{scenario_name}.xml")
        
        # Get the route file from CONFIG and resolve it to absolute path
        route_file = CONFIG['network'].get('route_file', '')
        if route_file:
            route_file = os.path.join(map_folder, route_file)
        
        self.sumo_cmd = [
            "sumo-gui",
            "-c", sumo_cfg,
            "--step-length", str(CONFIG['simulation']['step_length']),
            "--time-to-teleport", str(CONFIG['simulation']['teleport_time']),
            "--no-step-log", "true",
            "--start", "true",
            "--tripinfo-output", tripinfo_output,
            "--summary-output", summary_output,
            "--statistic-output", stats_output
        ]
        
        # Override route files from the config (this overrides what's in osm.sumocfg)
        if route_file:
            self.sumo_cmd.extend(["--route-files", route_file])

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