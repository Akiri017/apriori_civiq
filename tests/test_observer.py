import time
import sys
import os

# Ensure we can find the src modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.core.simulation_env import CiviqEnv
from src.core.observer import CiviqObserver

def run_test():
    print("--- TESTING OBSERVER (THE EYES) ---")
    
    # 1. Start the Environment (Dev A's part)
    env = CiviqEnv()
    env.start()
    
    # 2. Initialize the Observer (Dev B's part)
    # This will try to load your scenarios/bgc_network.py file
    try:
        observer = CiviqObserver()
        print(f">>> SUCCESS: Observer initialized. Monitoring {len(observer.arteries)} arteries.")
    except Exception as e:
        print(f">>> CRITICAL ERROR: Could not initialize Observer. {e}")
        env.close()
        return

    print(">>> Running simulation for 200 steps to let traffic build up...")

    # 3. Simulation Loop
    for step in range(200):
        env.step()
        
        # Every 50 steps, check what the Observer sees
        if step > 0 and step % 50 == 0:
            # Get the data
            state = observer.get_arterial_state()
            
            # Check a specific road (e.g., 5th Avenue)
            # Format is [QueueLength, MeanSpeed]
            road_data = state.get("5th Avenue", [0, 0])
            queue = road_data[0]
            speed = road_data[1]
            
            print(f"[Step {step}] 5th Ave -> Queue: {queue} cars | Speed: {speed:.2f} m/s")
            
            # Additional check: If speed > 0, we know it's reading real data
            if speed > 0:
                print(f"   (✓) Verified: Real-time traffic data detected on 5th Avenue.")

    # 4. Cleanup
    env.close()
    print("--- TEST COMPLETE ---")

if __name__ == "__main__":
    run_test()
