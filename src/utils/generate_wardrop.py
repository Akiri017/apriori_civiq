# src/utils/generate_wardrop.py
import os
import sys
import subprocess

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCENARIO_DIR = os.path.join(ROOT_DIR, "scenarios", "bgc_full")
MAP_FILE = os.path.join(SCENARIO_DIR, "final_map.net.xml")
TRIPS_FILE = os.path.join(SCENARIO_DIR, "trips_high.xml")
OUTPUT_FILE = os.path.join(SCENARIO_DIR, "wardrop_routes.rou.xml")

def run_marouter():
    print("==================================================")
    print("   GENERATING WARDROP EQUILIBRIUM ROUTES")
    print("==================================================")
    
    # Check if trips exist
    if not os.path.exists(TRIPS_FILE):
        sys.exit(f">>> ERROR: Input file missing: {TRIPS_FILE}\n>>> Run 'src/utils/generate_trips.py' first.")

    cmd = [
        "marouter",
        "-n", MAP_FILE,
        "-r", TRIPS_FILE,         # <--- FIXED: Use -r (Routes) instead of -d
        "-o", OUTPUT_FILE,
        "--assignment-method", "UE", 
        "--max-alternatives", "5",
        "--ignore-errors", "true",
        "--verbose", "true"
    ]
    
    print(f">>> Running SUMO marouter...")
    try:
        subprocess.run(cmd, check=True)
        print(f">>> SUCCESS: Intelligent routes saved to {OUTPUT_FILE}")
    except subprocess.CalledProcessError:
        print(f">>> ERROR: marouter failed.")

if __name__ == "__main__":
    run_marouter()