import os
import sys
import subprocess

# Setup Paths
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCENARIO_DIR = os.path.join(ROOT_DIR, "scenarios", "bgc_full")
MAP_FILE = os.path.join(SCENARIO_DIR, "final_map.net.xml")
<<<<<<< HEAD
=======
OUTPUT_FILE = os.path.join(SCENARIO_DIR, "wardrop_routes.rou.xml")
>>>>>>> 474b73e016da591880f557dd0ef53a9fb2d76c9e

def run_marouter(level="high"):
    print(f"==================================================")
    print(f"   GENERATING WARDROP ROUTES: {level.upper()} DENSITY")
    print(f"==================================================")
    
<<<<<<< HEAD
    # Dynamic Input and Output Filenames
    trips_filename = f"trips_{level}.xml"
    routes_filename = f"wardrop_routes_{level}.rou.xml"
    TRIPS_FILE = os.path.join(SCENARIO_DIR, trips_filename)
    OUTPUT_FILE = os.path.join(SCENARIO_DIR, routes_filename)
=======
    # Dynamic Input Filename
    trips_filename = f"trips_{level}.xml"
    TRIPS_FILE = os.path.join(SCENARIO_DIR, trips_filename)
>>>>>>> 474b73e016da591880f557dd0ef53a9fb2d76c9e
    
    # 1. Check if the raw trips exist
    if not os.path.exists(TRIPS_FILE):
        print(f">>> ERROR: Input file missing: {TRIPS_FILE}")
        print(f">>> SOLUTION: Run 'src/utils/generate_trips.py' with level='{level}' first.")
<<<<<<< HEAD
        return False

    # 2. Run marouter
=======
        sys.exit(1)

    # 2. Run marouter
    # Note: We overwrite 'wardrop_routes.rou.xml' regardless of level.
    # This means whatever you run last becomes the "Active" scenario.
>>>>>>> 474b73e016da591880f557dd0ef53a9fb2d76c9e
    cmd = [
        "marouter",
        "-n", MAP_FILE,
        "-r", TRIPS_FILE,
        "-o", OUTPUT_FILE,
<<<<<<< HEAD
        "--assignment-method", "SUE", 
=======
        "--assignment-method", "UE", 
>>>>>>> 474b73e016da591880f557dd0ef53a9fb2d76c9e
        "--max-alternatives", "5",
        "--ignore-errors", "true",
        "--verbose", "true"
    ]
    
    print(f">>> Running SUMO marouter on {trips_filename}...")
    try:
        subprocess.run(cmd, check=True)
        print(f">>> SUCCESS: Intelligent routes saved to {OUTPUT_FILE}")
<<<<<<< HEAD
        print(f">>> READY: {level.upper()} traffic scenario generated.\n")
        return True
    except subprocess.CalledProcessError:
        print(f">>> ERROR: marouter failed for {level}.\n")
        return False

if __name__ == "__main__":
    print("\n" + "="*60)
    print("   BATCH WARDROP ROUTE GENERATION")
    print("="*60 + "\n")
    
    # Run for all three scenarios in sequence
    scenarios = ["low", "med", "highEnough"]
    completed = 0
    failed = 0
    
    for scenario in scenarios:
        if run_marouter(scenario):
            completed += 1
        else:
            failed += 1
    
    # Summary
    print("="*60)
    print("   GENERATION COMPLETE")
    print("="*60)
    print(f"✅ Completed: {completed}/3")
    print(f"❌ Failed: {failed}/3\n")
    
    if completed == 3:
        print("All wardrop routes generated successfully!")
=======
        print(f">>> READY: The simulation will now run using {level.upper()} traffic.")
    except subprocess.CalledProcessError:
        print(f">>> ERROR: marouter failed.")

if __name__ == "__main__":
    # --- CHANGE THIS WORD TO "high", "med", or "low" ---
    run_marouter("high")
>>>>>>> 474b73e016da591880f557dd0ef53a9fb2d76c9e
