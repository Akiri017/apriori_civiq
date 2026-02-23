import os
import torch
import numpy as np
import matplotlib.pyplot as plt
from collections import deque
import random

from baseline.mono_qmix import QMIX_Controller, QMIXSumoEnv

# Hyperparameters
MAX_AGENTS = 50
EPISODES = 100
BATCH_SIZE = 32
BUFFER_CAPACITY = 1000
GAMMA = 0.99
EPSILON_START = 1.0
EPSILON_END = 0.05
EPSILON_DECAY = 0.995
TARGET_UPDATE_FREQ = 10

class ReplayBuffer:
    """Experience replay buffer for QMIX training."""
    def __init__(self, capacity):
        self.buffer = deque(maxlen=capacity)
    
    def push(self, state, obs, actions, reward, next_state, next_obs, done):
        """Store a transition."""
        self.buffer.append((state, obs, actions, reward, next_state, next_obs, done))
    
    def sample(self, batch_size):
        """Sample a batch of transitions."""
        batch = random.sample(self.buffer, batch_size)
        
        # Unzip the batch
        states, obss, actions, rewards, next_states, next_obss, dones = zip(*batch)
        
        return (
            np.array(states),
            np.array(obss),
            np.array(actions),
            np.array(rewards),
            np.array(next_states),
            np.array(next_obss),
            np.array(dones)
        )
    
    def __len__(self):
        return len(self.buffer)

def train_qmix():
    # Initialize Environment
    sumo_config = os.path.join('scenarios', 'test_simple', 'Configuration_med.sumocfg')
    env = QMIXSumoEnv(sumo_config=sumo_config, max_agents=MAX_AGENTS)
    
    # Initialize Controller
    controller = QMIX_Controller(
        n_agents=MAX_AGENTS,
        state_shape=env.state_shape,
        obs_shape=env.obs_shape,
        n_actions=env.n_actions,
        lr=0.0005
    )
    
    buffer = ReplayBuffer(BUFFER_CAPACITY)
    epsilon = EPSILON_START
    rewards_history = []

    print("Starting Monolithic QMIX Training...")
    
    try:
        for ep in range(EPISODES):
            state, obs = env.reset()
            hidden_states = controller.init_hidden()
            episode_reward = 0
            done = False
            
            while not done:
                # Select Actions
                actions, next_hidden = controller.select_actions(obs, hidden_states, epsilon)
                
                # Step Environment
                next_state, next_obs, reward, done = env.step(actions)
                
                # Store in Buffer
                buffer.push(state, obs, actions, reward, next_state, next_obs, done)
                
                # Update State and Obs
                state = next_state
                obs = next_obs
                hidden_states = next_hidden
                episode_reward += reward
                
                # Train if buffer has enough samples
                if len(buffer) > BATCH_SIZE:
                    batch = buffer.sample(BATCH_SIZE)
                    loss = controller.train(batch)
            
            # Decay Epsilon
            epsilon = max(EPSILON_END, epsilon * EPSILON_DECAY)
            rewards_history.append(episode_reward)
            
            # Update Target Networks
            if ep % TARGET_UPDATE_FREQ == 0:
                controller.update_targets()
                
            print(f"Episode {ep+1}/{EPISODES} | Reward: {episode_reward:.2f} | Epsilon: {epsilon:.2f}")
    
    except KeyboardInterrupt:
        print("\n\nTraining interrupted by user. Cleaning up...")
    
    finally:
        # Always close environment cleanly
        env.close()
        print("Environment closed successfully.")
    
    # Save Model (even if interrupted, save progress)
    if len(rewards_history) > 0:
        save_dir = os.path.join('outputs', 'models')
        os.makedirs(save_dir, exist_ok=True)
        torch.save(controller.agent_net.state_dict(), os.path.join(save_dir, "qmix_agent_final.pth"))
        torch.save(controller.mixer.state_dict(), os.path.join(save_dir, "qmix_mixer_final.pth"))
        
        # Plot Results
        fig_dir = os.path.join('outputs', 'figures')
        os.makedirs(fig_dir, exist_ok=True)
        plt.figure(figsize=(10, 6))
        plt.plot(rewards_history)
        plt.title("Monolithic QMIX Training Reward")
        plt.xlabel("Episode")
        plt.ylabel("Total Reward")
        plt.grid(True, alpha=0.3)
        plt.savefig(os.path.join(fig_dir, "qmix_training_curve.png"), dpi=150)
        print(f"Training Complete. Models saved to {save_dir}, figures saved to {fig_dir}")

if __name__ == "__main__":
    # Ensure the scenario path exists before running
    sumo_config = os.path.join('scenarios', 'test_simple', 'Configuration_med.sumocfg')
    if os.path.exists(sumo_config):
        train_qmix()
    else:
        print(f"Error: SUMO configuration file not found at {sumo_config}")
        print("Please check the path and ensure SUMO scenarios are properly set up.")