# VERSION 1 OF CONTROLLER

import traci

class CiviqController:
    def __init__(self):
        # Get a list of all traffic light IDs in the map
        self.tls_ids = traci.trafficlight.getIDList()
        print(f">>> CONTROLLER: Connected to {len(self.tls_ids)} Traffic Lights.")

    def apply_action(self, tls_id, action_index):
        """
        Applies a binary action to a specific traffic light.
        0 = Keep Phase (Do nothing)
        1 = Switch Phase (Force change)
        """
        # Safety check: Ignore invalid IDs
        if tls_id not in self.tls_ids:
            return

        # Action 1: Force Switch
        if action_index == 1:
            try:
                # Logic: Get current phase and force it to the next one
                # This overrides the default SUMO timer
                current_phase = traci.trafficlight.getPhase(tls_id)
                traci.trafficlight.setPhase(tls_id, current_phase + 1)
            except traci.TraCIException:
                pass