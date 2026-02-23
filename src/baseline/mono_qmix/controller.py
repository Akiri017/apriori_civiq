import torch
import torch.nn.functional as F
import random

from .agent import AgentNetwork
from .mixer import MixingNetwork

class QMIX_Controller:
    """Main controller for managing the Monolithic QMIX training for vehicles."""
    def __init__(self, n_agents, state_shape, obs_shape, n_actions, lr=0.001, gamma=0.99, device="cpu"):
        self.n_agents = n_agents
        self.n_actions = n_actions
        self.state_shape = state_shape
        self.obs_shape = obs_shape
        self.gamma = gamma
        self.device = device
        
        # Networks
        self.agent_net = AgentNetwork(obs_shape, n_actions).to(device)
        self.mixer = MixingNetwork(n_agents, state_shape).to(device)
        
        # Target Networks
        self.target_agent_net = AgentNetwork(obs_shape, n_actions).to(device)
        self.target_mixer = MixingNetwork(n_agents, state_shape).to(device)
        self.target_agent_net.load_state_dict(self.agent_net.state_dict())
        self.target_mixer.load_state_dict(self.mixer.state_dict())
        
        self.params = list(self.agent_net.parameters()) + list(self.mixer.parameters())
        self.optimizer = torch.optim.Adam(self.params, lr=lr)
        
    def init_hidden(self, batch_size=1):
        """Initialize hidden states for the DRQN."""
        return torch.zeros(batch_size * self.n_agents, 64).to(self.device)

    def select_actions(self, obs, hidden_states, epsilon=0.1):
        """Select actions for all vehicles using epsilon-greedy policy."""
        # obs: [n_agents, obs_shape]
        obs_tensor = torch.FloatTensor(obs).to(self.device)
        
        with torch.no_grad():
            q_values, next_hidden = self.agent_net(obs_tensor, hidden_states)
        
        actions = []
        for i in range(self.n_agents):
            if random.random() < epsilon:
                actions.append(random.randint(0, self.n_actions - 1))
            else:
                actions.append(torch.argmax(q_values[i]).item())
        
        return actions, next_hidden

    def train(self, batch):
        """Perform a single training step on a batch of experiences."""
        # batch: (state, obs, actions, reward, next_state, next_obs, done)
        state, obs, actions, reward, next_state, next_obs, done = batch
        
        # Convert to tensors
        state = torch.FloatTensor(state).to(self.device)
        obs = torch.FloatTensor(obs).to(self.device)
        actions = torch.LongTensor(actions).to(self.device).unsqueeze(-1)
        reward = torch.FloatTensor(reward).to(self.device).view(-1, 1)
        next_state = torch.FloatTensor(next_state).to(self.device)
        next_obs = torch.FloatTensor(next_obs).to(self.device)
        done = torch.FloatTensor(done).to(self.device).view(-1, 1)

        bs = state.shape[0]

        # Current Q-values
        # We simplify by using zero hidden states for the batch training step
        # In a full implementation, we would store and sample the hidden states
        h_init = self.init_hidden(bs)
        q_vals, _ = self.agent_net(obs.view(-1, self.obs_shape), h_init)
        q_vals = q_vals.view(bs, self.n_agents, -1)
        
        # Gather the Q-values for the actions taken
        chosen_q_vals = torch.gather(q_vals, dim=2, index=actions).squeeze(-1)
        
        # Mix into Q_tot
        q_tot = self.mixer(chosen_q_vals, state)

        # Target Q-values
        with torch.no_grad():
            target_h_init = self.init_hidden(bs)
            target_q_vals, _ = self.target_agent_net(next_obs.view(-1, self.obs_shape), target_h_init)
            target_q_vals = target_q_vals.view(bs, self.n_agents, -1)
            
            # Max over actions for the target
            max_target_q_vals = target_q_vals.max(dim=2)[0]
            target_q_tot = self.target_mixer(max_target_q_vals, next_state)
            
            # Bellman equation
            y = reward + self.gamma * (1 - done) * target_q_tot

        # Loss and Optimization
        loss = F.mse_loss(q_tot, y)
        self.optimizer.zero_grad()
        loss.backward()
        
        # Gradient clipping (standard practice in QMIX)
        torch.nn.utils.clip_grad_norm_(self.params, max_norm=10.0)
        
        self.optimizer.step()
        
        return loss.item()

    def update_targets(self):
        """Hard update of target networks."""
        self.target_agent_net.load_state_dict(self.agent_net.state_dict())
        self.target_mixer.load_state_dict(self.mixer.state_dict())
