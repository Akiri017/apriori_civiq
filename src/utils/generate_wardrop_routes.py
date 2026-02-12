import os
import sys
import subprocess

# Setup Paths
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCENARIO_DIR = os.path.join(ROOT_DIR, "scenarios", "bgc_full")
MAP_FILE = os.path.join(SCENARIO_DIR, "final_map.net.xml")
OUTPUT_FILE = os.path.join(SCENARIO_DIR, "wardrop_routes.rou.xml")

def run_marouter(level="high"):
    print(f"==================================================")
    print(f"   GENERATING WARDROP ROUTES: {level.upper()} DENSITY")
    print(f"==================================================")
    
    # Dynamic Input Filename
    trips_filename = f"trips_{level}.xml"
    TRIPS_FILE = os.path.join(SCENARIO_DIR, trips_filename)
    
    # 1. Check if the raw trips exist
    if not os.path.exists(TRIPS_FILE):
        print(f">>> ERROR: Input file missing: {TRIPS_FILE}")
        print(f">>> SOLUTION: Run 'src/utils/generate_trips.py' with level='{level}' first.")
        sys.exit(1)

    # 2. Run marouter
    # Note: We overwrite 'wardrop_routes.rou.xml' regardless of level.
    # This means whatever you run last becomes the "Active" scenario.
    cmd = [
        "marouter",
        "-n", MAP_FILE,
        "-r", TRIPS_FILE,
        "-o", OUTPUT_FILE,
        "--assignment-method", "UE", 
        "--max-alternatives", "5",
        "--ignore-errors", "true",
        "--verbose", "true"
    ]
    
    print(f">>> Running SUMO marouter on {trips_filename}...")
    try:
        subprocess.run(cmd, check=True)
        print(f">>> SUCCESS: Intelligent routes saved to {OUTPUT_FILE}")
        print(f">>> READY: The simulation will now run using {level.upper()} traffic.")
    except subprocess.CalledProcessError:
        print(f">>> ERROR: marouter failed.")

if __name__ == "__main__":
    # --- CHANGE THIS WORD TO "high", "med", or "low" ---
    run_marouter("high")