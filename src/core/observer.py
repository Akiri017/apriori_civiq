# VERSION 1 OF OBSERVER


import traci
import sys
import os

# 1. Add the project root to the system path
# This allows Python to "see" the scenarios folder
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

# 2. Updated Import: Loading from scenarios/bgc_network.py
try:
    from scenarios.bgc_network import ROAD_NETWORK
    print(f">>> OBSERVER: Successfully loaded {len(ROAD_NETWORK)} arteries from scenarios/bgc_network.py")
except ImportError:
    print(">>> ERROR: Could not find 'bgc_network.py' in the 'scenarios' folder.")
    print(">>> ADVICE: Rename 'ROADNETWORK.txt' to 'bgc_network.py' and check the location.")
    sys.exit(1)

class CiviqObserver:
    def __init__(self):
        self.arteries = ROAD_NETWORK

    def get_arterial_state(self):
        """
        Scans the 18 major arteries and returns their current status.
        Returns: Dict { "RoadName": [QueueLength, MeanSpeed] }
        """
        state = {}
        
        for road_name, edge_list in self.arteries.items():
            total_queue = 0
            total_speed = 0
            valid_edges = 0
            
            for edge_id in edge_list:
                try:
                    # Queue: Number of cars with speed < 0.1 m/s
                    q = traci.edge.getLastStepHaltingNumber(edge_id)
                    # Speed: Average speed on the edge (m/s)
                    v = traci.edge.getLastStepMeanSpeed(edge_id)
                    
                    total_queue += q
                    
                    # SUMO returns -1 for speed if edge is empty
                    if v >= 0:
                        total_speed += v
                        valid_edges += 1
                        
                except traci.TraCIException:
                    continue
            
            # Average the speed across all segments
            avg_speed = total_speed / max(1, valid_edges)
            
            state[road_name] = [total_queue, avg_speed]
            
        return state