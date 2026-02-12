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
    # 1. IDENTIFY SCENARIO
    # We look at the route file in config to decide what to name the output
    route_file = CONFIG['network'].get('route_file', '')
    
    print("==================================================")
    print(f"   STARTING CIVIQ BASELINE")
    print(f"   Route File: {route_file}")
    print("==================================================")
    
    # Validation Check
    if "wardrop" not in route_file:
        print(">>> WARNING: Config does not point to a Wardrop route file.")
        print(f"    Current: {route_file}")
        print("    Proceeding anyway, but check your default_config.yaml!")
        time.sleep(2)

    # 2. DETERMINE OUTPUT FILENAME
    # If route file is 'wardrop_routes_med.rou.xml', output -> 'baseline_results_med.csv'
    # If route file is 'wardrop_routes_high.rou.xml', output -> 'baseline_results_high.csv'
    if "_med" in route_file:
        csv_name = "baseline_results_med.csv"
    elif "_high" in route_file:
        csv_name = "baseline_results_high.csv"
    elif "_low" in route_file:
        csv_name = "baseline_results_low.csv"
    else:
        csv_name = "baseline_results.csv" # Default fallback

    # 3. Initialize Components
    env = CiviqEnv()
    agent = WardropAgent()  
    logger = MetricsLogger()
    
    env.start()
    
    # 4. Run Simulation (3600 Steps = 1 Hour)
    max_steps = 3600
    start_time = time.time()
    
    for step in range(max_steps):
        env.step()
        agent.act(step)
        
        if step % 10 == 0:
            logger.log_step(step)
            
        if step % 500 == 0:
            print(f"... Simulating Step {step}/{max_steps}")

    end_time = time.time()
    print(f"\n>>> Simulation Finished in {end_time - start_time:.2f} seconds.")

    # 5. Save Results (Safely!)
    logger.save_to_csv(csv_name)
    env.close()
    
    print("==================================================")
    print("   ✅ BASELINE DATA GENERATED")
    print(f"   📂 Saved to: {csv_name}")  # <--- Verifies the safe filename
    print("==================================================")

if __name__ == "__main__":
    run_experiment()