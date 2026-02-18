import time
import sys
import os

# Ensure src modules are visible
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from src.core.simulation_env import CiviqEnv
from src.agents.baseline_agent import WardropAgent
from src.utils.metrics import MetricsLogger
from configs.config_loader import CONFIG 

def run_single_scenario(scenario_name, route_filename):
    """
    Runs a single simulation for a specific LOS scenario.
    """
    # 1. CHECK FILE EXISTENCE
    # Construct full path: map_path + route_filename
    map_folder = CONFIG['network']['map_path']
    full_route_path = os.path.join(map_folder, route_filename)
    
    if not os.path.exists(full_route_path):
        print(f"❌ ERROR: File not found: {full_route_path}")
        print("   Did you run duarouter?")
        return

    # 2. OVERRIDE CONFIG
    CONFIG['network']['route_file'] = route_filename
    
    print(f"\n==========================================")
    print(f">>> STARTING SCENARIO: {scenario_name.upper()}")
    print(f"    File: {route_filename}")
    print(f"==========================================")

    # 3. SET OUTPUT PATH (in data/ folder, alongside SUMO XML files)
    data_dir = os.path.join(map_folder, "data")
    os.makedirs(data_dir, exist_ok=True)
    csv_path = os.path.join(data_dir, f"baseline_results_{scenario_name}.csv")

    # 4. INITIALIZE
    env = CiviqEnv(scenario_name=scenario_name) 
    agent = WardropAgent()  
    logger = MetricsLogger()
    
    env.start()
    
    # 5. RUN (3600 Steps)
    max_steps = 3600
    start_time = time.time()
    
    for step in range(max_steps):
        env.step()
        agent.act(step)
        
        if step % 10 == 0:
            logger.log_step(step)
            
        if step % 1000 == 0:
            print(f"    Step {step}/{max_steps}...")

    end_time = time.time()
    
    # 6. SAVE
    logger.save_to_csv(csv_path)
    env.close()
    
    print(f"✅ {scenario_name.upper()} FINISHED. Saved to {csv_path}")

def run_full_experiment():
    print(">>> BATCH RUNNING: LOS A, C, E <<<")

    # The list of scenarios to run
    # Note: Pass just the filename, not the full path
    # (simulation_env.py will join it with map_folder)
    scenarios = [
        ("low",  "wardrop_routes_low.rou.xml"),
        ("med",  "wardrop_routes_med.rou.xml"),
        ("highEnough", "wardrop_routes_highEnough.rou.xml")
    ]

    for name, file_path in scenarios:
        run_single_scenario(name, file_path)

if __name__ == "__main__":
    run_full_experiment()
