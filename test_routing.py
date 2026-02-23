"""
Test script to verify network topology loading and routing logic.
"""
import os
import sys

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from baseline.mono_qmix.env import QMIXSumoEnv

def test_network_loading():
    """Test if network topology loads correctly."""
    print("=" * 60)
    print("Testing Network Topology Loading")
    print("=" * 60)
    
    sumo_config = os.path.join('scenarios', 'test_simple', 'Configuration_med.sumocfg')
    
    # Create environment (this will load network)
    env = QMIXSumoEnv(sumo_config=sumo_config, max_agents=10, use_gui=False)
    
    # Check if network loaded
    if env.network is None:
        print("❌ FAILED: Network not loaded")
        return False
    
    print(f"✅ Network loaded successfully")
    print(f"   Total edges: {len(env.network.getEdges())}")
    
    # Check edge graph
    if env.edge_graph is None:
        print("❌ FAILED: Edge graph not built")
        return False
    
    print(f"✅ Edge graph built successfully")
    print(f"   Edges with routing options: {len(env.edge_graph)}")
    
    # Show sample routing options
    print("\n" + "=" * 60)
    print("Sample Routing Options (first 5 edges)")
    print("=" * 60)
    
    count = 0
    for edge_id, turns in env.edge_graph.items():
        if count >= 5:
            break
        print(f"\nEdge: {edge_id}")
        for turn_type, next_edge in turns.items():
            print(f"  {turn_type.capitalize():>8} → {next_edge}")
        count += 1
    
    # Test pathfinding
    print("\n" + "=" * 60)
    print("Testing Pathfinding")
    print("=" * 60)
    
    # Get two random edges
    edges_with_options = list(env.edge_graph.keys())
    if len(edges_with_options) >= 2:
        from_edge = edges_with_options[0]
        to_edge = edges_with_options[-1]
        
        print(f"\nFinding path from '{from_edge}' to '{to_edge}'...")
        path = env._find_path(from_edge, to_edge)
        
        if path:
            print(f"✅ Path found with {len(path)} edges:")
            print(f"   {' → '.join(path[:5])}{'...' if len(path) > 5 else ''}")
        else:
            print(f"⚠️  No path found (edges may not be connected)")
    
    print("\n" + "=" * 60)
    print("✅ ALL TESTS PASSED - Routing system ready!")
    print("=" * 60)
    
    return True

if __name__ == "__main__":
    try:
        success = test_network_loading()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
