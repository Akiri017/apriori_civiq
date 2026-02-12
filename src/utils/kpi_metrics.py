import os
import argparse
import xml.etree.ElementTree as ET

# python src/utils/analyze_metrics.py --scenario bgc_full --high
# python src/utils/analyze_metrics.py --scenario bgc_core --med
# python src/utils/analyze_metrics.py --scenario test_simple --low



def parse_tripinfo(file_path):  
    """Calculates Routing Effectiveness + Environmental Metrics"""
    if not os.path.exists(file_path):
        return None
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
        
        durations = []
        waiting_times = []
        co2_emissions = []
        fuel_consumption = []
        
        for trip in root.findall('tripinfo'):
            durations.append(float(trip.get('duration')))
            waiting_times.append(float(trip.get('waitingTime')))
            
            # LOOK FOR THE CHILD TAG
            emissions_tag = trip.find('emissions')
            
            if emissions_tag is not None:
                # SUMO returns mass in mg. 
                co2_mg = float(emissions_tag.get('CO2_abs', 0))
                fuel_mg = float(emissions_tag.get('fuel_abs', 0))
                
                # Convert CO2: mg -> grams
                co2_emissions.append(co2_mg / 1000.0)
                
                # Convert Fuel: mg -> Liters (Approx density of Gasoline ~745,000 mg/L)
                fuel_liters = fuel_mg / 745000.0
                fuel_consumption.append(fuel_liters)
            else:
                # Fallback if tag is missing (shouldn't happen now)
                co2_emissions.append(0)
                fuel_consumption.append(0)

        total_cars = len(durations)
        if total_cars == 0: return None

        return {
            "count": total_cars,
            "avg_travel": sum(durations) / total_cars,
            "avg_wait": sum(waiting_times) / total_cars,
            "avg_co2": sum(co2_emissions) / total_cars,    # grams per vehicle
            "total_co2": sum(co2_emissions) / 1000.0,      # Total kg for the swarm
            "avg_fuel": sum(fuel_consumption) / total_cars # Liters per vehicle
        }
    except ET.ParseError:
        return None

def parse_summary(file_path):
    """Calculates Throughput"""
    if not os.path.exists(file_path):
        return None
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
        # Get the last step recorded
        steps = root.findall('step')
        if not steps: return 0
        
        last_step = steps[-1]
        finished = float(last_step.get('ended'))
        time = float(last_step.get('time'))
        
        if time == 0: return 0
        return (finished / time) * 3600 # Vehicles per Hour
    except (ET.ParseError, IndexError):
        return None

def parse_stats(file_path):
    """Calculates Computational Load"""
    if not os.path.exists(file_path):
        return None
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
        perf = root.find('performance')
        if perf is not None:
            return {
                "rt_factor": float(perf.get('realTimeFactor')),
                "duration": float(perf.get('duration'))
            }
    except ET.ParseError:
        return None

def analyze_scenario(base_path, density_label):
    # --- UPDATED NAMING LOGIC HERE ---
    # Matches your file: data_selfish_high_tripinfo.xml
    trip_file = os.path.join(base_path, f"data_selfish_{density_label}_tripinfo.xml")
    sum_file  = os.path.join(base_path, f"data_selfish_{density_label}_summary.xml")
    stat_file = os.path.join(base_path, f"data_selfish_{density_label}_stats.xml")

    print(f"\n>>> ANALYZING: {density_label.upper()} DENSITY")
    
    # 1. Routing Metrics
    routing = parse_tripinfo(trip_file)
    if routing:
        print(f"   [Routing] Completed: {routing['count']} cars")
        print(f"   [Routing] Avg Travel Time:  {routing['avg_travel']:.2f} s")
        print(f"   [Routing] Avg Waiting Time: {routing['avg_wait']:.2f} s")
        print(f"   [Enviro]  Avg CO2 Emission: {routing['avg_co2']:.2f} g/veh")
        print(f"   [Enviro]  Avg Fuel Consump: {routing['avg_fuel']:.3f} L/veh")
        print(f"   [Enviro]  Total CO2 Output: {routing['total_co2']:.2f} kg")
    else:
        print(f"   [!] File Not Found or Empty: {trip_file}")

    # 2. Throughput
    throughput = parse_summary(sum_file)
    if throughput is not None:
        print(f"   [Network] Throughput:       {throughput:.0f} veh/hour")

    # 3. Scalability
    stats = parse_stats(stat_file)
    if stats:
        print(f"   [System]  Real-Time Factor: {stats['rt_factor']}x")
        print(f"   [System]  Compute Time:     {stats['duration']} ms")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", type=str, default="bgc_core")
    parser.add_argument("--high", action="store_true")
    parser.add_argument("--med", action="store_true")
    parser.add_argument("--low", action="store_true")
    parser.add_argument("--all", action="store_true")
    args = parser.parse_args()

    # Path: scenarios/bgc_core/data
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    data_path = os.path.join(base_dir, "scenarios", args.scenario, "data")

    print(f"Reading files from: {data_path}")

    if not os.path.exists(data_path):
        print(f"\n[Error] The folder '{data_path}' does not exist.")
        print("ACTION: Create a folder named 'data' inside 'bgc_core' and move your XML files there.")
        return

    # Default to running all if no specific flag is given
    run_all = args.all or (not args.high and not args.med and not args.low)
    
    if args.high or run_all: analyze_scenario(data_path, "high")
    if args.med or run_all:  analyze_scenario(data_path, "med")
    if args.low or run_all:  analyze_scenario(data_path, "low")
    
    print("\n" + "="*30)

if __name__ == "__main__":
    main()