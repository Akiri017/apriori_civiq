class WardropAgent:
    def __init__(self):
        """
        The Wardrop Agent is 'Passive'. 
        The routing logic was pre-calculated by 'marouter' (User Equilibrium).
        """
        print(f">>> BASELINE AGENT: Wardrop Equilibrium (Static Assignment) Active.")
        print(f">>> NOTE: Python rerouting is DISABLED. Vehicles follow optimized XML routes.")

    def act(self, step):
        """
        No action needed. The vehicles follow the smart paths defined in the .rou.xml file.
        """
        pass