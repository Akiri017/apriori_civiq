import numpy as np
import torch

class EpisodeReplayBuffer:
    """
    Stores complete episodes as sequences for BPTT training.
    
    Each episode contains:
        - obs: [seq_len+1, n_agents, obs_dim] (includes terminal observation)
        - state: [seq_len+1, state_dim]
        - actions: [seq_len, n_agents]
        - rewards: [seq_len, 1]
        - dones: [seq_len, 1]
    
    When sampling, pads shorter episodes and provides masks to ignore padding.
    """
    def __init__(self, capacity, max_seq_len, state_shape, obs_shape, n_agents):
        """
        Args:
            capacity: Maximum number of episodes to store
            max_seq_len: Maximum episode length (for padding)
            state_shape: Dimension of global state
            obs_shape: Dimension of agent observation
            n_agents: Number of agent slots
        """
        self.capacity = capacity
        self.max_seq_len = max_seq_len
        self.n_agents = n_agents
        self.state_shape = state_shape
        self.obs_shape = obs_shape
        
        # Storage for episodes
        self.episodes = []
        self.position = 0
    
    def add_episode(self, episode):
        """
        Add a complete episode.
        
        Args:
            episode: dict with keys:
                - 'obs': [seq_len+1, n_agents, obs_dim]  # Includes terminal obs
                - 'state': [seq_len+1, state_dim]
                - 'actions': [seq_len, n_agents]
                - 'rewards': [seq_len, 1]
                - 'dones': [seq_len, 1]
        """
        if len(self.episodes) < self.capacity:
            self.episodes.append(episode)
        else:
            self.episodes[self.position % self.capacity] = episode
        self.position += 1
    
    def sample(self, batch_size):
        """
        Sample a batch of episode sequences with proper padding and masking.
        
        Returns:
            batch: dict with tensors of shape:
                - obs: [batch_size, max_len+1, n_agents, obs_dim]
                - state: [batch_size, max_len+1, state_dim]
                - actions: [batch_size, max_len, n_agents]
                - rewards: [batch_size, max_len, 1]
                - dones: [batch_size, max_len, 1]
                - mask: [batch_size, max_len, 1]  # 1=real data, 0=padding
        """
        # Sample random episodes
        indices = np.random.choice(len(self.episodes), batch_size, replace=False)
        sampled_episodes = [self.episodes[i] for i in indices]
        
        # Find max sequence length in batch (number of transitions)
        max_len = max(ep['actions'].shape[0] for ep in sampled_episodes)
        
        # Initialize batch arrays
        batch_obs = []
        batch_state = []
        batch_actions = []
        batch_rewards = []
        batch_dones = []
        batch_mask = []
        
        for ep in sampled_episodes:
            seq_len = ep['actions'].shape[0]  # Number of transitions
            pad_len = max_len - seq_len
            
            # ========================================
            # Observations need seq_len+1 (initial + all next states)
            # ========================================
            obs_padded = np.concatenate([
                ep['obs'],  # [seq_len+1, n_agents, obs_dim]
                np.zeros((pad_len, self.n_agents, self.obs_shape))  # Padding
            ], axis=0)
            
            state_padded = np.concatenate([
                ep['state'],  # [seq_len+1, state_dim]
                np.zeros((pad_len, self.state_shape))
            ], axis=0)
            
            # ========================================
            # Actions, rewards, dones have length seq_len
            # ========================================
            actions_padded = np.concatenate([
                ep['actions'],  # [seq_len, n_agents]
                np.zeros((pad_len, self.n_agents), dtype=np.int64)
            ], axis=0)
            
            rewards_padded = np.concatenate([
                ep['rewards'],  # [seq_len, 1]
                np.zeros((pad_len, 1))
            ], axis=0)
            
            dones_padded = np.concatenate([
                ep['dones'],  # [seq_len, 1]
                np.ones((pad_len, 1))  # Padded timesteps marked as "done"
            ], axis=0)
            
            # ========================================
            # Create mask (1 for real data, 0 for padding)
            # ========================================
            mask = np.concatenate([
                np.ones((seq_len, 1)),   # Real transitions
                np.zeros((pad_len, 1))   # Padded transitions
            ], axis=0)
            
            batch_obs.append(obs_padded)
            batch_state.append(state_padded)
            batch_actions.append(actions_padded)
            batch_rewards.append(rewards_padded)
            batch_dones.append(dones_padded)
            batch_mask.append(mask)
        
        return {
            'obs': torch.FloatTensor(np.array(batch_obs)),       # [bs, max_len+1, n_agents, obs_dim]
            'state': torch.FloatTensor(np.array(batch_state)),   # [bs, max_len+1, state_dim]
            'actions': torch.LongTensor(np.array(batch_actions)), # [bs, max_len, n_agents]
            'rewards': torch.FloatTensor(np.array(batch_rewards)), # [bs, max_len, 1]
            'dones': torch.FloatTensor(np.array(batch_dones)),   # [bs, max_len, 1]
            'mask': torch.FloatTensor(np.array(batch_mask))      # [bs, max_len, 1]
        }
    
    def __len__(self):
        return len(self.episodes)
