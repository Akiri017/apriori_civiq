import traci
import numpy as np

class SumoStateBuilder:
    """
    Reusable state builder for SUMO simulations.
    Extracts vehicle observations, junction congestion, and constructs states.
    
    Can be used by both Monolithic QMIX and Civiq hierarchical framework.
    """
    def __init__(self, max_agents=1125, obs_shape=4, n_junctions=16):
        """
        Args:
            max_agents: Maximum number of agent slots
            obs_shape: Observation vector dimension (default: 4 for [speed, dist_to_junction, lane_id, leader_dist])
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
        
        Observation features:
            - speed: Current vehicle speed
            - dist_to_junction: Distance to end of current edge
            - lane_id_encoded: Normalized lane identifier
            - leader_dist: Distance to leading vehicle
        
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
                all_obs[slot] = [0.0, 0.0, 0.0, 50.0]
                continue
                
            try:
                # Feature 1: Current speed
                speed = traci.vehicle.getSpeed(vid)
                
                # Feature 2: Distance to next junction
                route = traci.vehicle.getRoute(vid)
                route_index = traci.vehicle.getRouteIndex(vid)
                
                # Calculate distance to junction (end of current edge)
                if route_index < len(route):
                    edge_length = traci.lane.getLength(traci.vehicle.getLaneID(vid))
                    lane_position = traci.vehicle.getLanePosition(vid)
                    dist_to_junction = edge_length - lane_position
                else:
                    dist_to_junction = 0.0
                
                # Feature 3: Lane ID encoded (simple numeric encoding)
                lane_id = traci.vehicle.getLaneID(vid)
                try:
                    lane_encoded = float(hash(lane_id) % 100) / 100.0  # Normalize to [0, 1]
                except:
                    lane_encoded = 0.0
                
                # Feature 4: Distance to leader vehicle
                leader = traci.vehicle.getLeader(vid, 50)
                leader_dist = leader[1] if leader else 50.0
                
                # Store observation: [speed, dist_to_junction, lane_id_encoded, leader_dist]
                all_obs[slot] = [speed, dist_to_junction, lane_encoded, leader_dist]
                
                # Accumulate for global stats
                total_waiting_time += traci.vehicle.getWaitingTime(vid)
                total_speed += speed
                
            except Exception:
                # If vehicle disappeared or error, use zero observation
                all_obs[slot] = [0.0, 0.0, 0.0, 50.0]
        
        global_stats = {
            'total_speed': total_speed,
            'total_wait': total_waiting_time
        }
        
        return all_obs, global_stats
    
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
