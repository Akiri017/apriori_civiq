"""
Script to link baseline_results.csv and SUMO statistics XML files.
This creates a unified analysis combining step-by-step baseline metrics 
with SUMO's detailed traffic statistics.
"""

import xml.etree.ElementTree as ET
import pandas as pd
import os
from pathlib import Path

def parse_sumo_stats_xml(xml_path):
    """
    Extract statistics from SUMO's statistic output XML file.
    Returns a dictionary of key metrics.
    """
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        
        stats = {}
        
        # Parse vehicle statistics
        for elem in root.findall('.//vehicleTripStatistics'):
            stats['veh_count'] = elem.get('count', 'N/A')
            stats['route_length'] = float(elem.get('routeLength', 0))
            stats['avg_speed'] = float(elem.get('speed', 0))
            stats['trip_duration'] = float(elem.get('duration', 0))
            stats['waiting_time'] = float(elem.get('waitingTime', 0))
            stats['time_loss'] = float(elem.get('timeLoss', 0))
            stats['depart_delay'] = float(elem.get('departDelay', 0))
        
        # Parse performance metrics
        for elem in root.findall('.//performance'):
            stats['duration'] = float(elem.get('duration', 0))
            stats['clock_duration'] = float(elem.get('clockDuration', 0))
            stats['real_time_factor'] = float(elem.get('realTimeFactor', 0))
        
        # Parse vehicle counts
        for elem in root.findall('.//vehicles'):
            stats['vehicles_loaded'] = int(elem.get('loaded', 0))
            stats['vehicles_inserted'] = int(elem.get('inserted', 0))
            stats['vehicles_running'] = int(elem.get('running', 0))
        
        return stats
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return {}

def link_results(csv_path, xml_paths):
    """
    Link CSV baseline results with SUMO statistics XML files.
    
    Args:
        csv_path: Path to baseline_results.csv
        xml_paths: List of paths to XML stats files
    """
    
    # Read CSV
    print(f"Reading baseline results from: {csv_path}")
    df_csv = pd.read_csv(csv_path)
    
    # Parse all XML files
    xml_data = {}
    for xml_path in xml_paths:
        if os.path.exists(xml_path):
            label = Path(xml_path).parent.parent.name  # scenario name
            print(f"Parsing SUMO stats from: {xml_path}")
            xml_data[label] = parse_sumo_stats_xml(xml_path)
    
    # Create combined results
    results_summary = {
        'Baseline CSV': {
            'total_rows': len(df_csv),
            'final_active_vehicles': df_csv['active_vehicles'].iloc[-1],
            'final_system_wait': df_csv['total_system_wait'].iloc[-1],
            'peak_active_vehicles': df_csv['active_vehicles'].max(),
            'peak_system_wait': df_csv['total_system_wait'].max(),
            'avg_active_vehicles': df_csv['active_vehicles'].mean(),
            'avg_system_wait': df_csv['total_system_wait'].mean(),
        }
    }
    
    # Add XML statistics
    for scenario_name, stats in xml_data.items():
        results_summary[f'SUMO Stats ({scenario_name})'] = stats
    
    # Create output dataframe
    output_df = pd.DataFrame([results_summary]).T
    
    return df_csv, output_df, results_summary

def main():
    # Paths
    csv_path = 'baseline_results.csv'
    xml_paths = [
        'scenarios/test_simple/data/data_selfish_high_stats.xml',
        'scenarios/bgc_core/data/data_selfish_high_stats.xml',
        'scenarios/bgc_full/data/data_selfish_high_stats.xml',
    ]
    
    # Link results
    df_csv, summary_df, raw_summary = link_results(csv_path, xml_paths)
    
    # Display results
    print("\n" + "="*80)
    print("LINKED RESULTS SUMMARY")
    print("="*80)
    print(summary_df.to_string())
    
    # Save linked output
    output_file = 'linked_results_summary.csv'
    summary_df.to_csv(output_file)
    print(f"\n✅ Summary saved to: {output_file}")
    
    # Save detailed baseline data with metadata
    detailed_output = 'linked_results_detailed.csv'
    df_csv.to_csv(detailed_output, index=False)
    print(f"✅ Detailed baseline data saved to: {detailed_output}")
    
    # Create a JSON report
    import json
    report = {
        'baseline_csv': {
            'file': csv_path,
            'rows': len(df_csv),
            'columns': df_csv.columns.tolist(),
            'statistics': raw_summary.get('Baseline CSV', {})
        },
        'sumo_stats': {
            file: stats for file, stats in raw_summary.items() 
            if 'SUMO' in file
        }
    }
    
    report_file = 'linked_results_report.json'
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    print(f"✅ Detailed report saved to: {report_file}")
    
    return df_csv, summary_df, raw_summary

if __name__ == "__main__":
    main()
