"""Monolithic QMIX Baseline Implementation

This package implements the Monolithic QMIX baseline for comparison with the
Civiq hierarchical framework. It follows the Vehicle-as-Agent paradigm.

Components:
    - AgentNetwork: Individual vehicle Q-value network (DRQN)
    - MixingNetwork: Aggregates individual Q-values into Q_tot
    - QMIX_Controller: Main training controller with BPTT
    - QMIXSumoEnv: SUMO environment wrapper
    - SumoStateBuilder: Reusable state builder for both mono-QMIX and Civiq
    - EpisodeReplayBuffer: Episode-based replay buffer for BPTT training
"""

from .agent import AgentNetwork
from .mixer import MixingNetwork
from .controller import QMIX_Controller
from .env import QMIXSumoEnv
from .state_builder import SumoStateBuilder
from .replay_buffer import EpisodeReplayBuffer

__all__ = [
    'AgentNetwork',
    'MixingNetwork', 
    'QMIX_Controller',
    'QMIXSumoEnv',
    'SumoStateBuilder',
    'EpisodeReplayBuffer'
]
