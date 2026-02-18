#!/usr/bin/env python3
"""
Generate heatmaps using actual simulation data from tripinfo and routes files.
Calculates real edge-level congestion based on vehicle traffic and waiting times.
"""

import xml.etree.ElementTree as ET
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection
from matplotlib.colors import Normalize
import os
from pathlib import Path

# Configuration
BGC_FULL_PATH = "scenarios/bgc_full"
NET_FILE = f"{BGC_FULL_PATH}/final_map.net.xml"
LEVELS = {
    "low": {
        "routes": f"{BGC_FULL_PATH}/wardrop_routes_low.rou.xml",
        "tripinfo": f"{BGC_FULL_PATH}/data/tripinfo_low.xml",
    },
    "med": {
        "routes": f"{BGC_FULL_PATH}/wardrop_routes_med.rou.xml",
        "tripinfo": f"{BGC_FULL_PATH}/data/tripinfo_med.xml",
    },
    "high": {
        "routes": f"{BGC_FULL_PATH}/wardrop_routes_highEnough.rou.xml",
        "tripinfo": f"{BGC_FULL_PATH}/data/tripinfo_highEnough.xml",
    },
}
OUTPUT_DIR = "heatmap_output/bgc_full_actual"


def parse_network(net_file):
    """Extract edge coordinates from network file."""
    tree = ET.parse(net_file)
    root = tree.getroot()
    
    edges = {}
    for edge in root.findall(".//edge"):
        edge_id = edge.get("id")
        if edge_id.startswith(":"):  # Skip junction edges
            continue
        
        # Get lane geometry
        lanes = edge.findall("lane")
        if lanes:
            lane = lanes[0]
            shape_str = lane.get("shape", "")
            if shape_str:
                coords = [tuple(map(float, coord.split(","))) for coord in shape_str.split()]
                if coords:
                    # Store edge with its coordinates
                    edges[edge_id] = {
                        "coords": coords,
                        "center": (
                            np.mean([c[0] for c in coords]),
                            np.mean([c[1] for c in coords])
                        )
                    }
    
    print(f"✓ Parsed network: {len(edges)} edges")
    return edges


def parse_routes(routes_file):
    """Extract vehicle routes from routes file."""
    tree = ET.parse(routes_file)
    root = tree.getroot()
    
    routes = {}
    for vehicle in root.findall(".//vehicle"):
        vehicle_id = vehicle.get("id")
        
        # Get the first route (highest probability)
        route_elem = vehicle.find(".//route")
        if route_elem is not None:
            edges_str = route_elem.get("edges", "")
            edge_list = edges_str.split()
            routes[vehicle_id] = edge_list
    
    print(f"✓ Parsed routes: {len(routes)} vehicles")
    return routes


def parse_tripinfo(tripinfo_file):
    """Extract vehicle waiting times from tripinfo file."""
    tree = ET.parse(tripinfo_file)
    root = tree.getroot()
    
    wait_times = {}
    for tripinfo in root.findall(".//tripinfo"):
        vehicle_id = tripinfo.get("id")
        waiting_time = float(tripinfo.get("waitingTime", 0))
        wait_times[vehicle_id] = waiting_time
    
    print(f"✓ Parsed tripinfo: {len(wait_times)} vehicles")
    return wait_times


def calculate_edge_congestion(routes, wait_times, edges_data):
    """
    Calculate congestion for each edge based on:
    - Number of vehicles using the edge
    - Total waiting time on the edge
    - Edge length
    """
    edge_congestion = {}
    edge_vehicle_count = {}
    edge_wait_sum = {}
    
    # Count vehicle passages and collect waiting time data
    for vehicle_id, edge_list in routes.items():
        vehicle_wait = wait_times.get(vehicle_id, 0)
        
        # Distribute this vehicle's waiting time across all edges in its route
        if edge_list and vehicle_wait > 0:
            wait_per_edge = vehicle_wait / len(edge_list) if edge_list else 0
        else:
            wait_per_edge = 0
        
        for edge_id in edge_list:
            edge_vehicle_count[edge_id] = edge_vehicle_count.get(edge_id, 0) + 1
            edge_wait_sum[edge_id] = edge_wait_sum.get(edge_id, 0) + wait_per_edge
    
    # Calculate congestion metric for each edge
    # Congestion = (vehicle_count * vehicle_intensity) + (accumulated_wait_time * wait_intensity)
    max_vehicles = max(edge_vehicle_count.values()) if edge_vehicle_count else 1
    max_wait = max(edge_wait_sum.values()) if edge_wait_sum else 1
    
    for edge_id in edges_data.keys():
        vehicle_norm = edge_vehicle_count.get(edge_id, 0) / max_vehicles if max_vehicles > 0 else 0
        wait_norm = edge_wait_sum.get(edge_id, 0) / max_wait if max_wait > 0 else 0
        
        # Combined metric: weight vehicle density more heavily
        congestion = 0.7 * vehicle_norm + 0.3 * wait_norm
        edge_congestion[edge_id] = congestion
    
    print(f"  - Calculated congestion for {len(edge_congestion)} edges")
    print(f"  - Max vehicle count on single edge: {max_vehicles}")
    print(f"  - Max wait sum on single edge: {max_wait:.1f}")
    
    return edge_congestion


