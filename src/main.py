import os
import torch
import numpy as np
import matplotlib.pyplot as plt
import random

from baseline.mono_qmix import QMIX_Controller, QMIXSumoEnv
from baseline.mono_qmix.replay_buffer import EpisodeReplayBuffer

# Hyperparameters
MAX_AGENTS = 50
EPISODES = 100
BATCH_SIZE = 32  # Episode batch size
BUFFER_CAPACITY = 5000  # Number of episodes to store
MAX_EPISODE_LENGTH = 3600  # Max timesteps per episode
GAMMA = 0.99
EPSILON_START = 1.0
EPSILON_END = 0.05
EPSILON_DECAY = 0.995
TARGET_UPDATE_FREQ = 200
MIN_BUFFER_SIZE = 128  # Minimum episodes before training starts

def train_qmix():
    """Train Monolithic QMIX with episodic replay buffer and BPTT."""
    # Initialize Environment
    sumo_config = os.path.join('scenarios', 'test_simple', 'Configuration_med.sumocfg')
    env = QMIXSumoEnv(sumo_config=sumo_config, max_agents=MAX_AGENTS, use_gui=True)
    
    # Initialize Controller
    controller = QMIX_Controller(
        n_agents=MAX_AGENTS,
        state_shape=env.state_shape,
        obs_shape=env.obs_shape,
        n_actions=env.n_actions,
        lr=0.0005,
        gamma=GAMMA
    )
    
    # Initialize Episode Replay Buffer
    replay_buffer = EpisodeReplayBuffer(
        capacity=BUFFER_CAPACITY,
        max_seq_len=MAX_EPISODE_LENGTH,
        state_shape=env.state_shape,
        obs_shape=env.obs_shape,
        n_agents=MAX_AGENTS
    )
    
    epsilon = EPSILON_START
    rewards_history = []
    loss_history = []

    print("Starting Monolithic QMIX Training with BPTT...")
    print(f"Observation shape: {env.obs_shape}D (expanded state space)")
    print(f"Action space: {env.n_actions} (micro-control)")
    print(f"Max agents: {MAX_AGENTS}")
    
    try:
        for ep in range(EPISODES):
            # ===== EPISODE DATA COLLECTION =====
            state, obs = env.reset()
            hidden = controller.init_hidden(batch_size=1)
            
            # Storage for current episode
            episode_data = {
                'obs': [],
                'state': [],
                'actions': [],
                'rewards': [],
                'dones': []
            }
            
            # Store initial observation and state
            episode_data['obs'].append(obs)
            episode_data['state'].append(state)
            
            episode_reward = 0
            done = False
            t = 0
            
            while not done and t < MAX_EPISODE_LENGTH:
                # Select actions with current hidden state
                actions, hidden = controller.select_actions(obs, hidden, epsilon)
                
                # Environment step
                next_state, next_obs, reward, done = env.step(actions)
                
                # Store transition
                episode_data['actions'].append(actions)
                episode_data['rewards'].append([reward])  # Global reward
                episode_data['dones'].append([float(done)])
                
                # Store next observation and state
                episode_data['obs'].append(next_obs)
                episode_data['state'].append(next_state)
                
                # Update for next iteration
                obs = next_obs
                state = next_state
                episode_reward += reward
                t += 1
            
            # ===== STORE EPISODE IN REPLAY BUFFER =====
            # Convert to numpy arrays
            # obs and state have length T+1 (initial + T transitions)
            # actions, rewards, dones have length T
            episode = {
                'obs': np.array(episode_data['obs']),          # [T+1, n_agents, obs_dim]
                'state': np.array(episode_data['state']),      # [T+1, state_dim]
                'actions': np.array(episode_data['actions']),  # [T, n_agents]
                'rewards': np.array(episode_data['rewards']),  # [T, 1]
                'dones': np.array(episode_data['dones'])       # [T, 1]
            }
            
            replay_buffer.add_episode(episode)
            
            # ===== TRAINING STEP =====
            mean_loss = 0.0
            if len(replay_buffer) >= MIN_BUFFER_SIZE:
                # Sample episode batch and train
                batch = replay_buffer.sample(BATCH_SIZE)
                loss = controller.train(batch)
                mean_loss = loss
                loss_history.append(loss)
            
            # Decay Epsilon
            epsilon = max(EPSILON_END, epsilon * EPSILON_DECAY)
            rewards_history.append(episode_reward)
            
            # ===== UPDATE TARGET NETWORKS =====
            if (ep + 1) % TARGET_UPDATE_FREQ == 0:
                controller.update_targets()
                
            # Logging
            if (ep + 1) % 10 == 0 or ep == 0:
                avg_reward = np.mean(rewards_history[-10:]) if len(rewards_history) >= 10 else episode_reward
                print(f"Episode {ep+1}/{EPISODES} | "
                      f"Steps: {t} | "
                      f"Reward: {episode_reward:.2f} | "
                      f"Avg(10): {avg_reward:.2f} | "
                      f"Loss: {mean_loss:.4f} | "
                      f"Epsilon: {epsilon:.2f} | "
                      f"Buffer: {len(replay_buffer)}")
    
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
        
        # Reward plot
        plt.figure(figsize=(12, 5))
        
        plt.subplot(1, 2, 1)
        plt.plot(rewards_history, alpha=0.6, label='Episode Reward')
        if len(rewards_history) >= 10:
            smoothed = np.convolve(rewards_history, np.ones(10)/10, mode='valid')
            plt.plot(range(9, len(rewards_history)), smoothed, label='Smoothed (10)', linewidth=2)
        plt.title("Monolithic QMIX Training Reward")
        plt.xlabel("Episode")
        plt.ylabel("Total Reward")
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        # Loss plot
        if loss_history:
            plt.subplot(1, 2, 2)
            plt.plot(loss_history, alpha=0.6)
            plt.title("Training Loss")
            plt.xlabel("Training Step")
            plt.ylabel("TD Loss")
            plt.grid(True, alpha=0.3)
        
        plt.tight_layout()
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