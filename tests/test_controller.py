import sys
import os

# Add parent directory to path to find src module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.core.simulation_env import CiviqEnv
from src.core.controller import CiviqController
import traci
import time

def test_hands():
    print("--- TESTING CONTROLLER (THE HANDS) ---")
    
    # 1. Start Simulation
    env = CiviqEnv()
    env.start()
    
    # 2. Initialize Controller
    controller = CiviqController()
    
    if not controller.tls_ids:
        print(">>> ERROR: No traffic lights found in the map!")
        env.close()
        return

    # Pick the first traffic light found in the map to test
    test_tls = controller.tls_ids[0]
    print(f"Testing Control on Junction: {test_tls}")

    # 3. Run Simulation Loop
    for step in range(100):
        env.step()
        
        # At step 50, FORCE a phase switch
        if step == 50:
            old_phase = traci.trafficlight.getPhase(test_tls)
            print(f"[Step 50] Current Phase: {old_phase}. Applying Action 1 (Switch)...")
            
            # THE CRITICAL LINE: This calls your new class
            controller.apply_action(test_tls, 1)
            
            new_phase = traci.trafficlight.getPhase(test_tls)
            print(f"[Step 50] New Phase: {new_phase}")
            
            if new_phase != old_phase:
                print(">>> SUCCESS: Traffic Light changed phase!")
            else:
                print(">>> FAILURE: Traffic Light ignored the command.")

    env.close()
    print("--- TEST COMPLETE ---")

if __name__ == "__main__":
    test_hands()
