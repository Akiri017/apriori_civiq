import os
import sys
import traci
import sumolib
import numpy as np
import math
from collections import defaultdict

from .state_builder import SumoStateBuilder

class QMIXSumoEnv:
    """
    SUMO Environment Wrapper for Monolithic QMIX (Vehicle-as-Agent).
    Handles the 4x4 synthetic grid and manages a fixed number of agent slots.
    Implements the architecture spec from mono_qmix_architecture.md
    """
    def __init__(self, sumo_config, max_agents=50, alpha=1.0, beta=0.1, gamma=10.0, use_gui=True):
        self.sumo_config = sumo_config
        self.max_agents = max_agents
        self.alpha = alpha  # Weight for Waiting Time
        self.beta = beta    # Weight for Travel Time
        self.gamma = gamma  # Weight for Throughput
        self.use_gui = use_gui
        
        # Track junction IDs for congestion monitoring
        self.junction_ids = []
        
        # State builder (reusable component)
        self.state_builder = SumoStateBuilder(
            max_agents=max_agents,
            obs_shape=4,
            n_junctions=16
        )
        
        # Observation and State shapes (per architecture spec)
        # Obs: [speed, dist_to_junction, lane_id_encoded, leader_dist]
        self.obs_shape = 4 
        # State: [global_stats (5 + 16 junctions)] + [concatenated_obs (max_agents * obs_shape)]
        self.state_shape = 21 + (max_agents * self.obs_shape)
        self.n_actions = 3  # [Left, Straight, Right]
        
        self.sumo_binary = sumolib.checkBinary('sumo-gui' if use_gui else 'sumo')
        self.step_count = 0
        self.throughput_count = 0
        
        # Load network topology for intelligent routing
        self.network = None
        self.edge_graph = None  # Will store edge connectivity and turn classifications
        self._load_network_topology()

    def reset(self):
        """Reset the SUMO simulation and return initial state/obs."""
        # Robustly close any existing connection
        try:
            if self.step_count > 0:
                traci.close()
        except Exception:
            # Force close if connection is in bad state
            try:
                traci.close(wait=False)
            except Exception:
                pass  # Connection already closed or invalid
            
        # Start SUMO with teleport disabled to prevent vehicles from disappearing
        traci.start([
            self.sumo_binary, 
            "-c", self.sumo_config, 
            "--no-step-log", "true", 
            "--waiting-time-memory", "1000",
            "--time-to-teleport", "-1",  # Disable teleportation
            "--no-warnings", "true"  # Reduce noise in output
        ])
        self.step_count = 0
        self.throughput_count = 0
        self.state_builder.reset()
        
        # Get junction IDs from the network (for 4x4 grid)
        if not self.junction_ids:
            # Get all traffic light junctions
            all_junctions = traci.trafficlight.getIDList()
            # For 4x4 grid, we expect 16 junctions
            self.junction_ids = sorted(all_junctions)[:16] if len(all_junctions) >= 16 else sorted(all_junctions)
        
        # Step simulation once to allow initial vehicles to spawn
        traci.simulationStep()
        
        return self._get_state_and_obs()

    def step(self, actions):
        """
        Apply actions to vehicles, step simulation, and return next state, obs, and reward.
        actions: list of integers of length max_agents
        """
        # 1. Get active vehicles and update agent slots FIRST
        active_vehicles = traci.vehicle.getIDList()
        self.state_builder.update_agent_slots(active_vehicles)
        
        # 2. Apply actions to vehicles currently in the map
        for vid in active_vehicles:
            if vid in self.state_builder.agent_id_map:
                slot = self.state_builder.agent_id_map[vid]
                action = actions[slot]
                self._apply_routing_action(vid, action)
        
        # 3. Step simulation
        traci.simulationStep()
        self.step_count += 1
        
        # 4. Track throughput (vehicles that arrived)
        arrived_list = traci.simulation.getArrivedIDList()
        self.throughput_count = len(arrived_list)
        
        # 5. Get current active vehicles after step
        active_vehicles_after = traci.vehicle.getIDList()
        
        # 6. Get next state, obs, and reward
        next_state, next_obs = self._get_state_and_obs()
        reward = self._calculate_global_reward(active_vehicles_after)
        
        done = self.step_count >= 3600 # 1 hour simulation limit
        
        return next_state, next_obs, reward, done

    def _apply_routing_action(self, vid, action):
        """Map discrete actions to SUMO routing commands with proper topology awareness.
        Actions: 0=Left, 1=Straight, 2=Right
        
        Uses network topology to:
        1. Get valid outgoing edges from current position
        2. Classify turns as left/straight/right based on angles
        3. Generate complete valid routes to destinations
        4. Only apply routes that SUMO will accept
        """
        if self.network is None or self.edge_graph is None:
            return  # Network not loaded yet
            
        try:
            # Get vehicle's current edge
            route = traci.vehicle.getRoute(vid)
            route_index = traci.vehicle.getRouteIndex(vid)
            
            if route_index >= len(route):
                return  # Vehicle at destination
                
            current_edge_id = route[route_index]
            
            # Get possible next edges with turn classifications
            possible_turns = self.edge_graph.get(current_edge_id, {})
            
            if not possible_turns:
                return  # No alternatives available
            
            # Select edge based on action
            chosen_edge_id = None
            
            if action == 0 and 'left' in possible_turns:
                chosen_edge_id = possible_turns['left']
            elif action == 1 and 'straight' in possible_turns:
                chosen_edge_id = possible_turns['straight']
            elif action == 2 and 'right' in possible_turns:
                chosen_edge_id = possible_turns['right']
            
            if chosen_edge_id is None:
                return  # Action not available for this edge
            
            # Get vehicle's original destination (last edge in route)
            original_dest = route[-1]
            
            # Find a complete path from chosen_edge to a valid destination
            try:
                # Try to route to original destination through chosen edge
                new_route_segment = self._find_path(chosen_edge_id, original_dest)
                
                if new_route_segment:
                    # Build complete route: current + chosen + path to destination
                    new_route = list(route[:route_index+1]) + new_route_segment
                    traci.vehicle.setRoute(vid, new_route)
                else:
                    # If can't reach original destination, find any reachable destination
                    alternate_dest = self._find_reachable_destination(chosen_edge_id)
                    if alternate_dest:
                        new_route_segment = self._find_path(chosen_edge_id, alternate_dest)
                        if new_route_segment:
                            new_route = list(route[:route_index+1]) + new_route_segment
                            traci.vehicle.setRoute(vid, new_route)
                            
            except traci.exceptions.TraCIException:
                pass  # Route invalid, vehicle keeps original route
                
        except Exception:
            pass  # Any error, skip action

    def _get_state_and_obs(self):
        """Extract observations for all vehicles and construct the global state.
        Uses SumoStateBuilder for reusable state construction.
        """
        active_vehicles = traci.vehicle.getIDList()
        
        # Delegate to state builder
        global_state, all_obs = self.state_builder.build_flat_state(
            active_vehicles=active_vehicles,
            junction_ids=self.junction_ids,
            throughput_count=self.throughput_count,
            step_count=self.step_count,
            max_steps=3600
        )
        
        return global_state, all_obs
    
    def _calculate_global_reward(self, active_vehicles):
        """
        Calculate the multi-objective global reward:
        r = - alpha * sum(Wait) - beta * sum(TravelTime) + gamma * Throughput
        """
        total_wait = 0.0
        total_travel_time = 0.0
        
        # Get current simulation time
        current_time = traci.simulation.getTime()
        
        for vid in active_vehicles:
            try:
                # Waiting time
                total_wait += traci.vehicle.getWaitingTime(vid)
                
                # Travel time: current_time - departure_time
                departure_time = traci.vehicle.getDeparture(vid)
                
                # Handle vehicles that haven't departed yet (departure_time == -1)
                if departure_time >= 0:
                    travel_time = current_time - departure_time
                    total_travel_time += travel_time
                    
            except Exception:
                pass  # Vehicle disappeared, skip
            
        reward = - (self.alpha * total_wait) - (self.beta * total_travel_time) + (self.gamma * self.throughput_count)
        return reward / 1000.0  # Scaling for stability

    def close(self):
        """Close the SUMO connection safely."""
        try:
            traci.close()
        except Exception:
            pass  # Already closed or invalid connection
    
    def _load_network_topology(self):
        """Load SUMO network and build edge connectivity graph with turn classifications."""
        try:
            # Extract network file path from config
            config_dir = os.path.dirname(self.sumo_config)
            
            # Parse the config file to get network file
            import xml.etree.ElementTree as ET
            tree = ET.parse(self.sumo_config)
            root = tree.getroot()
            
            net_file = None
            for input_elem in root.findall('.//net-file'):
                net_file = input_elem.get('value')
                break
            
            if net_file is None:
                print("Warning: Could not find network file in config. Route modification disabled.")
                return
            
            # Make path absolute
            if not os.path.isabs(net_file):
                net_file = os.path.join(config_dir, net_file)
            
            if not os.path.exists(net_file):
                print(f"Warning: Network file not found: {net_file}. Route modification disabled.")
                return
            
            # Load network
            self.network = sumolib.net.readNet(net_file)
            
            # Build edge graph with turn classifications
            self.edge_graph = self._build_edge_graph()
            
            print(f"Network topology loaded: {len(self.edge_graph)} edges with routing options")
            
        except Exception as e:
            print(f"Warning: Failed to load network topology: {e}. Route modification disabled.")
            self.network = None
            self.edge_graph = None
    
    def _build_edge_graph(self):
        """Build a graph of edge connections with turn classifications (left/straight/right)."""
        edge_graph = {}
        
        for edge in self.network.getEdges():
            edge_id = edge.getID()
            
            # Skip internal edges (junctions)
            if edge.isSpecial():
                continue
            
            outgoing = edge.getOutgoing()
            
            if not outgoing:
                continue
            
            # Get edge direction vector
            from_node = edge.getFromNode()
            to_node = edge.getToNode()
            
            edge_vector = (
                to_node.getCoord()[0] - from_node.getCoord()[0],
                to_node.getCoord()[1] - from_node.getCoord()[1]
            )
            edge_angle = math.atan2(edge_vector[1], edge_vector[0])
            
            # Classify each outgoing edge
            turns = {}
            
            for next_edge, connections in outgoing.items():
                next_edge_id = next_edge.getID()
                
                # Skip internal edges
                if next_edge.isSpecial():
                    continue
                
                # Get next edge direction
                next_to_node = next_edge.getToNode()
                next_vector = (
                    next_to_node.getCoord()[0] - to_node.getCoord()[0],
                    next_to_node.getCoord()[1] - to_node.getCoord()[1]
                )
                next_angle = math.atan2(next_vector[1], next_vector[0])
                
                # Calculate turn angle (-180 to 180 degrees)
                turn_angle = math.degrees(next_angle - edge_angle)
                
                # Normalize to -180 to 180
                while turn_angle > 180:
                    turn_angle -= 360
                while turn_angle < -180:
                    turn_angle += 360
                
                # Classify turn (with some tolerance)
                if -45 <= turn_angle <= 45:
                    turn_type = 'straight'
                elif turn_angle > 45:
                    turn_type = 'left'
                else:
                    turn_type = 'right'
                
                # Store best option for each turn type (prefer first found)
                if turn_type not in turns:
                    turns[turn_type] = next_edge_id
            
            edge_graph[edge_id] = turns
        
        return edge_graph
    
    def _find_path(self, from_edge_id, to_edge_id, max_depth=10):
        """Find a path between two edges using BFS.
        
        Args:
            from_edge_id: Starting edge
            to_edge_id: Destination edge
            max_depth: Maximum path length to search
            
        Returns:
            List of edge IDs forming the path (including from_edge and to_edge),
            or None if no path found
        \"\"\"\n        if from_edge_id == to_edge_id:
            return [from_edge_id]
        
        # BFS to find shortest path
        from collections import deque
        
        queue = deque([(from_edge_id, [from_edge_id])])
        visited = {from_edge_id}
        
        while queue:
            current_edge, path = queue.popleft()
            
            if len(path) > max_depth:
                continue
            
            # Get all outgoing edges
            outgoing = self.edge_graph.get(current_edge, {})
            
            for turn_type, next_edge in outgoing.items():
                if next_edge == to_edge_id:
                    return path + [next_edge]
                
                if next_edge not in visited:
                    visited.add(next_edge)
                    queue.append((next_edge, path + [next_edge]))
        
        return None  # No path found
    
    def _find_reachable_destination(self, from_edge_id, max_depth=8):
        """Find any reachable edge from the given edge (used as fallback destination).
        
        Args:
            from_edge_id: Starting edge
            max_depth: How far to search
            
        Returns:
            A reachable edge ID, or None
        \"\"\"\n        from collections import deque
        
        queue = deque([(from_edge_id, 0)])
        visited = {from_edge_id}
        
        while queue:
            current_edge, depth = queue.popleft()
            
            if depth >= max_depth:
                return current_edge  # Return this as destination
            
            outgoing = self.edge_graph.get(current_edge, {})
            
            for turn_type, next_edge in outgoing.items():
                if next_edge not in visited:
                    visited.add(next_edge)
                    queue.append((next_edge, depth + 1))
        
        return from_edge_id  # Fallback to same edge