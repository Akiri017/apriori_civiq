"""
State Builder Logic Checker Script

This script automatically validates the SumoStateBuilder implementation
and logs all important data points for manual verification.

Checks:
1. Observation Vector Construction (16 features per agent)
2. Agent Slot Management (vehicle-to-slot mapping)
3. Neighbor Detection (8-directional features)
4. Global State Assembly (21 globals + concatenated obs)
5. Normalization (value ranges)
6. Edge Cases (empty vehicles, max capacity, slot recycling)
7. Feature Extraction Accuracy (TraCI comparison)
8. Mask Generation (active/inactive agents)
"""

import os
import sys
import math
import time
import numpy as np
from datetime import datetime
from collections import defaultdict
import contextlib
import io

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

import traci
import sumolib

from src.baseline.mono_qmix.state_builder import SumoStateBuilder


class StateBuilderChecker:
    """Diagnostic wrapper to check state builder logic."""
    
    def __init__(self, sumo_config: str, use_gui: bool = False):
        self.sumo_config = sumo_config
        self.use_gui = use_gui
        self.state_builder = SumoStateBuilder(max_agents=50, obs_shape=16, n_junctions=16)
        self.sumo_running = False
        self.logs = {
            "builder_info": {},
            "observation_logs": [],
            "slot_management_logs": [],
            "neighbor_logs": [],
            "global_state_logs": [],
            "normalization_logs": [],
            "edge_case_logs": [],
            "feature_accuracy_logs": [],
            "mask_logs": [],
        }
        self.checks_passed = 0
        self.total_checks = 8
        
    def _start_sumo(self):
        """Start SUMO simulation."""
        if self.sumo_running:
            return
            
        sumo_binary = "sumo-gui" if self.use_gui else "sumo"
        sumo_cmd = [
            sumo_binary,
            "-c", self.sumo_config,
            "--start",
            "--quit-on-end",
            "--no-warnings",
            "--no-step-log",
        ]
        
        # Suppress SUMO verbose output
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            traci.start(sumo_cmd)
        self.sumo_running = True
        
    def _close_sumo(self):
        """Close SUMO simulation."""
        if self.sumo_running:
            try:
                traci.close()
            except:
                pass
            self.sumo_running = False
            
    def _warm_up_simulation(self, steps=50):
        """Run simulation steps to get vehicles on the network."""
        for _ in range(steps):
            traci.simulationStep()
            
    def check_observation_construction(self):
        """Check 1: Observation vector construction (16 features per agent)."""
        print("\n" + "="*60)
        print("1. OBSERVATION VECTOR CONSTRUCTION CHECK")
        print("="*60)
        
        self._start_sumo()
        self._warm_up_simulation(100)  # Get vehicles on network
        
        active_vehicles = list(traci.vehicle.getIDList())
        print(f"\n  Active vehicles: {len(active_vehicles)}")
        
        if len(active_vehicles) == 0:
            print("  ⚠ No vehicles in simulation, skipping detailed check")
            self.logs["observation_logs"].append({"status": "skipped", "reason": "no vehicles"})
            return False
            
        # Update slots and extract observations
        self.state_builder.update_agent_slots(active_vehicles)
        all_obs, global_stats = self.state_builder.extract_vehicle_observations()
        
        # Check observation shape
        expected_shape = (self.state_builder.max_agents, self.state_builder.obs_shape)
        shape_check = all_obs.shape == expected_shape
        
        print(f"\n  Observation Shape:")
        print(f"    Expected: {expected_shape}")
        print(f"    Actual:   {all_obs.shape}")
        print(f"    Status:   {'✓ PASS' if shape_check else '✗ FAIL'}")
        
        # Check feature breakdown for a sample vehicle
        if active_vehicles:
            sample_vid = active_vehicles[0]
            sample_slot = self.state_builder.agent_id_map.get(sample_vid)
            
            if sample_slot is not None:
                sample_obs = all_obs[sample_slot]
                
                print(f"\n  Sample Vehicle: {sample_vid} (slot {sample_slot})")
                print(f"  " + "-"*50)
                print(f"  Feature Breakdown (16D):")
                
                feature_names = [
                    "X Position (norm)",
                    "Y Position (norm)",
                    "Speed (m/s)",
                    "Acceleration (m/s²)",
                    "Lane Index",
                    "Front: Rel Speed",
                    "Front: Distance",
                    "Rear: Rel Speed",
                    "Rear: Distance",
                    "Left Front: Rel Speed",
                    "Left Front: Distance",
                    "Right Front: Rel Speed",
                    "Right Front: Distance",
                    "Junction Distance (m)",
                    "TLS State (-1/0/0.5/1)",
                    "Route Progress (0-1)"
                ]
                
                print(f"\n  {'Index':<6} {'Feature':<25} {'Value':<15}")
                print(f"  {'-'*6} {'-'*25} {'-'*15}")
                for i, (name, val) in enumerate(zip(feature_names, sample_obs)):
                    print(f"  {i:<6} {name:<25} {val:.4f}")
        
        # Check global stats
        print(f"\n  Global Statistics:")
        print(f"    Total Speed: {global_stats['total_speed']:.2f}")
        print(f"    Total Wait:  {global_stats['total_wait']:.2f}")
        
        self.logs["observation_logs"].append({
            "shape_check": shape_check,
            "expected_shape": expected_shape,
            "actual_shape": all_obs.shape,
            "n_vehicles": len(active_vehicles),
            "global_stats": global_stats
        })
        
        if shape_check:
            self.checks_passed += 1
            print("\n  ✓ CHECK 1 PASSED: Observation construction correct")
        else:
            print("\n  ✗ CHECK 1 FAILED: Shape mismatch")
            
        return shape_check
        
    def check_agent_slot_management(self):
        """Check 2: Agent slot management (vehicle-to-slot mapping)."""
        print("\n" + "="*60)
        print("2. AGENT SLOT MANAGEMENT CHECK")
        print("="*60)
        
        # Reset state builder
        self.state_builder.reset()
        
        # Simulate vehicles entering
        vehicles_wave1 = ["veh_1", "veh_2", "veh_3"]
        self.state_builder.update_agent_slots(vehicles_wave1)
        
        print(f"\n  Wave 1 Vehicles: {vehicles_wave1}")
        print(f"  Slot Mapping: {dict(self.state_builder.agent_id_map)}")
        
        slots_wave1 = set(self.state_builder.agent_id_map.values())
        wave1_check = slots_wave1 == {0, 1, 2}
        print(f"  Expected Slots: {{0, 1, 2}}")
        print(f"  Actual Slots:   {slots_wave1}")
        print(f"  Status: {'✓ PASS' if wave1_check else '✗ FAIL'}")
        
        # Simulate veh_2 leaving, new vehicles entering
        vehicles_wave2 = ["veh_1", "veh_3", "veh_4", "veh_5"]
        self.state_builder.update_agent_slots(vehicles_wave2)
        
        print(f"\n  Wave 2 Vehicles: {vehicles_wave2}")
        print(f"  (veh_2 left, veh_4 & veh_5 entered)")
        print(f"  Slot Mapping: {dict(self.state_builder.agent_id_map)}")
        
        # veh_4 should get slot 1 (recycled from veh_2), veh_5 gets slot 3
        slot_veh4 = self.state_builder.agent_id_map.get("veh_4")
        slot_veh5 = self.state_builder.agent_id_map.get("veh_5")
        
        wave2_check = (
            self.state_builder.agent_id_map.get("veh_1") == 0 and
            self.state_builder.agent_id_map.get("veh_3") == 2 and
            slot_veh4 == 1 and  # Recycled slot
            slot_veh5 == 3     # Next available
        )
        
        print(f"\n  Slot Recycling Check:")
        print(f"    veh_1 should keep slot 0: {self.state_builder.agent_id_map.get('veh_1')} {'✓' if self.state_builder.agent_id_map.get('veh_1') == 0 else '✗'}")
        print(f"    veh_3 should keep slot 2: {self.state_builder.agent_id_map.get('veh_3')} {'✓' if self.state_builder.agent_id_map.get('veh_3') == 2 else '✗'}")
        print(f"    veh_4 should get slot 1 (recycled): {slot_veh4} {'✓' if slot_veh4 == 1 else '✗'}")
        print(f"    veh_5 should get slot 3: {slot_veh5} {'✓' if slot_veh5 == 3 else '✗'}")
        
        self.logs["slot_management_logs"].append({
            "wave1_check": wave1_check,
            "wave2_check": wave2_check,
            "final_mapping": dict(self.state_builder.agent_id_map)
        })
        
        passed = wave1_check and wave2_check
        if passed:
            self.checks_passed += 1
            print("\n  ✓ CHECK 2 PASSED: Slot management working correctly")
        else:
            print("\n  ✗ CHECK 2 FAILED: Slot management issues")
            
        return passed
        
    def check_neighbor_detection(self):
        """Check 3: Neighbor detection (8-directional features)."""
        print("\n" + "="*60)
        print("3. NEIGHBOR DETECTION CHECK")
        print("="*60)
        
        self._start_sumo()
        self._warm_up_simulation(150)  # Get more vehicles for neighbor detection
        
        active_vehicles = list(traci.vehicle.getIDList())
        
        if len(active_vehicles) < 2:
            print("  ⚠ Not enough vehicles for neighbor detection test")
            self.logs["neighbor_logs"].append({"status": "skipped", "reason": "insufficient vehicles"})
            return True  # Skip but don't fail
            
        # Find a vehicle with neighbors
        test_vehicle = None
        for vid in active_vehicles:
            try:
                leader = traci.vehicle.getLeader(vid, dist=100)
                if leader and leader[0]:
                    test_vehicle = vid
                    break
            except:
                continue
                
        if not test_vehicle:
            print("  ⚠ No vehicle with neighbors found")
            self.logs["neighbor_logs"].append({"status": "skipped", "reason": "no neighbors found"})
            return True
            
        print(f"\n  Test Vehicle: {test_vehicle}")
        
        # Get neighbors using state builder
        neighbors = self.state_builder._get_neighbor_states(test_vehicle)
        
        print(f"\n  Neighbor State Vector (8 values):")
        print(f"  " + "-"*50)
        neighbor_labels = [
            ("Front Relative Speed", "Front Distance"),
            ("Rear Relative Speed", "Rear Distance"),
            ("Left Front Rel Speed", "Left Front Distance"),
            ("Right Front Rel Speed", "Right Front Distance"),
        ]
        
        neighbor_check = True
        for i, (speed_label, dist_label) in enumerate(neighbor_labels):
            idx = i * 2
            if idx + 1 < len(neighbors):
                rel_speed = neighbors[idx]
                distance = neighbors[idx + 1]
                print(f"    {speed_label}: {rel_speed:.2f} m/s")
                print(f"    {dist_label}: {distance:.2f} m")
                print()
                
                # Check distance is non-negative
                if distance < 0:
                    neighbor_check = False
                    print(f"    ✗ Invalid negative distance!")
        
        # Verify vector length
        length_check = len(neighbors) == 8
        print(f"  Vector Length: {len(neighbors)} (expected 8)")
        print(f"  Status: {'✓ PASS' if length_check else '✗ FAIL'}")
        
        # Verify against TraCI direct call
        try:
            leader = traci.vehicle.getLeader(test_vehicle, dist=100)
            if leader and leader[0]:
                ego_speed = traci.vehicle.getSpeed(test_vehicle)
                leader_speed = traci.vehicle.getSpeed(leader[0])
                expected_rel_speed = leader_speed - ego_speed
                actual_rel_speed = neighbors[0]
                
                print(f"\n  TraCI Verification (Front Vehicle):")
                print(f"    Leader ID: {leader[0]}")
                print(f"    Expected Rel Speed: {expected_rel_speed:.2f}")
                print(f"    Actual Rel Speed:   {actual_rel_speed:.2f}")
                print(f"    Match: {'✓' if abs(expected_rel_speed - actual_rel_speed) < 0.01 else '✗'}")
        except:
            pass
            
        self.logs["neighbor_logs"].append({
            "test_vehicle": test_vehicle,
            "neighbors": neighbors,
            "length_check": length_check,
            "neighbor_check": neighbor_check
        })
        
        passed = length_check and neighbor_check
        if passed:
            self.checks_passed += 1
            print("\n  ✓ CHECK 3 PASSED: Neighbor detection working correctly")
        else:
            print("\n  ✗ CHECK 3 FAILED: Neighbor detection issues")
            
        return passed
        
    def check_global_state_assembly(self):
        """Check 4: Global state assembly (21 globals + concatenated obs)."""
        print("\n" + "="*60)
        print("4. GLOBAL STATE ASSEMBLY CHECK")
        print("="*60)
        
        self._start_sumo()
        self._warm_up_simulation(100)
        
        active_vehicles = list(traci.vehicle.getIDList())
        
        # Get junction IDs
        try:
            junction_ids = list(traci.trafficlight.getIDList())[:16]
        except:
            junction_ids = []
            
        print(f"\n  Input Parameters:")
        print(f"    Active Vehicles: {len(active_vehicles)}")
        print(f"    Junction IDs: {len(junction_ids)}")
        
        # Build flat state
        self.state_builder.reset()
        global_state, all_obs = self.state_builder.build_flat_state(
            active_vehicles=active_vehicles,
            junction_ids=junction_ids,
            throughput_count=5,  # Test value
            step_count=100,
            max_steps=3600
        )
        
        # Expected shape calculation
        # global_features(5) + junction_congestion(16) + flattened_obs(50*16)
        expected_global_features = 5
        expected_junction = self.state_builder.n_junctions  # 16
        expected_obs_flat = self.state_builder.max_agents * self.state_builder.obs_shape  # 50*16=800
        expected_total = expected_global_features + expected_junction + expected_obs_flat
        
        print(f"\n  Global State Shape Breakdown:")
        print(f"  " + "-"*50)
        print(f"    Global Features (5):")
        print(f"      [0] n_vehicles:    {global_state[0]:.0f}")
        print(f"      [1] avg_speed:     {global_state[1]:.2f}")
        print(f"      [2] total_wait:    {global_state[2]:.2f}")
        print(f"      [3] throughput:    {global_state[3]:.0f}")
        print(f"      [4] norm_time:     {global_state[4]:.4f}")
        
        print(f"\n    Junction Congestion ({expected_junction}):")
        junction_congestion = global_state[5:5+expected_junction]
        print(f"      Sum of waiting vehicles: {junction_congestion.sum():.0f}")
        print(f"      Max at single junction:  {junction_congestion.max():.0f}")
        
        print(f"\n    Flattened Observations ({expected_obs_flat}):")
        obs_flat = global_state[5+expected_junction:]
        print(f"      Length: {len(obs_flat)}")
        print(f"      Non-zero elements: {np.count_nonzero(obs_flat)}")
        
        # Shape verification
        shape_check = len(global_state) == expected_total
        print(f"\n  Total State Shape:")
        print(f"    Expected: 5 + {expected_junction} + {expected_obs_flat} = {expected_total}")
        print(f"    Actual:   {len(global_state)}")
        print(f"    Status:   {'✓ PASS' if shape_check else '✗ FAIL'}")
        
        # Verify all_obs shape
        obs_shape_check = all_obs.shape == (self.state_builder.max_agents, self.state_builder.obs_shape)
        print(f"\n  Observation Array Shape:")
        print(f"    Expected: ({self.state_builder.max_agents}, {self.state_builder.obs_shape})")
        print(f"    Actual:   {all_obs.shape}")
        print(f"    Status:   {'✓ PASS' if obs_shape_check else '✗ FAIL'}")
        
        self.logs["global_state_logs"].append({
            "global_state_shape": len(global_state),
            "expected_shape": expected_total,
            "shape_check": shape_check,
            "obs_shape_check": obs_shape_check,
            "global_features": global_state[:5].tolist()
        })
        
        passed = shape_check and obs_shape_check
        if passed:
            self.checks_passed += 1
            print("\n  ✓ CHECK 4 PASSED: Global state assembly correct")
        else:
            print("\n  ✗ CHECK 4 FAILED: State assembly issues")
            
        return passed
        
    def check_normalization(self):
        """Check 5: Normalization (value ranges)."""
        print("\n" + "="*60)
        print("5. NORMALIZATION CHECK")
        print("="*60)
        
        self._start_sumo()
        self._warm_up_simulation(100)
        
        active_vehicles = list(traci.vehicle.getIDList())
        self.state_builder.reset()
        self.state_builder.update_agent_slots(active_vehicles)
        all_obs, _ = self.state_builder.extract_vehicle_observations()
        
        # Check value ranges for each feature
        print("\n  Feature Value Range Analysis:")
        print(f"  " + "-"*60)
        
        feature_specs = [
            ("X Position (norm)", 0, None, 2.0),      # Should be roughly 0-1 (normalized to 1km)
            ("Y Position (norm)", 1, None, 2.0),
            ("Speed (m/s)", 2, 0.0, 50.0),            # 0-50 m/s typical
            ("Acceleration (m/s²)", 3, -10.0, 10.0),  # -10 to +10 typical
            ("Lane Index", 4, 0.0, 10.0),             # 0-based integer
            ("Front Rel Speed", 5, -50.0, 50.0),
            ("Front Distance", 6, 0.0, 100.0),
            ("Rear Rel Speed", 7, -50.0, 50.0),
            ("Rear Distance", 8, 0.0, 100.0),
            ("Left Front Rel Speed", 9, -50.0, 50.0),
            ("Left Front Distance", 10, 0.0, 100.0),
            ("Right Front Rel Speed", 11, -50.0, 50.0),
            ("Right Front Distance", 12, 0.0, 100.0),
            ("Junction Distance", 13, 0.0, 500.0),
            ("TLS State", 14, -1.0, 1.0),
            ("Route Progress", 15, 0.0, 1.0),
        ]
        
        # Get only active slots
        active_slots = list(self.state_builder.agent_id_map.values())
        active_obs = all_obs[active_slots] if active_slots else all_obs[:1]
        
        range_issues = []
        print(f"\n  {'Feature':<25} {'Min':<10} {'Max':<10} {'Expected Range':<20} {'Status'}")
        print(f"  {'-'*25} {'-'*10} {'-'*10} {'-'*20} {'-'*8}")
        
        for name, idx, exp_min, exp_max in feature_specs:
            if len(active_obs) > 0:
                col = active_obs[:, idx]
                actual_min = col.min()
                actual_max = col.max()
            else:
                actual_min = actual_max = 0.0
            
            # Check if within expected range (with some tolerance)
            in_range = True
            if exp_min is not None and actual_min < exp_min - 1.0:
                in_range = False
            if exp_max is not None and actual_max > exp_max + 1.0:
                in_range = False
                
            status = "✓" if in_range else "✗"
            if not in_range:
                range_issues.append(name)
                
            exp_range = f"[{exp_min if exp_min else '-∞'}, {exp_max if exp_max else '∞'}]"
            print(f"  {name:<25} {actual_min:<10.2f} {actual_max:<10.2f} {exp_range:<20} {status}")
        
        self.logs["normalization_logs"].append({
            "active_agents": len(active_slots),
            "range_issues": range_issues
        })
        
        passed = len(range_issues) == 0
        if passed:
            self.checks_passed += 1
            print("\n  ✓ CHECK 5 PASSED: All values within expected ranges")
        else:
            print(f"\n  ✗ CHECK 5 FAILED: Range issues in: {range_issues}")
            
        return passed
        
    def check_edge_cases(self):
        """Check 6: Edge cases (empty vehicles, max capacity, slot recycling)."""
        print("\n" + "="*60)
        print("6. EDGE CASES CHECK")
        print("="*60)
        
        tests_passed = 0
        total_tests = 4
        
        # Test 1: Empty vehicle list
        print("\n  Test 6.1: Empty Vehicle List")
        print(f"  " + "-"*50)
        self.state_builder.reset()
        self.state_builder.update_agent_slots([])
        
        empty_check = len(self.state_builder.agent_id_map) == 0
        print(f"    Agent Map: {dict(self.state_builder.agent_id_map)}")
        print(f"    Status: {'✓ PASS' if empty_check else '✗ FAIL'}")
        if empty_check:
            tests_passed += 1
            
        # Test 2: Max capacity
        print("\n  Test 6.2: Max Capacity Handling")
        print(f"  " + "-"*50)
        self.state_builder.reset()
        max_agents = self.state_builder.max_agents
        overflow_vehicles = [f"veh_{i}" for i in range(max_agents + 10)]
        self.state_builder.update_agent_slots(overflow_vehicles)
        
        assigned_count = len(self.state_builder.agent_id_map)
        max_check = assigned_count == max_agents
        print(f"    Requested Vehicles: {len(overflow_vehicles)}")
        print(f"    Max Agents Limit:   {max_agents}")
        print(f"    Assigned Slots:     {assigned_count}")
        print(f"    Status: {'✓ PASS' if max_check else '✗ FAIL'}")
        if max_check:
            tests_passed += 1
            
        # Test 3: Slot recycling after all vehicles leave
        print("\n  Test 6.3: Complete Slot Reset")
        print(f"  " + "-"*50)
        self.state_builder.update_agent_slots(["veh_A", "veh_B"])
        print(f"    After adding veh_A, veh_B: {dict(self.state_builder.agent_id_map)}")
        
        self.state_builder.update_agent_slots([])
        print(f"    After all leave: {dict(self.state_builder.agent_id_map)}")
        
        new_vehicles = ["veh_X"]
        self.state_builder.update_agent_slots(new_vehicles)
        print(f"    After veh_X enters: {dict(self.state_builder.agent_id_map)}")
        
        recycle_check = self.state_builder.agent_id_map.get("veh_X") == 0
        print(f"    veh_X should get slot 0: {self.state_builder.agent_id_map.get('veh_X')}")
        print(f"    Status: {'✓ PASS' if recycle_check else '✗ FAIL'}")
        if recycle_check:
            tests_passed += 1
            
        # Test 4: Observation with missing TraCI data
        print("\n  Test 6.4: Graceful Error Handling")
        print(f"  " + "-"*50)
        self.state_builder.reset()
        
        # Add fake vehicle IDs that don't exist in simulation
        fake_vehicles = ["fake_veh_1", "fake_veh_2"]
        self.state_builder.update_agent_slots(fake_vehicles)
        
        # Try to extract observations (should not crash)
        try:
            self._start_sumo()
            all_obs, global_stats = self.state_builder.extract_vehicle_observations()
            error_check = True
            print(f"    Processing fake vehicle IDs: No crash")
            print(f"    Observations shape: {all_obs.shape}")
            print(f"    Status: ✓ PASS")
        except Exception as e:
            error_check = False
            print(f"    Error: {str(e)[:50]}")
            print(f"    Status: ✗ FAIL")
            
        if error_check:
            tests_passed += 1
            
        self.logs["edge_case_logs"].append({
            "tests_passed": tests_passed,
            "total_tests": total_tests,
            "empty_check": empty_check,
            "max_check": max_check,
            "recycle_check": recycle_check,
            "error_check": error_check
        })
        
        passed = tests_passed == total_tests
        if passed:
            self.checks_passed += 1
            print(f"\n  ✓ CHECK 6 PASSED: All edge cases handled ({tests_passed}/{total_tests})")
        else:
            print(f"\n  ✗ CHECK 6 FAILED: {tests_passed}/{total_tests} edge case tests passed")
            
        return passed
        
    def check_feature_extraction_accuracy(self):
        """Check 7: Feature extraction accuracy (TraCI comparison)."""
        print("\n" + "="*60)
        print("7. FEATURE EXTRACTION ACCURACY CHECK")
        print("="*60)
        
        self._start_sumo()
        self._warm_up_simulation(100)
        
        active_vehicles = list(traci.vehicle.getIDList())
        
        if len(active_vehicles) == 0:
            print("  ⚠ No vehicles available for accuracy check")
            self.logs["feature_accuracy_logs"].append({"status": "skipped"})
            return True
            
        self.state_builder.reset()
        self.state_builder.update_agent_slots(active_vehicles)
        all_obs, _ = self.state_builder.extract_vehicle_observations()
        
        # Pick a sample vehicle to verify
        sample_vid = active_vehicles[0]
        sample_slot = self.state_builder.agent_id_map.get(sample_vid)
        
        if sample_slot is None:
            print("  ⚠ Sample vehicle not in slot map")
            return True
            
        sample_obs = all_obs[sample_slot]
        
        print(f"\n  Verifying vehicle: {sample_vid} (slot {sample_slot})")
        print(f"  " + "-"*50)
        
        accuracy_results = []
        
        # Get ground truth from TraCI
        try:
            pos = traci.vehicle.getPosition(sample_vid)
            speed = traci.vehicle.getSpeed(sample_vid)
            accel = traci.vehicle.getAcceleration(sample_vid)
            lane_idx = traci.vehicle.getLaneIndex(sample_vid)
            
            # Compare with observations
            checks = [
                ("X Position (norm)", sample_obs[0], pos[0] / 1000.0),
                ("Y Position (norm)", sample_obs[1], pos[1] / 1000.0),
                ("Speed", sample_obs[2], speed),
                ("Acceleration", sample_obs[3], accel),
                ("Lane Index", sample_obs[4], float(lane_idx)),
            ]
            
            print(f"\n  {'Feature':<20} {'Observed':<12} {'TraCI':<12} {'Diff':<10} {'Status'}")
            print(f"  {'-'*20} {'-'*12} {'-'*12} {'-'*10} {'-'*8}")
            
            all_accurate = True
            for name, obs_val, traci_val in checks:
                diff = abs(obs_val - traci_val)
                is_accurate = diff < 0.01  # Tolerance
                status = "✓" if is_accurate else "✗"
                if not is_accurate:
                    all_accurate = False
                    
                print(f"  {name:<20} {obs_val:<12.4f} {traci_val:<12.4f} {diff:<10.4f} {status}")
                accuracy_results.append({
                    "feature": name,
                    "observed": obs_val,
                    "traci": traci_val,
                    "accurate": is_accurate
                })
                
        except Exception as e:
            print(f"  ⚠ Error getting TraCI data: {e}")
            all_accurate = False
            
        self.logs["feature_accuracy_logs"].append({
            "sample_vehicle": sample_vid,
            "accuracy_results": accuracy_results
        })
        
        if all_accurate:
            self.checks_passed += 1
            print("\n  ✓ CHECK 7 PASSED: Feature extraction matches TraCI")
        else:
            print("\n  ✗ CHECK 7 FAILED: Feature mismatch detected")
            
        return all_accurate
        
    def check_mask_generation(self):
        """Check 8: Mask generation (active/inactive agents)."""
        print("\n" + "="*60)
        print("8. MASK GENERATION CHECK")
        print("="*60)
        
        self._start_sumo()
        self._warm_up_simulation(100)
        
        active_vehicles = list(traci.vehicle.getIDList())
        
        self.state_builder.reset()
        self.state_builder.update_agent_slots(active_vehicles)
        all_obs, _ = self.state_builder.extract_vehicle_observations()
        
        # Generate mask based on agent_id_map
        mask = np.zeros(self.state_builder.max_agents, dtype=np.float32)
        for slot in self.state_builder.agent_id_map.values():
            mask[slot] = 1.0
            
        n_active = int(mask.sum())
        n_mapped = len(self.state_builder.agent_id_map)
        
        print(f"\n  Mask Statistics:")
        print(f"  " + "-"*50)
        print(f"    Max Agents:      {self.state_builder.max_agents}")
        print(f"    Active Vehicles: {len(active_vehicles)}")
        print(f"    Mapped Agents:   {n_mapped}")
        print(f"    Mask Sum:        {n_active}")
        
        # Verify mask matches agent_id_map
        mask_check = n_active == n_mapped
        print(f"\n    Mask Sum == Mapped Agents: {'✓ PASS' if mask_check else '✗ FAIL'}")
        
        # Verify observations are non-zero only for active slots
        obs_check = True
        for slot in range(self.state_builder.max_agents):
            is_active = slot in self.state_builder.agent_id_map.values()
            obs_nonzero = np.any(all_obs[slot] != 0)
            
            # Active slots should have non-zero obs (usually)
            # Inactive slots should have zero obs
            if not is_active and obs_nonzero:
                obs_check = False
                print(f"    ⚠ Inactive slot {slot} has non-zero observations")
                break
                
        print(f"    Inactive Slots Zero Check: {'✓ PASS' if obs_check else '✗ FAIL'}")
        
        # Sample mask visualization
        print(f"\n  Mask Sample (first 20 slots):")
        print(f"    {mask[:20].astype(int).tolist()}")
        
        self.logs["mask_logs"].append({
            "n_active": n_active,
            "n_mapped": n_mapped,
            "mask_check": mask_check,
            "obs_check": obs_check
        })
        
        passed = mask_check and obs_check
        if passed:
            self.checks_passed += 1
            print("\n  ✓ CHECK 8 PASSED: Mask generation correct")
        else:
            print("\n  ✗ CHECK 8 FAILED: Mask generation issues")
            
        return passed
        
    def run_all_checks(self):
        """Run all state builder checks."""
        print("\n" + "="*60)
        print("     SUMO STATE BUILDER DIAGNOSTIC")
        print("="*60)
        print(f"  Config: {self.sumo_config}")
        print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        self.logs["builder_info"] = {
            "max_agents": self.state_builder.max_agents,
            "obs_shape": self.state_builder.obs_shape,
            "n_junctions": self.state_builder.n_junctions
        }
        
        print(f"\n  Builder Configuration:")
        print(f"    Max Agents:   {self.state_builder.max_agents}")
        print(f"    Obs Shape:    {self.state_builder.obs_shape}")
        print(f"    N Junctions:  {self.state_builder.n_junctions}")
        
        try:
            # Run all checks
            self.check_observation_construction()
            self._close_sumo()
            
            self.check_agent_slot_management()
            
            self._start_sumo()
            self.check_neighbor_detection()
            self._close_sumo()
            
            self._start_sumo()
            self.check_global_state_assembly()
            self._close_sumo()
            
            self._start_sumo()
            self.check_normalization()
            self._close_sumo()
            
            self.check_edge_cases()
            self._close_sumo()
            
            self._start_sumo()
            self.check_feature_extraction_accuracy()
            self._close_sumo()
            
            self._start_sumo()
            self.check_mask_generation()
            
        finally:
            self._close_sumo()
            
        # Print summary
        self._print_summary()
        
    def _print_summary(self):
        """Print final summary of all checks."""
        print("\n" + "="*60)
        print("     FINAL SUMMARY")
        print("="*60)
        
        check_names = [
            "Observation Construction",
            "Agent Slot Management",
            "Neighbor Detection",
            "Global State Assembly",
            "Normalization",
            "Edge Cases",
            "Feature Extraction Accuracy",
            "Mask Generation"
        ]
        
        print(f"\n  {'Check':<30} {'Status'}")
        print(f"  {'-'*30} {'-'*10}")
        
        # Determine status from logs
        statuses = [
            self.logs["observation_logs"][0].get("shape_check", False) if self.logs["observation_logs"] else False,
            self.logs["slot_management_logs"][0].get("wave1_check", False) and self.logs["slot_management_logs"][0].get("wave2_check", False) if self.logs["slot_management_logs"] else False,
            self.logs["neighbor_logs"][0].get("length_check", True) if self.logs["neighbor_logs"] else True,
            self.logs["global_state_logs"][0].get("shape_check", False) if self.logs["global_state_logs"] else False,
            len(self.logs["normalization_logs"][0].get("range_issues", ["fail"])) == 0 if self.logs["normalization_logs"] else False,
            self.logs["edge_case_logs"][0].get("tests_passed", 0) == 4 if self.logs["edge_case_logs"] else False,
            all([r.get("accurate", False) for r in self.logs["feature_accuracy_logs"][0].get("accuracy_results", [{"accurate": False}])]) if self.logs["feature_accuracy_logs"] else False,
            self.logs["mask_logs"][0].get("mask_check", False) and self.logs["mask_logs"][0].get("obs_check", False) if self.logs["mask_logs"] else False,
        ]
        
        for name, passed in zip(check_names, statuses):
            status = "✓ PASS" if passed else "✗ FAIL"
            print(f"  {name:<30} {status}")
            
        passed_count = sum(statuses)
        print(f"\n  " + "="*42)
        print(f"  RESULT: {passed_count}/{self.total_checks} checks passed")
        print(f"  " + "="*42)
        
        if passed_count == self.total_checks:
            print("\n  ✓ STATE BUILDER VALIDATION SUCCESSFUL")
            print("    All components working correctly.")
        else:
            print(f"\n  ⚠ {self.total_checks - passed_count} check(s) failed")
            print("    Review failed checks above for details.")


if __name__ == "__main__":
    # Default SUMO config path
    default_config = os.path.join(
        project_root, 
        "scenarios", "bgc_full", "osm.sumocfg"
    )
    
    # Check if config exists
    if not os.path.exists(default_config):
        # Try alternative path
        default_config = os.path.join(
            project_root,
            "scenarios", "test_simple", "Configuration_low.sumocfg"
        )
    
    print(f"Using SUMO config: {default_config}")
    
    # Create checker and run
    checker = StateBuilderChecker(
        sumo_config=default_config,
        use_gui=False
    )
    checker.run_all_checks()
