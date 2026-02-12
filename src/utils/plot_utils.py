import pandas as pd
import matplotlib.pyplot as plt
import os

# Load the data
df = pd.read_csv("baseline_results.csv")

# Create the plot
plt.figure(figsize=(10, 6))
plt.plot(df['step'], df['total_system_wait'], label='Selfish Routing (Baseline)', color='red')

# Add labels
plt.title('Baseline Traffic Congestion (BGC Core)')
plt.xlabel('Simulation Step (Seconds)')
plt.ylabel('Total Accumulated Wait Time (s)')
plt.legend()
plt.grid(True)

# Save the image
plt.savefig("baseline_graph.png")
print(">>> Graph saved as baseline_graph.png")
plt.show()