# for selfish routing

# test_env.py
import sys
import os

# Add parent directory to path to find src module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.core.simulation_env import CiviqEnv
import time

def test_infrastructure():
    print("--- TESTING SIMULATION ENVIRONMENT ---")
    
    # 1. Initialize
    env = CiviqEnv()
    
    # 2. Start
    env.start()
    
    # 3. Run for 100 steps (Visual check)
    print("Running 100 steps...")
    for _ in range(100):
        env.step()
        # Optional: Slow down so you can see it moving
        # time.sleep(0.05) 
        
    print(f"Current Simulation Time: {env.get_time()} seconds")
    
    # 4. Test Reset (Critical for RL)
    print("Testing Reset functionality...")
    env.reset()
    
    if env.get_time() == 0:
        print(">>> SUCCESS: Simulation reset counter is 0.")
    else:
        print(">>> FAILURE: Reset did not zero out the clock.")
        
    # 5. Clean up
    env.close()
    print("--- TEST COMPLETE ---")

if __name__ == "__main__":
    test_infrastructure()
