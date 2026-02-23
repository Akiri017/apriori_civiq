"""
Simple standalone test for network topology loading (no torch dependency).
"""
import os
import sys
import sumolib
import math
import xml.etree.ElementTree as ET

def load_network_from_config(sumo_config):
    """Load network file from SUMO config."""
    config_dir = os.path.dirname(sumo_config)
    
    tree = ET.parse(sumo_config)
    root = tree.getroot()
    
    net_file = None
    for input_elem in root.findall('.//net-file'):
        net_file = input_elem.get('value')
        break
    
    if net_file is None:
        raise ValueError("No network file found in config")
    
    if not os.path.isabs(net_file):
        net_file = os.path.join(config_dir, net_file)
    
    return sumolib.net.readNet(net_file)

def build_edge_graph(network):
    """Build edge connectivity graph with turn classifications."""
    edge_graph = {}
    
    for edge in network.getEdges():
        edge_id = edge.getID()
        
        if edge.isSpecial():
            continue
        
        outgoing = edge.getOutgoing()
        if not outgoing:
            continue
        
        from_node = edge.getFromNode()
        to_node = edge.getToNode()
        
        edge_vector = (
            to_node.getCoord()[0] - from_node.getCoord()[0],
            to_node.getCoord()[1] - from_node.getCoord()[1]
        )
        edge_angle = math.atan2(edge_vector[1], edge_vector[0])
        
        turns = {}
        
        for next_edge, connections in outgoing.items():
            next_edge_id = next_edge.getID()
            
            if next_edge.isSpecial():
                continue
            
            next_to_node = next_edge.getToNode()
            next_vector = (
                next_to_node.getCoord()[0] - to_node.getCoord()[0],
                next_to_node.getCoord()[1] - to_node.getCoord()[1]
            )
            next_angle = math.atan2(next_vector[1], next_vector[0])
            
            turn_angle = math.degrees(next_angle - edge_angle)
            
            while turn_angle > 180:
                turn_angle -= 360
            while turn_angle < -180:
                turn_angle += 360
            
            if -45 <= turn_angle <= 45:
                turn_type = 'straight'
            elif turn_angle > 45:
                turn_type = 'left'
            else:
                turn_type = 'right'
            
            if turn_type not in turns:
                turns[turn_type] = next_edge_id
        
        edge_graph[edge_id] = turns
    
    return edge_graph

def main():
    print("=" * 70)
    print("Testing Network Topology Loading for QMIX Route Modification")
    print("=" * 70)
    
    sumo_config = os.path.join('scenarios', 'test_simple', 'Configuration_med.sumocfg')
    
    print(f"\n📁 Loading config: {sumo_config}")
    
    # Load network
    network = load_network_from_config(sumo_config)
    print(f"✅ Network loaded")
    print(f"   Total edges: {len(network.getEdges())}")
    print(f"   Total nodes: {len(network.getNodes())}")
    
    # Build edge graph
    edge_graph = build_edge_graph(network)
    print(f"\n✅ Edge graph built")
    print(f"   Edges with routing options: {len(edge_graph)}")
    
    # Count turn types
    left_count = sum(1 for turns in edge_graph.values() if 'left' in turns)
    straight_count = sum(1 for turns in edge_graph.values() if 'straight' in turns)
    right_count = sum(1 for turns in edge_graph.values() if 'right' in turns)
    
    print(f"\n📊 Turn Statistics:")
    print(f"   Edges with LEFT option:     {left_count}")
    print(f"   Edges with STRAIGHT option: {straight_count}")
    print(f"   Edges with RIGHT option:    {right_count}")
    
    # Show sample routing options
    print("\n" + "=" * 70)
    print("Sample Routing Options (first 10 edges)")
    print("=" * 70)
    
    count = 0
    for edge_id, turns in edge_graph.items():
        if count >= 10:
            break
        if turns:  # Only show edges with options
            print(f"\n🛣️  Edge: {edge_id}")
            for turn_type in ['left', 'straight', 'right']:
                if turn_type in turns:
                    print(f"   {turn_type.capitalize():>8} → {turns[turn_type]}")
            count += 1
    
    print("\n" + "=" * 70)
    print("✅ SUCCESS - Network topology ready for dynamic routing!")
    print("=" * 70)
    print("\n💡 Your agents can now make LEFT/STRAIGHT/RIGHT decisions dynamically")
    print("   just like selfish routing, but with cooperative learning!")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
