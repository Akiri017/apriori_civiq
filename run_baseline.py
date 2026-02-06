import time
import sys
import os

# Ensure src modules are visible
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from src.core.simulation_env import CiviqEnv
from src.agents.baseline_agent import WardropAgent
from src.utils.metrics import MetricsLogger
from configs.config_loader import CONFIG 

def run_experiment():
    print("==================================================")
    print("   STARTING CIVIQ MONTH 1 BASELINE (WARDROP)")
    print("==================================================")
    
    # Validation Check
    if "wardrop" not in CONFIG['network'].get('route_file', ''):
        print(">>> WARNING: Your config does not seem to point to 'wardrop_routes.rou.xml'.")
        print(f"    Current setting: {CONFIG['network'].get('route_file')}")
        print("    Are you sure you updated default_config.yaml?")
        time.sleep(3) # Give user time to read warning

    # 1. Initialize Components
    env = CiviqEnv()
    agent = WardropAgent()  # Using the passive agent
    logger = MetricsLogger()
    
    env.start()
    
    # 2. Run Simulation (3600 Steps = 1 Hour)
    max_steps = 3600
    start_time = time.time()
    
    for step in range(max_steps):
        # A. Step Physics
        env.step()
        
        # B. Agent Act (Does nothing, but keeps architecture consistent)
        agent.act(step)
        
        # C. Log Data (Every 10 seconds)
        if step % 10 == 0:
            logger.log_step(step)
            
        # Optional: Print progress
        if step % 500 == 0:
            print(f"... Simulating Step {step}/{max_steps}")

    end_time = time.time()
    print(f"\n>>> Simulation Finished in {end_time - start_time:.2f} seconds.")

    # 3. Save Results
    logger.save_to_csv("baseline_results.csv")
    env.close()
    
    print("==================================================")
    print("   ✅ BASELINE DATA GENERATED SUCCESSFULLY")
    print("   📂 File: baseline_results.csv")
    print("==================================================")

if __name__ == "__main__":
    run_experiment()