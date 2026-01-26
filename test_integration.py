import sys
import os
import pkgutil
import importlib.util
import torch
import numpy as np

def apply_compatibility_patches():
    """
    Applies runtime patches to resolve dependencies between modern Python environments
    and the older epymarl codebase.
    """
    print("[INFO] Applying compatibility patches...")

    # 1. Numpy Patch: Restore types removed in Numpy 1.24+
    if not hasattr(np, 'int'):
        np.int = int
    if not hasattr(np, 'bool'):
        np.bool = bool
    if not hasattr(np, 'float'):
        np.float = float
    
    # 2. Gym Patch: Map 'gymnasium' to 'gym'
    try:
        import gymnasium
        sys.modules["gym"] = gymnasium
    except ImportError:
        print("[ERROR] Gymnasium library not found. Please run 'pip install gymnasium'.")
        sys.exit(1)

    # 3. Sacred Patch: Restore pkgutil.find_loader for Python 3.12+
    if not hasattr(pkgutil, 'find_loader'):
        def find_loader(fullname):
            spec = importlib.util.find_spec(fullname)
            return spec.loader if spec else None
        pkgutil.find_loader = find_loader

    print("[INFO] Patches applied successfully.")

def setup_paths():
    """
    Ensures the epymarl source directory is in the Python path.
    """
    current_dir = os.getcwd()
    epymarl_src = os.path.join(current_dir, 'epymarl', 'src')

    if os.path.exists(epymarl_src):
        if epymarl_src not in sys.path:
            sys.path.append(epymarl_src)
        print(f"[INFO] Added epymarl source to path: {epymarl_src}")
    else:
        print(f"[ERROR] Could not find epymarl source at: {epymarl_src}")
        print("[HINT] Ensure you are running this script from the project root.")
        sys.exit(1)

def run_integration_test():
    """
    Attempts to import critical modules to verify the environment.
    """
    print("\n[INFO] Starting integration test...")

    try:
        # Test QMIX Agent import
        from modules.agents import RNNAgent
        print("[PASS] Imported RNNAgent (QMIX Core)")

        # Test Controller import
        from controllers import BasicMAC
        print("[PASS] Imported BasicMAC (Controller)")

        # Test Sacred Configuration
        import sacred
        print(f"[PASS] Imported Sacred (Version: {sacred.__version__})")

    except ImportError as e:
        print(f"\n[FAIL] Import Error: {e}")
        print("[HINT] Check that all dependencies are installed and the path is correct.")
        sys.exit(1)
    except Exception as e:
        print(f"\n[FAIL] Runtime Error: {e}")
        sys.exit(1)

def check_environment_versions():
    """
    Logs current environment versions for verification.
    """
    print("\n[INFO] Environment Status:")
    print(f" - Python: {sys.version.split()[0]}")
    print(f" - PyTorch: {torch.__version__}")
    print(f" - Numpy: {np.__version__}")

if __name__ == "__main__":
    apply_compatibility_patches()
    setup_paths()
    run_integration_test()
    check_environment_versions()
    
    print("\n[SUCCESS] Integration verified. Epymarl is ready to use.")