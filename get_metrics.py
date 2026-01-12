import os
import argparse
import xml.etree.ElementTree as ET

# --- CONFIGURATION ---
# These must match the filenames defined in your .sumocfg <output> section
TRIPINFO_FILE = "data_selfish_tripinfo.xml"
SUMMARY_FILE  = "data_selfish_summary.xml"
STATS_FILE    = "data_selfish_stats.xml"

def get_routing_metrics(scenario_path):
    file_path = os.path.join(scenario_path, TRIPINFO_FILE)
    
    if not os.path.exists(file_path):
        print(f"[!] Warning: Could not find {TRIPINFO_FILE} in {scenario_path}")
        return

    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
        
        durations = []
        waiting_times = []
        time_loss = []
        
        for trip in root.findall('tripinfo'):
            durations.append(float(trip.get('duration')))
            waiting_times.append(float(trip.get('waitingTime')))
            time_loss.append(float(trip.get('timeLoss')))
            
        total_cars = len(durations)
        if total_cars == 0:
            print("   -> No cars finished yet.")
            return

        avg_travel_time = sum(durations) / total_cars
        avg_waiting_time = sum(waiting_times) / total_cars
        avg_time_loss = sum(time_loss) / total_cars
        
        print("-" * 40)
        print(f"METRIC 1: ROUTING EFFECTIVENESS (Selfish Baseline)")
        print("-" * 40)
        print(f"Total Vehicles Completed: {total_cars}")
        print(f"Average Travel Time:      {avg_travel_time:.2f} s")
        print(f"Average Waiting Time:     {avg_waiting_time:.2f} s")
        print(f"Average Time Loss:        {avg_time_loss:.2f} s (Delay due to traffic)")
        
    except ET.ParseError:
        print(f"[!] Error: Could not parse {TRIPINFO_FILE}. Is the simulation finished?")

def get_throughput_metrics(scenario_path):
    file_path = os.path.join(scenario_path, SUMMARY_FILE)
    
    if not os.path.exists(file_path):
        # Optional: Not critical, so we just skip if missing
        return

    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
        
        # Get the very last step recorded to see total finished
        last_step = root.findall('step')[-1]
        finished = float(last_step.get('ended'))
        time = float(last_step.get('time'))
        
        throughput_per_hour = (finished / time) * 3600
        
        print(f"Network Throughput:       {throughput_per_hour:.0f} vehicles/hour")

    except (ET.ParseError, IndexError):
        pass

def get_computational_metrics(scenario_path):
    file_path = os.path.join(scenario_path, STATS_FILE)
    
    if not os.path.exists(file_path):
        print(f"[!] Warning: Could not find {STATS_FILE}")
        return

    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
        perf = root.find('performance')
        
        print("\n" + "-" * 40)
        print(f"METRIC 2: COMPUTATIONAL SCALABILITY")
        print("-" * 40)
        if perf is not None:
            duration_ms = float(perf.get('duration'))
            rt_factor = float(perf.get('realTimeFactor'))
            
            print(f"Real-Time Factor:         {rt_factor}x (Higher is faster)")
            print(f"Total Computation Time:   {duration_ms} ms ({duration_ms/1000:.2f} s)")
        else:
            print("   -> No performance data found.")
            
    except ET.ParseError:
        print(f"[!] Error: Could not parse {STATS_FILE}")

def main():
    parser = argparse.ArgumentParser(description="Extract Thesis Metrics from SUMO XML outputs.")
    
    # This allows you to type: python get_metrics.py --scenario bgc_core
    parser.add_argument("--scenario", type=str, default="bgc_core", 
                        help="Folder name inside /scenarios (e.g., bgc_core, bgc_full, test_simple)")
    
    args = parser.parse_args()
    
    # Construct the full path dynamically
    base_dir = os.path.dirname(os.path.abspath(__file__))
    scenario_path = os.path.join(base_dir, "scenarios", args.scenario)
    
    print(f"\nAnalyzing Scenario: [{args.scenario}]")
    print(f"Path: {scenario_path}\n")
    
    if not os.path.exists(scenario_path):
        print(f"[!] Error: The folder '{args.scenario}' does not exist in /scenarios.")
        return

    get_routing_metrics(scenario_path)
    get_throughput_metrics(scenario_path)
    get_computational_metrics(scenario_path)
    print("\n" + "="*40 + "\n")

if __name__ == "__main__":
    main()