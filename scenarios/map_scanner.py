import xml.etree.ElementTree as ET
import os

def scan_map_names():
    print(">>> UNIVERSAL SCANNER: Reading map file...")
    
    filename = "final_map.net.xml"
    if not os.path.exists(filename):
        print("ERROR: final_map.net.xml not found.")
        return

    tree = ET.parse(filename)
    root = tree.getroot()
    
    road_dict = {}
    found_count = 0
    
    for edge in root.findall('edge'):
        edge_id = edge.get('id')
        if edge_id.startswith(":"): continue # Skip internal junctions

        # 1. CHECK THE ATTRIBUTE (The fix!)
        name = edge.get('name') 
        
        # 2. If not in attribute, check parameters
        if not name:
            for param in edge.findall('param'):
                if param.get('key') in ["name", "streetName", "osm_name"]:
                    name = param.get('value')
                    break
        
        # 3. Filter "Junk" names
        if name and len(name) > 2 and not name.isdigit():
            # Clean up weird characters sometimes found in OSM
            name = name.replace("&amp;", "&").strip()
            
            if name not in road_dict:
                road_dict[name] = []
            road_dict[name].append(edge_id)
            found_count += 1

    print(f"\n>>> SUCCESS: Extracted {len(road_dict)} unique road names.")
    print("-" * 50)
    
    # Print the code for your thesis
    print("ROAD_NETWORK = {")
    # Sort by most segments to find the 'Main' roads
    sorted_roads = sorted(road_dict.items(), key=lambda x: len(x[1]), reverse=True)
    
    for name, edges in sorted_roads[:20]: # Only show top 20 busiest roads
        print(f'    "{name}": {edges},')
    print("}")
    print("-" * 50)

if __name__ == "__main__":
    scan_map_names()
