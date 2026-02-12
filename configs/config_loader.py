import yaml
import os
import sys

# Get the absolute path to the project root (apriori_civiq/)
# This fixes "File Not Found" errors when running from different folders
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "default_config.yaml")

def load_config():
    """Parses the YAML file into a Python Dictionary."""
    if not os.path.exists(CONFIG_PATH):
        sys.exit(f">>> ERROR: Configuration file not found at: {CONFIG_PATH}")
    
    with open(CONFIG_PATH, "r") as f:
        try:
            config = yaml.safe_load(f)
            # Inject the Root Directory into the config for map paths
            # This allows "scenarios/bgc_full/" to work on any machine
            config['network']['map_path'] = os.path.join(ROOT_DIR, config['network']['map'])
            return config
        except yaml.YAMLError as exc:
            sys.exit(f">>> ERROR: Could not parse YAML file: {exc}")

# Create a global instance so other files can just do:
# from src.utils.config_loader import CONFIG
CONFIG = load_config()