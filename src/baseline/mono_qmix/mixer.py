import torch
import torch.nn as nn
import torch.nn.functional as F

class MixingNetwork(nn.Module):
    """Mixing network for aggregating individual vehicle Q-values into Q_tot."""
    def __init__(self, n_agents, state_shape, embed_dim=32):
        super(MixingNetwork, self).__init__()
        self.n_agents = n_agents
        self.state_shape = state_shape
        self.embed_dim = embed_dim

        # Hypernetworks for weights and biases
        # w1: [state_shape] -> [n_agents, embed_dim]
        self.hyper_w1 = nn.Linear(state_shape, n_agents * embed_dim)
        # w2: [state_shape] -> [embed_dim, 1]
        self.hyper_w2 = nn.Linear(state_shape, embed_dim)
        
        self.hyper_b1 = nn.Linear(state_shape, embed_dim)
        # V(s) instead of b2 for proper QMIX monotonicity
        self.V = nn.Sequential(
            nn.Linear(state_shape, embed_dim),
            nn.ReLU(),
            nn.Linear(embed_dim, 1)
        )

    def forward(self, agent_qs, states):
        # agent_qs: [batch_size, n_agents]
        # states: [batch_size, state_shape]
        bs = agent_qs.size(0)
        states = states.reshape(-1, self.state_shape)
        agent_qs = agent_qs.view(-1, 1, self.n_agents)

        # First layer weights (must be non-negative)
        w1 = torch.abs(self.hyper_w1(states)).view(-1, self.n_agents, self.embed_dim)
        b1 = self.hyper_b1(states).view(-1, 1, self.embed_dim)
        hidden = F.elu(torch.matmul(agent_qs, w1) + b1)

        # Second layer weights (must be non-negative)
        w2 = torch.abs(self.hyper_w2(states)).view(-1, self.embed_dim, 1)
        
        # State-dependent bias (V(s))
        v = self.V(states).view(-1, 1, 1)

        # Compute Q_tot
        q_tot = torch.matmul(hidden, w2) + v
        return q_tot.view(bs, 1)
