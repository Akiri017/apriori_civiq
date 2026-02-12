"""Metrics Module."""

import traci
import pandas as pd

class MetricsLogger:
    def __init__(self):
        self.data = []

    def log_step(self, step):
        """
        Captures global traffic stats for the current second.
        """
        total_wait = 0
        total_cars = 0
        
        try:
            # 1. Get list of all cars
            # Note: For large simulations, doing this every second is slow.
            # But for your baseline report, accuracy is more important than speed.
            veh_ids = traci.vehicle.getIDList()
            total_cars = len(veh_ids)
            
            # 2. Sum up waiting time (accumulated waiting time of all cars)
            # This is the standard metric for traffic optimization.
            for veh in veh_ids:
                total_wait += traci.vehicle.getAccumulatedWaitingTime(veh)
                
        except:
            pass
        
        # 3. Store in memory
        self.data.append({
            "step": step,
            "active_vehicles": total_cars,
            "total_system_wait": total_wait
        })

    def save_to_csv(self, filename="baseline_results.csv"):
        df = pd.DataFrame(self.data)
        df.to_csv(filename, index=False)
        print(f">>> METRICS: Saved {len(df)} rows of data to {filename}")
        return df
