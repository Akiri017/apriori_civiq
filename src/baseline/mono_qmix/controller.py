import torch
import torch.nn.functional as F
import random

from .agent import AgentNetwork
from .mixer import MixingNetwork

class QMIX_Controller:
    """Main controller for managing the Monolithic QMIX training for vehicles."""
    def __init__(self, n_agents, state_shape, obs_shape, n_actions, lr=0.0005, gamma=0.99, device="cpu"):
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
        # Use RMSProp with original QMIX hyperparameters (Rashid et al., 2018)
        # Learning rate: 0.0005, Smoothing constant (alpha): 0.99, Epsilon: 1e-5
        self.optimizer = torch.optim.RMSprop(self.params, lr=lr, alpha=0.99, eps=1e-5)
        
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
        """
        Perform BPTT training on a sequence batch.
        
        Args:
            batch: Dictionary containing:
                - obs: [batch_size, seq_len+1, n_agents, obs_dim]
                - state: [batch_size, seq_len+1, state_dim]
                - actions: [batch_size, seq_len, n_agents]
                - rewards: [batch_size, seq_len, 1]
                - dones: [batch_size, seq_len, 1]
                - mask: [batch_size, seq_len, 1]  # 1=real, 0=padding
        
        Returns:
            loss: scalar loss value
        """
        # Unpack batch
        obs = batch['obs'].to(self.device)           # [bs, seq_len+1, n_agents, obs_dim]
        state = batch['state'].to(self.device)       # [bs, seq_len+1, state_dim]
        actions = batch['actions'].to(self.device)   # [bs, seq_len, n_agents]
        rewards = batch['rewards'].to(self.device)   # [bs, seq_len, 1]
        dones = batch['dones'].to(self.device)       # [bs, seq_len, 1]
        mask = batch['mask'].to(self.device)         # [bs, seq_len, 1]
        
        bs = obs.shape[0]
        seq_len = actions.shape[1]  # Actual transition length
        n_agents = obs.shape[2]
        obs_dim = obs.shape[3]
        
        # ========================================
        # 1. FORWARD PASS: Q-values for obs_t (unroll through time)
        # ========================================
        h = self.init_hidden(bs)
        q_vals_list = []
        
        # Use obs[0:seq_len] (not including the last obs)
        for t in range(seq_len):
            obs_t = obs[:, t].reshape(bs * n_agents, obs_dim)
            q_t, h = self.agent_net(obs_t, h)  # h maintains gradient flow!
            q_vals_list.append(q_t.view(bs, n_agents, -1))
        
        all_q_vals = torch.stack(q_vals_list, dim=1)  # [bs, seq_len, n_agents, n_actions]
        
        # ========================================
        # 2. Gather Q-values for chosen actions
        # ========================================
        actions_expanded = actions.unsqueeze(-1)  # [bs, seq_len, n_agents, 1]
        chosen_q_vals = torch.gather(all_q_vals, dim=3, index=actions_expanded).squeeze(-1)
        # [bs, seq_len, n_agents]
        
        # ========================================
        # 3. Mix Q-values to get Q_tot(s_t, a_t)
        # ========================================
        q_tot_list = []
        for t in range(seq_len):
            q_tot_t = self.mixer(chosen_q_vals[:, t], state[:, t])
            q_tot_list.append(q_tot_t)
        
        q_tot = torch.stack(q_tot_list, dim=1)  # [bs, seq_len, 1]
        
        # ========================================
        # 4. TARGET: Q-values for obs_{t+1}
        # ========================================
        with torch.no_grad():
            target_h = self.init_hidden(bs)
            target_q_vals_list = []
            
            # Use obs[1:seq_len+1] (next observations)
            for t in range(1, seq_len + 1):
                obs_next = obs[:, t].reshape(bs * n_agents, obs_dim)
                target_q_t, target_h = self.target_agent_net(obs_next, target_h)
                target_q_vals_list.append(target_q_t.view(bs, n_agents, -1))
            
            all_target_q_vals = torch.stack(target_q_vals_list, dim=1)  # [bs, seq_len, n_agents, n_actions]
            
            # Max over actions
            max_target_q_vals = all_target_q_vals.max(dim=3)[0]  # [bs, seq_len, n_agents]
            
            # Mix target Q-values using s_{t+1}
            target_q_tot_list = []
            for t in range(1, seq_len + 1):
                target_q_tot_t = self.target_mixer(max_target_q_vals[:, t-1], state[:, t])
                target_q_tot_list.append(target_q_tot_t)
            
            target_q_tot = torch.stack(target_q_tot_list, dim=1)  # [bs, seq_len, 1]
            
            # Bellman target: r_t + γ * (1 - done_t) * Q_tot(s_{t+1}, argmax_a Q(s_{t+1}, a))
            targets = rewards + self.gamma * (1 - dones) * target_q_tot
        
        # ========================================
        # 5. Masked Loss (CRITICAL: ignore padding!)
        # ========================================
        # TD error
        td_error = (q_tot - targets)  # [bs, seq_len, 1]
        
        # Apply mask to ignore padded timesteps
        masked_td_error = td_error * mask  # [bs, seq_len, 1]
        
        # Mean Squared Error (only over valid timesteps)
        loss = (masked_td_error ** 2).sum() / mask.sum()
        
        # ========================================
        # 6. Optimization
        # ========================================
        self.optimizer.zero_grad()
        loss.backward()  # Gradients flow backward through time!
        
        # Gradient clipping (standard practice in QMIX)
        torch.nn.utils.clip_grad_norm_(self.params, max_norm=10.0)
        
        self.optimizer.step()
        
        return loss.item()

    def update_targets(self):
        """Hard update of target networks."""
        self.target_agent_net.load_state_dict(self.agent_net.state_dict())
        self.target_mixer.load_state_dict(self.mixer.state_dict())
