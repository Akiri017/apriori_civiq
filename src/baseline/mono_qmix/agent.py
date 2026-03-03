import torch
import torch.nn as nn
import torch.nn.functional as F

class AgentNetwork(nn.Module):
    """Individual agent network (DRQN) for computing local Q-values for vehicles.
    
    Architecture:
        - FC layer (input_shape -> 64) + ReLU
        - GRU cell (64 -> 64)
        - FC layer (64 -> n_actions)
    
    This network computes Q_a (individual Q-values) for each vehicle based on
    local observations: 16D vector including ego dynamics, neighbors, TLS, route info.
    
    Action space (6 discrete actions for micro-control):
        0: Accelerate + Stay in lane
        1: Maintain speed + Stay in lane
        2: Decelerate + Stay in lane
        3: Accelerate + Lane change left (if possible)
        4: Maintain speed + Lane change left (if possible)
        5: Decelerate + Lane change right (if possible)
    """
    def __init__(self, input_shape, n_actions=6):
        super(AgentNetwork, self).__init__()
        self.fc1 = nn.Linear(input_shape, 64)
        self.rnn = nn.GRUCell(64, 64)
        self.fc2 = nn.Linear(64, n_actions)

    def forward(self, inputs, hidden_state):
        """Forward pass through the agent network.
        
        Args:
            inputs: [batch_size * n_agents, input_shape] - Local observations
            hidden_state: [batch_size * n_agents, 64] - GRU hidden state
            
        Returns:
            q: [batch_size * n_agents, n_actions] - Q-values for each action
            h: [batch_size * n_agents, 64] - Updated hidden state
        """
        x = F.relu(self.fc1(inputs))  # ReLU pre-GRU
        h = self.rnn(x, hidden_state)
        q = self.fc2(h)
        return q, h