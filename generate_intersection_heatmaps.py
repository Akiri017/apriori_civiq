#!/usr/bin/env python3
"""
Generate heatmaps based on proximity to intersections.
Edges near intersections appear reddish (congested).
Edges far from intersections appear greener (free-flowing).
"""

import xml.etree.ElementTree as ET
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection
from matplotlib.colors import Normalize
import os
from pathlib import Path

# Configuration
BGC_FULL_PATH = "scenarios/bgc_full"
NET_FILE = f"{BGC_FULL_PATH}/final_map.net.xml"
OUTPUT_DIR = "heatmap_output/bgc_full_intersection_based"

# Traffic level config: (traffic level, intensity multiplier)
LEVELS = [
    ("low", 0.4),   # Less red, more green
    ("high", 1.0),  # More red, less green
]


def parse_network(net_file):
    """Extract edges and junctions from network file."""
    tree = ET.parse(net_file)
    root = tree.getroot()
    
    edges = {}
    junctions = {}
    
    # Parse junctions
    for junction in root.findall(".//junction"):
        junction_id = junction.get("id")
        x = float(junction.get("x"))
        y = float(junction.get("y"))
        junctions[junction_id] = (x, y)
    
    # Parse edges
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
                    # Calculate edge center
                    center = (
                        np.mean([c[0] for c in coords]),
                        np.mean([c[1] for c in coords])
                    )
                    edges[edge_id] = {
                        "coords": coords,
                        "center": center
                    }
    
    print(f"✓ Parsed network: {len(edges)} edges, {len(junctions)} junctions")
    return edges, junctions


def calculate_intersection_distance(edges, junctions):
    """Calculate distance from each edge to nearest intersection."""
    edge_distances = {}
    
    for edge_id, edge_data in edges.items():
        center = edge_data["center"]
        
        # Find minimum distance to any junction
        min_dist = float('inf')
        for junction_id, junction_pos in junctions.items():
            dist = np.sqrt((center[0] - junction_pos[0])**2 + (center[1] - junction_pos[1])**2)
            min_dist = min(min_dist, dist)
        
        edge_distances[edge_id] = min_dist
    
    return edge_distances


def calculate_congestion_from_distance(distances, intensity_multiplier):
    """
    Convert intersection proximity to congestion.
    Close to intersection = high congestion (red)
    Far from intersection = low congestion (green)
    """
    edge_congestion = {}
    
    # Normalize distances
    min_dist = min(distances.values()) if distances else 0
    max_dist = max(distances.values()) if distances else 1
    dist_range = max_dist - min_dist if max_dist > min_dist else 1
    
    # Expert congestion based on distance: closer to junction = more congested
    max_congestion = 0.9  # Don't use full 1.0 for cleaner color
    
    for edge_id, dist in distances.items():
        # Normalize to 0-1 (0 = at junction, 1 = farthest away)
        norm_dist = (dist - min_dist) / dist_range
        
        # Invert: closer to junction = higher congestion
        # Use exponential decay: edges right at junctions very congested, drops off quickly
        congestion = max_congestion * (1.0 - norm_dist) ** 2
        
        # Apply intensity multiplier (for low/high traffic)
        congestion = congestion * intensity_multiplier
        
        edge_congestion[edge_id] = min(congestion, 1.0)
    
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
    print("INTERSECTION-BASED HEATMAP GENERATOR - BGC FULL")
    print("="*70)
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Parse network
    print("\n📊 Parsing network...")
    edges, junctions = parse_network(NET_FILE)
    
    # Calculate distances to intersections
    print("\n📍 Calculating proximity to intersections...")
    distances = calculate_intersection_distance(edges, junctions)
    
    dist_stats = {
        "min": min(distances.values()),
        "max": max(distances.values()),
        "mean": np.mean(list(distances.values()))
    }
    print(f"  - Distance range: {dist_stats['min']:.1f} - {dist_stats['max']:.1f} m")
    print(f"  - Mean distance: {dist_stats['mean']:.1f} m")
    
    # Generate heatmaps for each traffic level
    print("\n🎨 Generating heatmaps...")
    
    for level, intensity in LEVELS:
        print(f"\n  {level.upper()} traffic (intensity: {intensity}):")
        
        # Calculate congestion based on intersection proximity
        edge_congestion = calculate_congestion_from_distance(distances, intensity)
        
        # Get statistics
        congestion_values = list(edge_congestion.values())
        avg_congestion = np.mean(congestion_values)
        max_congestion = np.max(congestion_values)
        
        print(f"    - Average congestion: {avg_congestion:.3f}")
        print(f"    - Max congestion: {max_congestion:.3f}")
        
        # Generate heatmap
        output_path = f"{OUTPUT_DIR}/heatmap_{level}.png"
        generate_heatmap(edges, edge_congestion, output_path)
    
    print("\n" + "="*70)
    print(f"Generated {len(LEVELS)} heatmaps in: {OUTPUT_DIR}")
    print("="*70 + "\n")


if __name__ == "__main__":
    main()
