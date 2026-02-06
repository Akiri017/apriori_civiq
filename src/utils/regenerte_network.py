import xml.etree.ElementTree as ET
import os
import pprint
import sys

# Setup Paths
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MAP_FILE = os.path.join(ROOT_DIR, "scenarios", "bgc_full", "final_map.net.xml")
OUTPUT_FILE = os.path.join(ROOT_DIR, "scenarios", "bgc_network.py")

# EXCLUSION LIST (Pedestrian areas or non-car roads)
BLACKLIST = [
    "Bonifacio High Street", 
    "Serendra", 
    "Track 30th", 
    "Terra 28th"
]

def generate_map():
    print(f"--- REGENERATING NETWORK FROM: {MAP_FILE} ---")
    
    if not os.path.exists(MAP_FILE):
        sys.exit(f"Error: Could not find map file at {MAP_FILE}")

    tree = ET.parse(MAP_FILE)
    root = tree.getroot()
    
    road_database = {}
    
    # Iterate through every edge in the FINAL map
    for edge in root.findall('edge'):
        edge_id = edge.get('id')
        
        # 1. Skip Internal Junction Edges (:)
        if edge_id.startswith(":"):
            continue
            
        # 2. Find the Street Name
        # SUMO hides names in 'param' tags or the 'name' attribute
        name = edge.get('name')
        
        # If 'name' attribute is missing, look in child parameters
        if not name:
            for param in edge.findall('param'):
                if param.get('key') in ["name", "osm_name", "streetName"]:
                    name = param.get('value')
                    break
        
        # 3. Validation & Filtering
        if name:
            # Clean up weird OSM characters
            name = name.replace("&amp;", "&").strip()
            
            # Skip Blacklisted roads (Pedestrian zones)
            if name in BLACKLIST:
                continue
                
            # Skip short/weird names (garbage data)
            if len(name) < 3 or name.isdigit():
                continue

            # Add to database
            if name not in road_database:
                road_database[name] = []
            road_database[name].append(edge_id)

    print(f">>> Found {len(road_database)} named arteries.")
    
    # 4. Save to Python File
    with open(OUTPUT_FILE, "w") as f:
        f.write("# AUTOMATICALLY GENERATED FROM final_map.net.xml\n")
        f.write("# DO NOT EDIT MANUALLY IF MAP CHANGES\n\n")
        f.write("ROAD_NETWORK = ")
        f.write(pprint.pformat(road_database, indent=4))
        f.write("\n")
        
    print(f">>> SUCCESS: New map saved to {OUTPUT_FILE}")
    print(">>> You can now run 'test_observer.py' again.")

if __name__ == "__main__":
    generate_map()