def get_network_bounds(edges):
    """Get bounding box of the network."""
    all_x = [center[0] for data in edges.values() for center in [data["center"]]]
    all_y = [center[1] for data in edges.values() for center in [data["center"]]]
    return min(all_x), max(all_x), min(all_y), max(all_y)


def generate_heatmap(edges, edge_congestion, output_path):
    """Generate and save heatmap."""
    # Prepare line segments
    line_segments = []
    colors = []
    
    cmap = plt.cm.RdYlGn_r
    norm = Normalize(vmin=0, vmax=1)
    
    for edge_id, edge_data in edges.items():
        coords = edge_data["coords"]
        congestion = edge_congestion.get(edge_id, 0)
        
        # Create line segments for this edge
        for i in range(len(coords) - 1):
            line_segments.append([coords[i], coords[i + 1]])
            colors.append(cmap(norm(congestion)))
    
    # Create plot
    fig, ax = plt.subplots(figsize=(20, 20), dpi=50)
    
    # Create line collection
    lc = LineCollection(line_segments, colors=colors, linewidths=2)
    ax.add_collection(lc)
    
    # Set bounds
    xmin, xmax, ymin, ymax = get_network_bounds(edges)
    margin = (xmax - xmin) * 0.05
    ax.set_xlim(xmin - margin, xmax + margin)
    ax.set_ylim(ymin - margin, ymax + margin)
    ax.set_aspect('equal')
    
    # Remove axes
    ax.axis('off')
    
    # Save
    plt.savefig(output_path, dpi=150, bbox_inches='tight', pad_inches=0, 
                facecolor='white', edgecolor='none')
    plt.close()
    
    file_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"  ✓ Saved: {output_path} ({file_size:.1f} MB)")


def main():
    print("\n" + "="*70)
    print("SUMO NETWORK ACTUAL HEATMAP GENERATOR - BGC FULL")
    print("="*70)
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Parse network once
    print("\n📊 Parsing network...")
    edges = parse_network(NET_FILE)
    
    # Process each traffic level
    print("\n📈 Calculating edge-level congestion...")
    congestion_stats = {}
    
    for level, files in LEVELS.items():
        print(f"\n  Processing {level.upper()} traffic level:")
        
        # Parse routes and tripinfo
        routes = parse_routes(files["routes"])
        wait_times = parse_tripinfo(files["tripinfo"])
        
        # Calculate real edge congestion
        edge_congestion = calculate_edge_congestion(routes, wait_times, edges)
        
        # Get statistics
        congestion_values = list(edge_congestion.values())
        avg_congestion = np.mean(congestion_values)
        max_congestion = np.max(congestion_values)
        min_congestion = np.min(congestion_values)
        
        congestion_stats[level] = {
            "avg": avg_congestion,
            "max": max_congestion,
            "min": min_congestion
        }
        
        print(f"  - Congestion range: {min_congestion:.3f} - {max_congestion:.3f}")
        print(f"  - Average congestion: {avg_congestion:.3f}")
        
        # Generate heatmap
        print(f"\n🎨 Generating {level.upper()} heatmap...")
        output_path = f"{OUTPUT_DIR}/heatmap_{level}.png"
        generate_heatmap(edges, edge_congestion, output_path)
    
    # Print summary
    print("\n" + "="*70)
    print("RESULTS SUMMARY")
    print("="*70)
    
    for level, stats in congestion_stats.items():
        avg_pct = stats["avg"] * 100
        print(f"{level.upper():6s} traffic: {avg_pct:5.1f}% avg congestion")
    
    print(f"\nGenerated heatmaps in: {OUTPUT_DIR}")
    print("="*70 + "\n")


if __name__ == "__main__":
    main()
