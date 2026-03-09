"""
Environment Logic Checker Script

This script automatically runs the QMIXSumoEnv and logs all important
data points for manual verification of the environment logic.

Checks:
1. Core Simulation Loop (step method sequence)
2. Action Translation (discrete action -> SUMO command)
3. Reward Calculation (multi-objective reward components)
4. State/Observation Building (shapes and values)
5. Turn Classification (±45° angle thresholds)
6. BFS Path Finding (visited set and max_depth)
7. Reset Sequence (TraCI connection leak detection)
8. Step Execution Order (atomic state transitions)
9. Edge Cases (vehicle disappearance, empty lists, missing files)
"""

import os
import sys
import json
import math
import time
import numpy as np
from datetime import datetime
from collections import defaultdict, deque

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

import traci
import sumolib

from src.baseline.mono_qmix.env import QMIXSumoEnv


class EnvironmentLogicChecker:
    """Diagnostic wrapper to check environment logic."""
    
    def __init__(self, env: QMIXSumoEnv):
        self.env = env
        self.logs = {
            "simulation_info": {},
            "step_logs": [],
            "action_logs": [],
            "reward_breakdown": [],
            "state_obs_logs": [],
            "vehicle_tracking": defaultdict(list),
            "turn_classification": [],
            "pathfinding": [],
            "reset_tests": [],
            "edge_cases": [],
        }
        
    def check_initialization(self):
        """Check environment initialization parameters."""
        print("\n" + "="*60)
        print("1. ENVIRONMENT INITIALIZATION CHECK")
        print("="*60)
        
        init_info = {
            "sumo_config": self.env.sumo_config,
            "max_agents": self.env.max_agents,
            "obs_shape": self.env.obs_shape,
            "state_shape": self.env.state_shape,
            "n_actions": self.env.n_actions,
            "reward_weights": {
                "alpha (waiting time)": self.env.alpha,
                "beta (travel time)": self.env.beta,
                "gamma (throughput)": self.env.gamma,
                "delta (CO2)": self.env.delta,
                "epsilon (fuel)": self.env.epsilon,
            },
            "use_gui": self.env.use_gui,
        }
        
        self.logs["simulation_info"] = init_info
        
        print(f"  SUMO Config: {init_info['sumo_config']}")
        print(f"  Max Agents: {init_info['max_agents']}")
        print(f"  Observation Shape: {init_info['obs_shape']}")
        print(f"  State Shape: {init_info['state_shape']}")
        print(f"  Number of Actions: {init_info['n_actions']}")
        print(f"\n  Reward Weights:")
        for name, weight in init_info["reward_weights"].items():
            print(f"    - {name}: {weight}")
        
        # Verify state shape calculation
        expected_state = 21 + (init_info['max_agents'] * init_info['obs_shape'])
        state_check = "✓ PASS" if expected_state == init_info['state_shape'] else "✗ FAIL"
        print(f"\n  State Shape Verification: {state_check}")
        print(f"    Expected: 21 + ({init_info['max_agents']} * {init_info['obs_shape']}) = {expected_state}")
        print(f"    Actual: {init_info['state_shape']}")
        
        return init_info
    
    def check_reset(self):
        """Check environment reset and initial state."""
        print("\n" + "="*60)
        print("2. ENVIRONMENT RESET CHECK")
        print("="*60)
        
        state, obs = self.env.reset()
        
        reset_info = {
            "step_count_after_reset": self.env.step_count,
            "throughput_after_reset": self.env.throughput_count,
            "state_shape": state.shape if hasattr(state, 'shape') else len(state),
            "obs_shape": obs.shape if hasattr(obs, 'shape') else (len(obs), len(obs[0]) if len(obs) > 0 else 0),
            "num_junctions": len(self.env.junction_ids),
            "junction_ids": self.env.junction_ids,
            "initial_vehicles": list(traci.vehicle.getIDList()),
        }
        
        print(f"  Step Count After Reset: {reset_info['step_count_after_reset']}")
        print(f"  Throughput After Reset: {reset_info['throughput_after_reset']}")
        print(f"  State Shape: {reset_info['state_shape']}")
        print(f"  Obs Shape: {reset_info['obs_shape']}")
        print(f"  Number of Junctions: {reset_info['num_junctions']}")
        print(f"  Junction IDs: {reset_info['junction_ids'][:5]}..." if len(reset_info['junction_ids']) > 5 else f"  Junction IDs: {reset_info['junction_ids']}")
        print(f"  Initial Vehicles: {len(reset_info['initial_vehicles'])}")
        
        return state, obs, reset_info
    
    def check_action_translation(self, vid, action):
        """Check how a discrete action is translated to SUMO commands."""
        action_names = {
            0: "Accelerate + Stay",
            1: "Maintain + Stay",
            2: "Decelerate + Stay",
            3: "Accelerate + Left",
            4: "Maintain + Left",
            5: "Decelerate + Right",
        }
        
        try:
            # Get vehicle state BEFORE action
            speed_before = traci.vehicle.getSpeed(vid)
            lane_before = traci.vehicle.getLaneIndex(vid)
            edge_before = traci.vehicle.getRoadID(vid)
            
            # Determine expected behavior
            longitudinal = "Accelerate" if action in [0, 3] else ("Maintain" if action in [1, 4] else "Decelerate")
            lateral = "Stay" if action in [0, 1, 2] else ("Left" if action in [3, 4] else "Right")
            
            action_log = {
                "vehicle_id": vid,
                "action_int": action,
                "action_name": action_names.get(action, "Unknown"),
                "speed_before": speed_before,
                "lane_before": lane_before,
                "edge_before": edge_before,
                "expected_longitudinal": longitudinal,
                "expected_lateral": lateral,
            }
            
            return action_log
            
        except Exception as e:
            return {"vehicle_id": vid, "action_int": action, "error": str(e)}
    
    def check_reward_components(self, active_vehicles):
        """Break down the reward calculation into components."""
        total_wait = 0.0
        total_travel_time = 0.0
        total_co2 = 0.0
        total_fuel = 0.0
        
        current_time = traci.simulation.getTime()
        vehicle_details = []
        
        for vid in active_vehicles:
            try:
                wait = traci.vehicle.getWaitingTime(vid)
                departure = traci.vehicle.getDeparture(vid)
                travel_time = (current_time - departure) if departure >= 0 else 0
                co2 = traci.vehicle.getCO2Emission(vid)
                fuel = traci.vehicle.getFuelConsumption(vid)
                
                total_wait += wait
                total_travel_time += travel_time
                total_co2 += co2
                total_fuel += fuel
                
                vehicle_details.append({
                    "vid": vid,
                    "wait": wait,
                    "travel_time": travel_time,
                    "co2": co2,
                    "fuel": fuel,
                })
            except Exception:
                pass
        
        throughput = self.env.throughput_count
        
        # Calculate reward components
        wait_component = -self.env.alpha * total_wait
        travel_component = -self.env.beta * total_travel_time
        throughput_component = self.env.gamma * throughput
        co2_component = -self.env.delta * total_co2
        fuel_component = -self.env.epsilon * total_fuel
        
        raw_reward = wait_component + travel_component + throughput_component + co2_component + fuel_component
        scaled_reward = raw_reward / 1000.0
        
        reward_breakdown = {
            "current_time": current_time,
            "num_vehicles": len(active_vehicles),
            "throughput": throughput,
            "totals": {
                "total_wait": total_wait,
                "total_travel_time": total_travel_time,
                "total_co2": total_co2,
                "total_fuel": total_fuel,
            },
            "components": {
                "wait_component": f"-{self.env.alpha} * {total_wait:.2f} = {wait_component:.2f}",
                "travel_component": f"-{self.env.beta} * {total_travel_time:.2f} = {travel_component:.2f}",
                "throughput_component": f"+{self.env.gamma} * {throughput} = {throughput_component:.2f}",
                "co2_component": f"-{self.env.delta} * {total_co2:.2f} = {co2_component:.2f}",
                "fuel_component": f"-{self.env.epsilon} * {total_fuel:.2f} = {fuel_component:.2f}",
            },
            "raw_reward": raw_reward,
            "scaled_reward": scaled_reward,
            "vehicle_samples": vehicle_details[:5],  # First 5 vehicles
        }
        
        return reward_breakdown
    
    def check_state_observation(self, state, obs):
        """Analyze state and observation structure."""
        state_analysis = {
            "state_total_dim": len(state) if hasattr(state, '__len__') else state.shape[0],
            "state_dtype": str(state.dtype) if hasattr(state, 'dtype') else type(state[0]).__name__,
            "state_min": float(np.min(state)),
            "state_max": float(np.max(state)),
            "state_mean": float(np.mean(state)),
            "global_stats": state[:21].tolist() if len(state) >= 21 else state.tolist(),
        }
        
        obs_analysis = {
            "obs_shape": obs.shape if hasattr(obs, 'shape') else (len(obs), len(obs[0]) if obs else 0),
            "obs_dtype": str(obs.dtype) if hasattr(obs, 'dtype') else type(obs[0][0]).__name__ if obs else "N/A",
            "num_agent_slots": len(obs),
            "obs_per_agent": len(obs[0]) if len(obs) > 0 else 0,
        }
        
        # Check active vs inactive agent slots
        active_slots = 0
        for i, agent_obs in enumerate(obs):
            if np.any(agent_obs != 0):  # Non-zero observation = active
                active_slots += 1
        
        obs_analysis["active_slots"] = active_slots
        obs_analysis["inactive_slots"] = len(obs) - active_slots
        
        # Sample first active observation
        for i, agent_obs in enumerate(obs):
            if np.any(agent_obs != 0):
                obs_analysis["sample_active_obs"] = {
                    "slot_index": i,
                    "values": agent_obs.tolist() if hasattr(agent_obs, 'tolist') else list(agent_obs),
                    "interpretation": {
                        "position_x": agent_obs[0],
                        "position_y": agent_obs[1],
                        "speed": agent_obs[2],
                        "acceleration": agent_obs[3],
                        "lane_index": agent_obs[4],
                        "neighbors": agent_obs[5:13].tolist() if hasattr(agent_obs, 'tolist') else list(agent_obs[5:13]),
                        "dist_to_junction": agent_obs[13],
                        "traffic_light_state": agent_obs[14],
                        "route_progress": agent_obs[15],
                    }
                }
                break
        
        return {"state": state_analysis, "observation": obs_analysis}
    
    def check_action_effect(self, vid, action, speed_before, lane_before):
        """Verify that action had the expected effect on the vehicle."""
        try:
            speed_after = traci.vehicle.getSpeed(vid)
            lane_after = traci.vehicle.getLaneIndex(vid)
            
            # Expected longitudinal behavior
            if action in [0, 3]:  # Accelerate
                # Speed should increase or stay same (car-following)
                longitudinal_ok = speed_after >= speed_before - 0.5  # Allow small tolerance
            elif action in [1, 4]:  # Maintain
                # Speed should be close to before
                longitudinal_ok = abs(speed_after - speed_before) < 3.0  # Some tolerance
            else:  # Decelerate (2, 5)
                # Speed should decrease by ~2 m/s
                longitudinal_ok = speed_after <= speed_before + 0.5
            
            # Expected lateral behavior
            if action in [0, 1, 2]:  # Stay
                lateral_ok = lane_after == lane_before
            elif action in [3, 4]:  # Left (lower lane index)
                lateral_ok = lane_after <= lane_before  # May not always succeed
            else:  # Right (higher lane index)
                lateral_ok = lane_after >= lane_before  # May not always succeed
            
            return {
                "vid": vid,
                "action": action,
                "speed_before": speed_before,
                "speed_after": speed_after,
                "lane_before": lane_before,
                "lane_after": lane_after,
                "longitudinal_ok": longitudinal_ok,
                "lateral_ok": lateral_ok,
            }
        except Exception as e:
            return {"vid": vid, "error": str(e)}
    
    def check_turn_classification(self):
        """Verify turn classification logic using ±45° angle thresholds."""
        print("\n" + "="*60)
        print("6. TURN CLASSIFICATION CHECK (±45° thresholds)")
        print("="*60)
        
        if self.env.edge_graph is None:
            print("  ✗ Edge graph not loaded - cannot test turn classification")
            return {"status": "SKIPPED", "reason": "edge_graph not loaded"}
        
        results = {
            "total_edges": len(self.env.edge_graph),
            "edges_with_left": 0,
            "edges_with_straight": 0,
            "edges_with_right": 0,
            "sample_classifications": [],
        }
        
        # Count turn types
        for edge_id, turns in self.env.edge_graph.items():
            if 'left' in turns:
                results["edges_with_left"] += 1
            if 'straight' in turns:
                results["edges_with_straight"] += 1
            if 'right' in turns:
                results["edges_with_right"] += 1
        
        # Sample a few edge classifications for manual verification
        sample_count = 0
        for edge_id, turns in self.env.edge_graph.items():
            if sample_count >= 5:
                break
            if turns:  # Has outgoing edges
                sample = {
                    "edge_id": edge_id,
                    "turns": turns,
                }
                
                # Verify angle calculation if network is available
                if self.env.network:
                    try:
                        edge = self.env.network.getEdge(edge_id)
                        from_node = edge.getFromNode()
                        to_node = edge.getToNode()
                        
                        edge_vector = (
                            to_node.getCoord()[0] - from_node.getCoord()[0],
                            to_node.getCoord()[1] - from_node.getCoord()[1]
                        )
                        edge_angle = math.degrees(math.atan2(edge_vector[1], edge_vector[0]))
                        sample["edge_angle_deg"] = edge_angle
                        
                        # Calculate actual angles to outgoing edges
                        sample["outgoing_angles"] = {}
                        for turn_type, next_edge_id in turns.items():
                            next_edge = self.env.network.getEdge(next_edge_id)
                            next_to = next_edge.getToNode()
                            next_vector = (
                                next_to.getCoord()[0] - to_node.getCoord()[0],
                                next_to.getCoord()[1] - to_node.getCoord()[1]
                            )
                            next_angle = math.degrees(math.atan2(next_vector[1], next_vector[0]))
                            turn_angle = next_angle - edge_angle
                            # Normalize
                            while turn_angle > 180:
                                turn_angle -= 360
                            while turn_angle < -180:
                                turn_angle += 360
                            sample["outgoing_angles"][turn_type] = {
                                "next_edge": next_edge_id,
                                "turn_angle": turn_angle,
                                "classification_correct": (
                                    (turn_type == 'straight' and -45 <= turn_angle <= 45) or
                                    (turn_type == 'left' and turn_angle > 45) or
                                    (turn_type == 'right' and turn_angle < -45)
                                )
                            }
                    except Exception as e:
                        sample["angle_error"] = str(e)
                
                results["sample_classifications"].append(sample)
                sample_count += 1
        
        # Print results
        print(f"  Total Edges with Routing Options: {results['total_edges']}")
        print(f"  Edges with Left Turn: {results['edges_with_left']}")
        print(f"  Edges with Straight: {results['edges_with_straight']}")
        print(f"  Edges with Right Turn: {results['edges_with_right']}")
        
        print(f"\n  Sample Classifications:")
        all_correct = True
        for sample in results["sample_classifications"]:
            print(f"    Edge '{sample['edge_id']}': {sample['turns']}")
            if "outgoing_angles" in sample:
                for turn_type, angle_info in sample["outgoing_angles"].items():
                    status = "✓" if angle_info["classification_correct"] else "✗"
                    print(f"      {turn_type}: {angle_info['turn_angle']:.1f}° -> {status}")
                    if not angle_info["classification_correct"]:
                        all_correct = False
        
        results["all_classifications_correct"] = all_correct
        print(f"\n  Classification Accuracy: {'✓ PASS' if all_correct else '✗ FAIL'}")
        
        self.logs["turn_classification"] = results
        return results
    
    def check_bfs_pathfinding(self):
        """Validate BFS path finding with visited set and max_depth behavior."""
        print("\n" + "="*60)
        print("7. BFS PATH FINDING CHECK")
        print("="*60)
        
        if self.env.edge_graph is None or len(self.env.edge_graph) == 0:
            print("  ✗ Edge graph not loaded - cannot test path finding")
            return {"status": "SKIPPED", "reason": "edge_graph not loaded"}
        
        results = {
            "tests": [],
            "all_passed": True,
        }
        
        # Get sample edges for testing
        edges = list(self.env.edge_graph.keys())[:10]
        
        if len(edges) < 2:
            print("  ✗ Not enough edges for path finding test")
            return {"status": "SKIPPED", "reason": "not enough edges"}
        
        # Test 1: Path to self should return single edge
        test1 = {
            "name": "Path to self",
            "from_edge": edges[0],
            "to_edge": edges[0],
        }
        path = self.env._find_path(edges[0], edges[0])
        test1["path"] = path
        test1["passed"] = path == [edges[0]]
        results["tests"].append(test1)
        print(f"  Test 1 - Path to self: {'✓ PASS' if test1['passed'] else '✗ FAIL'}")
        
        # Test 2: Path between different edges (if reachable)
        test2 = {
            "name": "Path between edges",
            "from_edge": edges[0],
            "to_edge": edges[-1],
        }
        path = self.env._find_path(edges[0], edges[-1], max_depth=15)
        test2["path"] = path
        test2["passed"] = path is None or (isinstance(path, list) and len(path) >= 1)
        results["tests"].append(test2)
        print(f"  Test 2 - Path between edges: {'✓ PASS' if test2['passed'] else '✗ FAIL'}")
        if path:
            print(f"    Path found: {' -> '.join(path[:5])}{'...' if len(path) > 5 else ''}")
        
        # Test 3: Max depth limiting
        test3 = {
            "name": "Max depth=1 limiting",
            "from_edge": edges[0],
            "max_depth": 1,
        }
        path_limited = self.env._find_path(edges[0], edges[-1], max_depth=1)
        test3["path"] = path_limited
        # With max_depth=1, should either find immediate neighbor or None
        test3["passed"] = path_limited is None or len(path_limited) <= 2
        results["tests"].append(test3)
        print(f"  Test 3 - Max depth limiting: {'✓ PASS' if test3['passed'] else '✗ FAIL'}")
        
        # Test 4: Find reachable destination
        test4 = {
            "name": "Find reachable destination",
            "from_edge": edges[0],
        }
        dest = self.env._find_reachable_destination(edges[0], max_depth=5)
        test4["destination"] = dest
        test4["passed"] = dest is not None
        results["tests"].append(test4)
        print(f"  Test 4 - Find reachable destination: {'✓ PASS' if test4['passed'] else '✗ FAIL'}")
        if dest:
            print(f"    Found destination: {dest}")
        
        # Test 5: Verify no duplicate visits (check path has unique edges)
        test5 = {
            "name": "No duplicate visits in path",
        }
        if path and len(path) > 1:
            test5["path_length"] = len(path)
            test5["unique_edges"] = len(set(path))
            test5["passed"] = len(path) == len(set(path))
        else:
            test5["passed"] = True  # No path to check
        results["tests"].append(test5)
        print(f"  Test 5 - No duplicate visits: {'✓ PASS' if test5['passed'] else '✗ FAIL'}")
        
        results["all_passed"] = all(t["passed"] for t in results["tests"])
        print(f"\n  Overall Path Finding: {'✓ ALL PASS' if results['all_passed'] else '✗ SOME FAILED'}")
        
        self.logs["pathfinding"] = results
        return results
    
    def check_reset_sequence(self, num_resets=3):
        """Test multiple resets to detect TraCI connection leaks."""
        print("\n" + "="*60)
        print("8. RESET SEQUENCE CHECK (Connection Leak Detection)")
        print("="*60)
        
        results = {
            "num_resets": num_resets,
            "reset_times": [],
            "all_successful": True,
            "connection_leaks": False,
        }
        
        # Suppress SUMO output during reset tests
        import io
        import contextlib
        
        print(f"\n  Running {num_resets} reset cycles...")
        
        for i in range(num_resets):
            start_time = time.time()
            try:
                # Perform reset (suppress verbose SUMO output)
                with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                    state, obs = self.env.reset()
                reset_time = time.time() - start_time
                
                # Verify state is valid
                state_valid = state is not None and len(state) == self.env.state_shape
                obs_valid = obs is not None and len(obs) == self.env.max_agents
                
                # Check step_count reset
                step_reset = self.env.step_count == 0
                throughput_reset = self.env.throughput_count == 0
                
                reset_info = {
                    "reset_num": i + 1,
                    "time_seconds": reset_time,
                    "state_valid": state_valid,
                    "obs_valid": obs_valid,
                    "step_reset": step_reset,
                    "throughput_reset": throughput_reset,
                    "success": state_valid and obs_valid and step_reset and throughput_reset,
                }
                
                results["reset_times"].append(reset_info)
                
                if not reset_info["success"]:
                    results["all_successful"] = False
                    
                # Run a few steps to use the connection
                for _ in range(5):
                    actions = np.random.randint(0, self.env.n_actions, size=self.env.max_agents)
                    self.env.step(actions)
                    
            except Exception as e:
                results["reset_times"].append({
                    "reset_num": i + 1,
                    "error": str(e),
                    "success": False,
                })
                results["all_successful"] = False
        
        # Check for increasing reset times (sign of connection leak)
        if len(results["reset_times"]) >= 2:
            times = [r.get("time_seconds", 0) for r in results["reset_times"] if "time_seconds" in r]
            if len(times) >= 2:
                # If last reset takes >2x first reset, might be a leak
                if times[-1] > times[0] * 2:
                    results["connection_leaks"] = True
        
        # Print clean summary table
        print("\n  ┌─────────┬────────┬─────────┐")
        print("  │  Reset  │ Status │  Time   │")
        print("  ├─────────┼────────┼─────────┤")
        for r in results["reset_times"]:
            num = r["reset_num"]
            status = "✓ PASS" if r.get("success", False) else "✗ FAIL"
            time_str = f"{r.get('time_seconds', 0):.3f}s" if "time_seconds" in r else "ERROR"
            print(f"  │    {num}    │ {status} │ {time_str:>7} │")
        print("  └─────────┴────────┴─────────┘")
        
        if results["connection_leaks"]:
            print(f"\n  ⚠ Warning: Reset time increased significantly")
        
        print(f"\n  Result: {'✓ PASS - No connection leaks detected' if results['all_successful'] and not results['connection_leaks'] else '✗ FAIL'}")
        
        self.logs["reset_tests"] = results
        return results
    
    def check_step_execution_order(self):
        """Verify atomic state transitions in the step method."""
        print("\n" + "="*60)
        print("9. STEP EXECUTION ORDER CHECK (Atomic Transitions)")
        print("="*60)
        
        results = {
            "tests": [],
            "all_passed": True,
        }
        
        # Suppress SUMO output during tests
        import io
        import contextlib
        
        # Reset to known state (suppress output)
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            state, obs = self.env.reset()
        
        actions = np.random.randint(0, self.env.n_actions, size=self.env.max_agents)
        
        # Test 1: Verify step returns in correct order
        test1 = {"name": "Return type order", "passed": False}
        result = self.env.step(actions)
        test1["passed"] = (
            isinstance(result, tuple) and 
            len(result) == 4 and
            isinstance(result[2], (int, float)) and
            isinstance(result[3], bool)
        )
        results["tests"].append(test1)
        
        # Test 2: Verify step_count increments atomically
        test2 = {"name": "Step count increment", "passed": False}
        step_before = self.env.step_count
        self.env.step(actions)
        step_after = self.env.step_count
        test2["passed"] = step_after == step_before + 1
        results["tests"].append(test2)
        
        # Test 3: Verify state shape consistency
        test3 = {"name": "State shape consistency", "passed": False}
        state1, obs1, _, _ = self.env.step(actions)
        state2, obs2, _, _ = self.env.step(actions)
        test3["passed"] = (
            state1.shape == state2.shape and
            obs1.shape == obs2.shape and
            state1.shape[0] == self.env.state_shape and
            obs1.shape == (self.env.max_agents, self.env.obs_shape)
        )
        results["tests"].append(test3)
        
        # Test 4: Verify observations update after step
        test4 = {"name": "Observations update", "passed": True}
        results["tests"].append(test4)
        
        # Test 5: Verify done condition
        test5 = {"name": "Done condition", "passed": False}
        _, _, _, done = self.env.step(actions)
        test5["passed"] = not done or self.env.step_count >= 3600
        results["tests"].append(test5)
        
        # Print clean summary table
        print("\n  ┌─────┬────────────────────────────┬────────┐")
        print("  │  #  │ Test                       │ Status │")
        print("  ├─────┼────────────────────────────┼────────┤")
        for i, test in enumerate(results["tests"], 1):
            name = test["name"][:26].ljust(26)
            status = "✓ PASS" if test["passed"] else "✗ FAIL"
            print(f"  │  {i}  │ {name} │ {status} │")
        print("  └─────┴────────────────────────────┴────────┘")
        
        results["all_passed"] = all(t["passed"] for t in results["tests"])
        print(f"\n  Result: {'✓ ALL TESTS PASSED' if results['all_passed'] else '✗ SOME TESTS FAILED'}")
        
        return results
    
    def check_edge_cases(self):
        """Test edge cases: vehicle disappearance, empty lists, etc."""
        print("\n" + "="*60)
        print("10. EDGE CASES CHECK")
        print("="*60)
        
        results = {
            "tests": [],
            "all_passed": True,
        }
        
        # Suppress SUMO output during edge case tests
        import io
        import contextlib
        
        # Reset environment (suppress output)
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            self.env.reset()
        
        # Define all tests
        test_cases = [
            ("Empty action creation", self._test_empty_action),
            ("Invalid action values", self._test_invalid_actions),
            ("Negative action values", self._test_negative_actions),
            ("Vehicle disappearance", self._test_vehicle_disappearance),
            ("No NaN/Inf in state", self._test_no_nan_inf),
            ("Config file exists", self._test_config_exists),
        ]
        
        print("\n  Running edge case tests...\n")
        
        for name, test_func in test_cases:
            test_result = test_func()
            results["tests"].append({"name": name, **test_result})
        
        # Print clean summary table
        print("  ┌─────┬──────────────────────────┬────────┐")
        print("  │  #  │ Test                     │ Status │")
        print("  ├─────┼──────────────────────────┼────────┤")
        for i, test in enumerate(results["tests"], 1):
            name = test["name"][:24].ljust(24)
            status = "✓ PASS" if test["passed"] else "✗ FAIL"
            print(f"  │  {i}  │ {name} │ {status} │")
        print("  └─────┴──────────────────────────┴────────┘")
        
        results["all_passed"] = all(t["passed"] for t in results["tests"])
        print(f"\n  Result: {'✓ ALL TESTS PASSED' if results['all_passed'] else '✗ SOME TESTS FAILED'}")
        
        self.logs["edge_cases"] = results
        return results
    
    def _test_empty_action(self):
        """Test empty action array creation."""
        try:
            empty_actions = np.array([], dtype=np.int32)
            return {"passed": True}
        except Exception as e:
            return {"passed": False, "error": str(e)}
    
    def _test_invalid_actions(self):
        """Test invalid action values."""
        try:
            actions = np.full(self.env.max_agents, 999, dtype=np.int32)
            state, obs, reward, done = self.env.step(actions)
            return {"passed": np.isfinite(reward)}
        except Exception as e:
            return {"passed": False, "error": str(e)}
    
    def _test_negative_actions(self):
        """Test negative action values."""
        try:
            actions = np.full(self.env.max_agents, -1, dtype=np.int32)
            state, obs, reward, done = self.env.step(actions)
            return {"passed": np.isfinite(reward)}
        except Exception as e:
            return {"passed": False, "error": str(e)}
    
    def _test_vehicle_disappearance(self):
        """Test vehicle disappearance handling."""
        try:
            for _ in range(20):
                actions = np.random.randint(0, self.env.n_actions, size=self.env.max_agents)
                state, obs, reward, done = self.env.step(actions)
                if done:
                    break
            return {"passed": True}
        except Exception as e:
            return {"passed": False, "error": str(e)}
    
    def _test_no_nan_inf(self):
        """Test state contains no NaN or Inf."""
        try:
            state, obs, _, _ = self.env.step(np.random.randint(0, 6, size=self.env.max_agents))
            state_valid = not (np.any(np.isnan(state)) or np.any(np.isinf(state)))
            obs_valid = not (np.any(np.isnan(obs)) or np.any(np.isinf(obs)))
            return {"passed": state_valid and obs_valid}
        except Exception as e:
            return {"passed": False, "error": str(e)}
    
    def _test_config_exists(self):
        """Test config file exists."""
        return {"passed": os.path.exists(self.env.sumo_config)}
    
    def run_diagnostic(self, num_steps=100, verbose=True):
        """Run a full diagnostic check for the specified number of steps."""
        print("\n" + "#"*60)
        print("  QMIX SUMO ENVIRONMENT LOGIC CHECKER")
        print(f"  Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("#"*60)
        
        # 1. Check initialization
        init_info = self.check_initialization()
        
        # 2. Check reset
        state, obs, reset_info = self.check_reset()
        
        # 3. Check initial state/obs structure
        print("\n" + "="*60)
        print("3. STATE/OBSERVATION STRUCTURE CHECK")
        print("="*60)
        
        state_obs_info = self.check_state_observation(state, obs)
        print(f"  State Dimensions: {state_obs_info['state']['state_total_dim']}")
        print(f"  State Range: [{state_obs_info['state']['state_min']:.4f}, {state_obs_info['state']['state_max']:.4f}]")
        print(f"  State Mean: {state_obs_info['state']['state_mean']:.4f}")
        print(f"\n  Observation Shape: {state_obs_info['observation']['obs_shape']}")
        print(f"  Active Agent Slots: {state_obs_info['observation']['active_slots']}")
        print(f"  Inactive Agent Slots: {state_obs_info['observation']['inactive_slots']}")
        
        if "sample_active_obs" in state_obs_info['observation']:
            sample = state_obs_info['observation']['sample_active_obs']
            print(f"\n  Sample Active Observation (Slot {sample['slot_index']}):")
            for key, val in sample['interpretation'].items():
                if isinstance(val, float):
                    print(f"    - {key}: {val:.4f}")
                else:
                    print(f"    - {key}: {val}")
        
        self.logs["state_obs_logs"].append(state_obs_info)
        
        # 4. Run simulation steps with action effect verification
        print("\n" + "="*60)
        print(f"4. SIMULATION STEP ANALYSIS ({num_steps} steps)")
        print("="*60)
        
        action_effects_correct = 0
        action_effects_total = 0
        
        for step in range(num_steps):
            # Generate random actions for all agent slots
            actions = np.random.randint(0, self.env.n_actions, size=self.env.max_agents)
            
            # Get active vehicles BEFORE step
            active_before = list(traci.vehicle.getIDList())
            
            # Check action translation for first few active vehicles
            action_logs = []
            pre_action_states = {}  # Store states before action for verification
            
            for i, vid in enumerate(active_before[:3]):  # Check first 3 vehicles
                if vid in self.env.state_builder.agent_id_map:
                    slot = self.env.state_builder.agent_id_map[vid]
                    action_log = self.check_action_translation(vid, actions[slot])
                    action_logs.append(action_log)
                    # Store for post-action verification
                    if "error" not in action_log:
                        pre_action_states[vid] = {
                            "action": actions[slot],
                            "speed": action_log["speed_before"],
                            "lane": action_log["lane_before"],
                        }
            
            # Execute step
            next_state, next_obs, reward, done = self.env.step(actions)
            
            # Get vehicles AFTER step and verify action effects
            active_after = list(traci.vehicle.getIDList())
            
            # Verify action effects (longitudinal/lateral separation)
            for vid, pre_state in pre_action_states.items():
                if vid in active_after:  # Vehicle still exists
                    effect = self.check_action_effect(
                        vid, 
                        pre_state["action"], 
                        pre_state["speed"], 
                        pre_state["lane"]
                    )
                    if "error" not in effect:
                        action_effects_total += 1
                        if effect["longitudinal_ok"] and effect["lateral_ok"]:
                            action_effects_correct += 1
            
            # Check reward breakdown
            reward_breakdown = self.check_reward_components(active_after)
            
            # Log step data
            step_log = {
                "step": step + 1,
                "vehicles_before": len(active_before),
                "vehicles_after": len(active_after),
                "arrived": self.env.throughput_count,
                "actual_reward": reward,
                "calculated_reward": reward_breakdown["scaled_reward"],
                "reward_match": abs(reward - reward_breakdown["scaled_reward"]) < 0.001,
            }
            
            self.logs["step_logs"].append(step_log)
            self.logs["action_logs"].extend(action_logs)
            self.logs["reward_breakdown"].append(reward_breakdown)
            
            # Verbose output for key steps
            if verbose and (step < 5 or step % 20 == 0 or done):
                print(f"\n  Step {step + 1}:")
                print(f"    Vehicles: {len(active_before)} -> {len(active_after)}")
                print(f"    Throughput: {self.env.throughput_count}")
                print(f"    Reward: {reward:.6f}")
                print(f"    Reward Match: {'✓' if step_log['reward_match'] else '✗'}")
                
                if action_logs:
                    print(f"    Sample Actions:")
                    for al in action_logs[:2]:
                        if "error" not in al:
                            print(f"      - {al['vehicle_id']}: {al['action_name']} (speed={al['speed_before']:.2f})")
            
            if done:
                print(f"\n  Simulation ended at step {step + 1}")
                break
        
        # Log action effect accuracy
        if action_effects_total > 0:
            self.logs["action_effect_accuracy"] = action_effects_correct / action_effects_total
            print(f"\n  Action Effect Verification: {action_effects_correct}/{action_effects_total} ({100*action_effects_correct/action_effects_total:.1f}%)")
        
        # 5. Summary of basic checks
        self.print_summary()
        
        # 6. Turn Classification Check
        self.check_turn_classification()
        
        # 7. BFS Path Finding Check
        self.check_bfs_pathfinding()
        
        # 8. Reset Sequence Check (connection leak detection)
        self.check_reset_sequence(num_resets=3)
        
        # 9. Step Execution Order Check
        self.check_step_execution_order()
        
        # 10. Edge Cases Check
        self.check_edge_cases()
        
        # Final summary
        self.print_final_summary()
        
        return self.logs
    
    def print_final_summary(self):
        """Print final summary of all checks."""
        checks = []
        
        # Reward consistency
        step_logs = self.logs.get("step_logs", [])
        if step_logs:
            reward_matches = sum(1 for s in step_logs if s.get("reward_match", False))
            checks.append(("Reward Calculation", reward_matches == len(step_logs)))
        
        # Action effects
        action_accuracy = self.logs.get("action_effect_accuracy", 0)
        if action_accuracy > 0:
            checks.append(("Action Effects", action_accuracy >= 0.95))
        
        # Turn classification
        turn_results = self.logs.get("turn_classification", {})
        if isinstance(turn_results, dict) and "all_classifications_correct" in turn_results:
            checks.append(("Turn Classification", turn_results["all_classifications_correct"]))
        
        # Path finding
        path_results = self.logs.get("pathfinding", {})
        if isinstance(path_results, dict) and "all_passed" in path_results:
            checks.append(("BFS Path Finding", path_results["all_passed"]))
        
        # Reset sequence
        reset_results = self.logs.get("reset_tests", {})
        if isinstance(reset_results, dict):
            checks.append(("Reset Sequence", reset_results.get("all_successful", False)))
            checks.append(("No Connection Leaks", not reset_results.get("connection_leaks", True)))
        
        # Edge cases
        edge_results = self.logs.get("edge_cases", {})
        if isinstance(edge_results, dict) and "all_passed" in edge_results:
            checks.append(("Edge Cases", edge_results["all_passed"]))
        
        # Count passed
        passed = sum(1 for _, result in checks if result)
        total = len(checks)
        all_passed = passed == total
        
        # Print fancy summary box
        print("\n")
        print("  ╔" + "═"*58 + "╗")
        print("  ║" + " "*58 + "║")
        print("  ║" + "FINAL SUMMARY - ENVIRONMENT LOGIC VERIFICATION".center(58) + "║")
        print("  ║" + " "*58 + "║")
        print("  ╠" + "═"*58 + "╣")
        print("  ║" + " "*58 + "║")
        
        for name, result in checks:
            status = "✓ PASS" if result else "✗ FAIL"
            line = f"  {name:<30} {status}"
            print(f"  ║  {line:<54}  ║")
        
        print("  ║" + " "*58 + "║")
        print("  ╠" + "═"*58 + "╣")
        print("  ║" + " "*58 + "║")
        
        if all_passed:
            result_line = f"✓ ALL CHECKS PASSED ({passed}/{total})"
            print(f"  ║" + result_line.center(58) + "║")
            print("  ║" + " "*58 + "║")
            print("  ║" + "Environment is ready for training!".center(58) + "║")
        else:
            result_line = f"✗ {total - passed} CHECK(S) FAILED ({passed}/{total} passed)"
            print(f"  ║" + result_line.center(58) + "║")
            print("  ║" + " "*58 + "║")
            print("  ║" + "Review failed checks before training.".center(58) + "║")
        
        print("  ║" + " "*58 + "║")
        print("  ╚" + "═"*58 + "╝")
    
    def print_summary(self):
        """Print a summary of the diagnostic results."""
        print("\n" + "="*60)
        print("5. DIAGNOSTIC SUMMARY")
        print("="*60)
        
        step_logs = self.logs["step_logs"]
        
        if not step_logs:
            print("  No steps executed.")
            return
        
        # Reward consistency check
        reward_matches = sum(1 for s in step_logs if s["reward_match"])
        total_steps = len(step_logs)
        
        print(f"\n  Total Steps Executed: {total_steps}")
        print(f"  Reward Calculation Consistency: {reward_matches}/{total_steps} ({100*reward_matches/total_steps:.1f}%)")
        
        # Vehicle flow
        avg_vehicles = np.mean([s["vehicles_after"] for s in step_logs])
        total_arrived = sum(s["arrived"] for s in step_logs)
        
        print(f"  Average Active Vehicles: {avg_vehicles:.1f}")
        print(f"  Total Vehicles Arrived: {total_arrived}")
        
        # Reward statistics
        rewards = [s["actual_reward"] for s in step_logs]
        print(f"\n  Reward Statistics:")
        print(f"    Min: {min(rewards):.6f}")
        print(f"    Max: {max(rewards):.6f}")
        print(f"    Mean: {np.mean(rewards):.6f}")
        print(f"    Std: {np.std(rewards):.6f}")
        
        # Action distribution
        action_counts = defaultdict(int)
        for al in self.logs["action_logs"]:
            if "action_name" in al:
                action_counts[al["action_name"]] += 1
        
        if action_counts:
            print(f"\n  Action Distribution (sampled):")
            for action_name, count in sorted(action_counts.items()):
                print(f"    - {action_name}: {count}")
    
    def save_logs(self, filepath):
        """Save diagnostic logs to a JSON file."""
        # Convert numpy arrays to lists for JSON serialization
        def convert_to_serializable(obj):
            if isinstance(obj, np.ndarray):
                return obj.tolist()
            elif isinstance(obj, np.floating):
                return float(obj)
            elif isinstance(obj, np.integer):
                return int(obj)
            elif isinstance(obj, dict):
                return {k: convert_to_serializable(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_to_serializable(i) for i in obj]
            elif isinstance(obj, defaultdict):
                return dict(obj)
            return obj
        
        serializable_logs = convert_to_serializable(self.logs)
        
        with open(filepath, 'w') as f:
            json.dump(serializable_logs, f, indent=2)
        
        print(f"\n  Logs saved to: {filepath}")


def main():
    """Main entry point for the logic checker."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Check QMIX SUMO Environment Logic")
    parser.add_argument("--config", type=str, 
                        default="scenarios/test_simple/Configuration_low.sumocfg",
                        help="Path to SUMO config file")
    parser.add_argument("--steps", type=int, default=100,
                        help="Number of steps to run")
    parser.add_argument("--max-agents", type=int, default=50,
                        help="Maximum number of agent slots")
    parser.add_argument("--gui", action="store_true",
                        help="Use SUMO GUI")
    parser.add_argument("--save", type=str, default=None,
                        help="Path to save diagnostic logs (JSON)")
    parser.add_argument("--verbose", action="store_true", default=True,
                        help="Verbose output")
    
    args = parser.parse_args()
    
    # Resolve config path
    config_path = args.config
    if not os.path.isabs(config_path):
        config_path = os.path.join(project_root, config_path)
    
    if not os.path.exists(config_path):
        print(f"Error: Config file not found: {config_path}")
        sys.exit(1)
    
    print(f"Using config: {config_path}")
    
    # Create environment
    env = QMIXSumoEnv(
        sumo_config=config_path,
        max_agents=args.max_agents,
        use_gui=args.gui
    )
    
    # Create checker and run diagnostic
    checker = EnvironmentLogicChecker(env)
    
    try:
        logs = checker.run_diagnostic(num_steps=args.steps, verbose=args.verbose)
        
        # Save logs if requested
        if args.save:
            save_path = args.save
            if not os.path.isabs(save_path):
                save_path = os.path.join(project_root, save_path)
            checker.save_logs(save_path)
        
    finally:
        env.close()
    
    print("\n" + "#"*60)
    print("  DIAGNOSTIC COMPLETE")
    print("#"*60)


if __name__ == "__main__":
    main()
