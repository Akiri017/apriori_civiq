import torch
import torch.nn as nn
import torch.nn.functional as F

class AgentNetwork(nn.Module):
    """Individual agent network (DRQN) for computing local Q-values for vehicles.
    
    Architecture:
        - FC layer (input_shape -> 64)
        - GRU cell (64 -> 64)
        - FC layer (64 -> n_actions)
    
    This network computes Q_a (individual Q-values) for each vehicle based on
    local observations: [speed, dist_to_junction, lane_id_encoded, leader_dist]
    """
    def __init__(self, input_shape, n_actions):
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
        x = F.relu(self.fc1(inputs))
        h = self.rnn(x, hidden_state)
        q = self.fc2(h)
        return q, h