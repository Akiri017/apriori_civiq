import traci
import numpy as np

class SumoStateBuilder:
    """
    Reusable state builder for SUMO simulations.
    Extracts vehicle observations, junction congestion, and constructs states.
    
    Can be used by both Monolithic QMIX and Civiq hierarchical framework.
    """
    def __init__(self, max_agents=1125, obs_shape=16, n_junctions=16):
        """
        Args:
            max_agents: Maximum number of agent slots
            obs_shape: Observation vector dimension (default: 16 for expanded state)
            n_junctions: Number of junctions to track (default: 16 for 4x4 grid)
        """
        self.max_agents = max_agents
        self.obs_shape = obs_shape
        self.n_junctions = n_junctions
        
        # Agent slot management
        self.agent_id_map = {}  # Maps vehicle_id to fixed slot [0, max_agents-1]
        
    def update_agent_slots(self, active_vehicles):
        """
        Manage dynamic vehicle-to-slot mapping.
        
        Args:
            active_vehicles: List of currently active vehicle IDs
            
        Returns:
            dict: Updated agent_id_map {vehicle_id: slot_index}
        """
        current_vids = set(active_vehicles)
        
        # Remove vehicles that left
        self.agent_id_map = {
            vid: slot for vid, slot in self.agent_id_map.items() 
            if vid in current_vids
        }
        
        # Assign slots to new vehicles up to max_agents
        available_slots = sorted(
            list(set(range(self.max_agents)) - set(self.agent_id_map.values()))
        )
        
        for vid in active_vehicles:
            if vid not in self.agent_id_map and available_slots:
                self.agent_id_map[vid] = available_slots.pop(0)
        
        return self.agent_id_map
    
    def extract_vehicle_observations(self):
        """
        Extract local observations for all vehicles in agent slots.
        
        Observation features (16D):
            [0-1]: Position (x, y) normalized
            [2]: Speed (m/s)
            [3]: Acceleration (m/s²)
            [4]: Current lane index
            [5-12]: Neighboring vehicles (front, rear, left_front, left_rear,
                    right_front, right_rear) → [relative_speed, distance] × 4 = 8 values
            [13]: Distance to next junction (m)
            [14]: Next traffic light state (0=red, 0.5=yellow, 1=green, -1=none)
            [15]: Route progress (0-1, fraction of route completed)
        
        Returns:
            tuple: (all_obs, global_stats)
                - all_obs: np.array of shape [max_agents, obs_shape]
                - global_stats: dict with {total_speed, total_wait}
        """
        all_obs = np.zeros((self.max_agents, self.obs_shape))
        total_waiting_time = 0.0
        total_speed = 0.0
        
        # Get current active vehicles for safety check
        active_vehicles = set(traci.vehicle.getIDList())
        
        for vid, slot in self.agent_id_map.items():
            # Safety check: ensure vehicle still exists
            if vid not in active_vehicles:
                all_obs[slot] = np.zeros(self.obs_shape)
                continue
                
            try:
                # ===== EGO-VEHICLE DYNAMICS =====
                # Position (normalized to network bounds)
                position = traci.vehicle.getPosition(vid)
                x_norm = position[0] / 1000.0  # Assume 1km network
                y_norm = position[1] / 1000.0
                
                # Speed
                speed = traci.vehicle.getSpeed(vid)  # m/s
                
                # Acceleration
                accel = traci.vehicle.getAcceleration(vid)  # m/s²
                
                # Current lane
                lane_idx = traci.vehicle.getLaneIndex(vid)
                
                # ===== LOCAL ENVIRONMENT =====
                # Get neighboring vehicles (8 values: 4 neighbors × 2 features)
                neighbors = self._get_neighbor_states(vid)
                
                # Distance to next junction
                dist_to_junction = self._calculate_distance_to_junction(vid)
                
                # Next traffic light state
                tls_state = self._get_next_traffic_light_state(vid)
                
                # ===== ROUTE INFORMATION =====
                # Route progress (fraction completed)
                route_progress = self._get_route_progress(vid)
                
                # Store observation: 16D vector
                all_obs[slot] = np.array([
                    x_norm, y_norm,           # 0-1: Position
                    speed,                    # 2: Speed
                    accel,                    # 3: Acceleration
                    lane_idx,                 # 4: Lane
                    *neighbors,               # 5-12: Neighbors (8 values)
                    dist_to_junction,         # 13: Junction distance
                    tls_state,                # 14: Traffic light
                    route_progress            # 15: Route progress
                ], dtype=np.float32)
                
                # Accumulate for global stats
                total_waiting_time += traci.vehicle.getWaitingTime(vid)
                total_speed += speed
                
            except Exception:
                # If vehicle disappeared or error, use zero observation
                all_obs[slot] = np.zeros(self.obs_shape)
        
        global_stats = {
            'total_speed': total_speed,
            'total_wait': total_waiting_time
        }
        
        return all_obs, global_stats
    
    def _get_neighbor_states(self, vehicle_id):
        """
        Get relative states of neighboring vehicles.
        
        Returns:
            list of 8 floats: [front_rel_speed, front_dist, 
                               rear_rel_speed, rear_dist,
                               left_front_rel_speed, left_front_dist,
                               left_rear_rel_speed, left_rear_dist,
                               right_front_rel_speed, right_front_dist,
                               right_rear_rel_speed, right_rear_dist]
        """
        neighbors = []
        
        try:
            ego_speed = traci.vehicle.getSpeed(vehicle_id)
            
            # Front vehicle (same lane)
            leader = traci.vehicle.getLeader(vehicle_id, dist=100)
            if leader:
                leader_speed = traci.vehicle.getSpeed(leader[0])
                neighbors.extend([leader_speed - ego_speed, leader[1]])  # rel_speed, distance
            else:
                neighbors.extend([0.0, 100.0])  # No leader
            
            # Rear vehicle (same lane)
            follower = traci.vehicle.getFollower(vehicle_id, dist=100)
            if follower and follower[0] != '':
                try:
                    follower_speed = traci.vehicle.getSpeed(follower[0])
                    neighbors.extend([follower_speed - ego_speed, follower[1]])
                except:
                    neighbors.extend([0.0, 100.0])
            else:
                neighbors.extend([0.0, 100.0])
            
            # Left and right lane neighbors
            current_lane = traci.vehicle.getLaneIndex(vehicle_id)
            edge_id = traci.vehicle.getRoadID(vehicle_id)
            
            # Skip internal edges (junctions)
            if edge_id.startswith(':'):
                neighbors.extend([0.0, 100.0, 0.0, 100.0])  # Left
                neighbors.extend([0.0, 100.0, 0.0, 100.0])  # Right
                return neighbors
            
            try:
                num_lanes = traci.edge.getLaneNumber(edge_id)
                
                # Left lane neighbors (front and rear)
                if current_lane > 0:
                    left_neighbors = self._get_lane_neighbors(vehicle_id, edge_id, current_lane - 1)
                    neighbors.extend(left_neighbors)
                else:
                    neighbors.extend([0.0, 100.0, 0.0, 100.0])  # No left lane
                
                # Right lane neighbors (front and rear)
                if current_lane < num_lanes - 1:
                    right_neighbors = self._get_lane_neighbors(vehicle_id, edge_id, current_lane + 1)
                    neighbors.extend(right_neighbors)
                else:
                    neighbors.extend([0.0, 100.0, 0.0, 100.0])  # No right lane
            except:
                neighbors.extend([0.0, 100.0, 0.0, 100.0, 0.0, 100.0, 0.0, 100.0])  # Error case
        except:
            # Complete error case
            neighbors = [0.0, 100.0] * 6  # 6 neighbors × 2 features
        
        return neighbors
    
    def _get_lane_neighbors(self, vehicle_id, edge_id, target_lane):
        """Get front and rear neighbors in a specific lane (simplified)."""
        try:
            ego_pos = traci.vehicle.getLanePosition(vehicle_id)
            ego_speed = traci.vehicle.getSpeed(vehicle_id)
            lane_id = f"{edge_id}_{target_lane}"
            
            vehicles_on_lane = traci.lane.getLastStepVehicleIDs(lane_id)
            
            front_veh = None
            rear_veh = None
            min_front_dist = 100.0
            min_rear_dist = 100.0
            
            for veh in vehicles_on_lane:
                try:
                    veh_pos = traci.vehicle.getLanePosition(veh)
                    if veh_pos > ego_pos:  # Front
                        dist = veh_pos - ego_pos
                        if dist < min_front_dist:
                            min_front_dist = dist
                            front_veh = veh
                    else:  # Rear
                        dist = ego_pos - veh_pos
                        if dist < min_rear_dist:
                            min_rear_dist = dist
                            rear_veh = veh
                except:
                    continue
            
            # Front neighbor
            if front_veh:
                front_speed = traci.vehicle.getSpeed(front_veh)
                front_data = [front_speed - ego_speed, min_front_dist]
            else:
                front_data = [0.0, 100.0]
            
            # Rear neighbor
            if rear_veh:
                rear_speed = traci.vehicle.getSpeed(rear_veh)
                rear_data = [rear_speed - ego_speed, min_rear_dist]
            else:
                rear_data = [0.0, 100.0]
            
            return front_data + rear_data
            
        except:
            return [0.0, 100.0, 0.0, 100.0]
    
    def _calculate_distance_to_junction(self, vehicle_id):
        """Calculate distance to the next junction."""
        try:
            route = traci.vehicle.getRoute(vehicle_id)
            route_index = traci.vehicle.getRouteIndex(vehicle_id)
            
            if route_index < len(route):
                edge_length = traci.lane.getLength(traci.vehicle.getLaneID(vehicle_id))
                lane_position = traci.vehicle.getLanePosition(vehicle_id)
                dist_to_junction = edge_length - lane_position
                return dist_to_junction
            return 0.0
        except:
            return 0.0
    
    def _get_next_traffic_light_state(self, vehicle_id):
        """
        Get the state of the next traffic light.
        
        Returns:
            float: 1.0 (green), 0.5 (yellow), 0.0 (red), -1.0 (no TLS)
        """
        try:
            next_tls = traci.vehicle.getNextTLS(vehicle_id)
            if next_tls:
                tls_id, _, distance, state = next_tls[0]
                if state == 'G' or state == 'g':
                    return 1.0
                elif state == 'y' or state == 'Y':
                    return 0.5
                elif state == 'r' or state == 'R':
                    return 0.0
            return -1.0  # No traffic light ahead
        except:
            return -1.0
    
    def _get_route_progress(self, vehicle_id):
        """
        Calculate route completion progress.
        
        Returns:
            float: Fraction of route completed (0-1)
        """
        try:
            route_idx = traci.vehicle.getRouteIndex(vehicle_id)
            route = traci.vehicle.getRoute(vehicle_id)
            if len(route) > 0:
                return route_idx / len(route)
            return 0.0
        except:
            return 0.0
    
    def get_junction_congestion(self, junction_ids):
        """
        Get congestion level for each junction (waiting vehicles count).
        
        Args:
            junction_ids: List of junction IDs to track
            
        Returns:
            np.array: Congestion levels of shape [n_junctions]
        """
        congestion = np.zeros(self.n_junctions)
        
        try:
            for i, junction_id in enumerate(junction_ids[:self.n_junctions]):
                if i >= self.n_junctions:
                    break
                try:
                    # Count vehicles waiting at this junction
                    links = traci.trafficlight.getControlledLinks(junction_id)
                    waiting_count = 0
                    
                    for link in links:
                        if link and len(link) > 0:
                            lane_id = link[0][0]  # Incoming lane
                            try:
                                # Count halted vehicles on this lane
                                waiting_count += traci.lane.getLastStepHaltingNumber(lane_id)
                            except:
                                pass
                    
                    congestion[i] = waiting_count
                except:
                    congestion[i] = 0.0
        except:
            pass  # Return zeros if error
        
        return congestion
    
    def build_flat_state(self, active_vehicles, junction_ids, throughput_count, step_count, max_steps=3600):
        """
        Build flat monolithic state vector for QMIX.
        
        State structure:
            [global_features(5)] + [junction_congestion(n_junctions)] + [flattened_observations]
        
        Args:
            active_vehicles: List of active vehicle IDs
            junction_ids: List of junction IDs
            throughput_count: Number of vehicles that reached destination
            step_count: Current simulation step
            max_steps: Maximum simulation steps (for normalization)
            
        Returns:
            tuple: (global_state, all_obs)
                - global_state: Flattened state vector
                - all_obs: Vehicle observations array [max_agents, obs_shape]
        """
        # Update agent slots
        self.update_agent_slots(active_vehicles)
        
        # Extract vehicle observations
        all_obs, global_stats = self.extract_vehicle_observations()
        
        # Get junction congestion
        junction_congestion = self.get_junction_congestion(junction_ids)
        
        # Compute global statistics
        n_vehicles = len(active_vehicles)
        avg_speed = global_stats['total_speed'] / n_vehicles if n_vehicles > 0 else 0.0
        total_wait = global_stats['total_wait']
        
        # Global feature vector
        global_features = [
            n_vehicles,
            avg_speed,
            total_wait,
            throughput_count,
            step_count / max_steps  # Normalized time
        ]
        
        # Concatenate: global_features + junction_congestion + flattened observations
        global_state = np.concatenate([
            global_features, 
            junction_congestion, 
            all_obs.flatten()
        ])
        
        return global_state, all_obs
    
    def build_hierarchical_state(self, active_vehicles, junction_ids, rsu_positions=None):
        """
        Build hierarchical state for Civiq framework (RSU-based grouping).
        
        NOTE: This is a placeholder for future Civiq implementation.
        
        Args:
            active_vehicles: List of active vehicle IDs
            junction_ids: List of junction IDs
            rsu_positions: Optional dict of RSU positions for spatial grouping
            
        Returns:
            dict: Hierarchical state structure with RSU groupings
        """
        # Update agent slots
        self.update_agent_slots(active_vehicles)
        
        # Extract vehicle observations
        all_obs, global_stats = self.extract_vehicle_observations()
        
        # Get junction congestion
        junction_congestion = self.get_junction_congestion(junction_ids)
        
        # Placeholder for hierarchical grouping
        # Future: Group vehicles by RSU proximity (300m radius)
        hierarchical_state = {
            'global_stats': global_stats,
            'junction_congestion': junction_congestion,
            'vehicle_observations': all_obs,
            'agent_id_map': self.agent_id_map
        }
        
        return hierarchical_state
    
    def reset(self):
        """Reset the state builder (clear agent slots)."""
        self.agent_id_map = {}
