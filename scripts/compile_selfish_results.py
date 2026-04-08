"""
compile_selfish_results.py
──────────────────────────
Reads raw SUMO output from scenarios/bgc_full/data/ and compiles
all selfish-routing metrics into results/selfish_routing/.

Outputs:
  results/selfish_routing/metrics.json           — aggregate KPIs per traffic level
  results/selfish_routing/timeseries_free_flow.csv
  results/selfish_routing/timeseries_stable_flow.csv
  results/selfish_routing/timeseries_forced_flow.csv

Run from the project root:
  python scripts/compile_selfish_results.py
"""

import os
import sys
import json
import shutil
import xml.etree.ElementTree as ET
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "scenarios", "bgc_full", "data")
OUT_DIR  = os.path.join(ROOT, "results", "selfish_routing")

# Maps frontend traffic-level keys → raw file prefixes
LEVEL_MAP = {
    "free_flow":    {"stats": "data_selfish_low_stats.xml",
                     "tripinfo": "data_selfish_low_tripinfo.xml",
                     "csv":  "baseline_results_low.csv"},
    "stable_flow":  {"stats": "data_selfish_med_stats.xml",
                     "tripinfo": "data_selfish_med_tripinfo.xml",
                     "csv":  "baseline_results_med.csv"},
    "forced_flow":  {"stats": "data_selfish_high_stats.xml",
                     "tripinfo": "data_selfish_high_tripinfo.xml",
                     "csv":  "baseline_results_highEnough.csv"},
}


def parse_stats(path: str) -> dict:
    """Extract vehicleTripStatistics and performance from a SUMO stats XML."""
    tree = ET.parse(path)
    root = tree.getroot()

    stats = root.find("vehicleTripStatistics")
    perf  = root.find("performance")
    vehs  = root.find("vehicles")

    if stats is None:
        raise ValueError(f"No <vehicleTripStatistics> in {path}")

    s = stats.attrib
    p = perf.attrib  if perf  is not None else {}
    v = vehs.attrib  if vehs  is not None else {}

    speed_ms       = float(s.get("speed",       0))
    duration_s     = float(s.get("duration",    0))
    waiting_time_s = float(s.get("waitingTime", 0))
    time_loss_s    = float(s.get("timeLoss",    0))
    route_len_m    = float(s.get("routeLength", 0))
    count          = int(  s.get("count",       0))

    rtf   = float(p.get("realTimeFactor", 0))
    loaded   = int(v.get("loaded",   0))
    inserted = int(v.get("inserted", 0))
    running  = int(v.get("running",  0))

    travel_time_min = duration_s / 60.0
    speed_kmh       = speed_ms * 3.6
    # throughput: vehicles that completed in 3600 s window
    throughput      = count

    return {
        "count":             count,
        "loaded":            loaded,
        "inserted":          inserted,
        "running":           running,
        "avg_travel_time_s": round(duration_s, 2),
        "avg_travel_time_min": round(travel_time_min, 3),
        "avg_waiting_time_s":  round(waiting_time_s, 2),
        "avg_speed_ms":        round(speed_ms, 3),
        "avg_speed_kmh":       round(speed_kmh, 2),
        "avg_route_length_m":  round(route_len_m, 2),
        "time_loss_s":         round(time_loss_s, 2),
        "throughput":          throughput,
        "real_time_factor":    round(rtf, 2),
    }


def parse_emissions(path: str) -> dict:
    """
    Parse tripinfo XML and compute per-vehicle average CO2 (g/km) and
    fuel consumption (L/100km) from SUMO's HBEFA emission output.

    Units in SUMO tripinfo:
      CO2_abs  → mg (milligrams) total for the trip
      fuel_abs → mg (milligrams) total for the trip
      routeLength is in metres (from <tripinfo> element)
    """
    tree   = ET.parse(path)
    root   = tree.getroot()

    co2_per_km_list  = []
    fuel_l100km_list = []

    for trip in root.iter("tripinfo"):
        route_len_m = float(trip.get("routeLength", 0))
        if route_len_m <= 0:
            continue
        em = trip.find("emissions")
        if em is None:
            continue

        co2_mg  = float(em.get("CO2_abs",  0))
        fuel_mg = float(em.get("fuel_abs", 0))

        # mg → g, divide by km
        route_len_km = route_len_m / 1000.0
        co2_g_km   = co2_mg  / 1000.0 / route_len_km    # g / km
        fuel_g_km  = fuel_mg / 1000.0 / route_len_km    # g / km

        # Fuel density of petrol ≈ 740 g/L
        fuel_l_100km = (fuel_g_km / 740.0) * 100.0      # L / 100 km

        co2_per_km_list.append(co2_g_km)
        fuel_l100km_list.append(fuel_l_100km)

    if not co2_per_km_list:
        return {"avg_co2_g_per_km": None, "avg_fuel_l_per_100km": None, "emission_sample_count": 0}

    avg_co2  = sum(co2_per_km_list)  / len(co2_per_km_list)
    avg_fuel = sum(fuel_l100km_list) / len(fuel_l100km_list)

    return {
        "avg_co2_g_per_km":    round(avg_co2,  1),
        "avg_fuel_l_per_100km": round(avg_fuel, 2),
        "emission_sample_count": len(co2_per_km_list),
    }


def compile():
    os.makedirs(OUT_DIR, exist_ok=True)

    traffic_levels = {}
    csv_map = {}

    for level_key, files in LEVEL_MAP.items():
        stats_path   = os.path.join(DATA_DIR, files["stats"])
        tripinfo_path = os.path.join(DATA_DIR, files["tripinfo"])
        csv_src       = os.path.join(DATA_DIR, files["csv"])

        print(f"\n-- {level_key.upper()} --------------------")

        if not os.path.exists(stats_path):
            print(f"  ⚠  Missing: {stats_path}")
            continue

        stats = parse_stats(stats_path)
        print(f"  count={stats['count']}  travel={stats['avg_travel_time_min']:.2f} min  "
              f"wait={stats['avg_waiting_time_s']:.1f} s  speed={stats['avg_speed_kmh']:.1f} km/h")

        emissions = {}
        if os.path.exists(tripinfo_path):
            emissions = parse_emissions(tripinfo_path)
            print(f"  CO2={emissions.get('avg_co2_g_per_km')} g/km  "
                  f"fuel={emissions.get('avg_fuel_l_per_100km')} L/100km  "
                  f"(n={emissions.get('emission_sample_count')})")
        else:
            print(f"  ⚠  No tripinfo at {tripinfo_path} — emissions skipped")

        traffic_levels[level_key] = {
            "source_stats":    files["stats"],
            "source_tripinfo": files["tripinfo"],
            "source_csv":      files["csv"],
            "vehicles": {
                "loaded":    stats["loaded"],
                "inserted":  stats["inserted"],
                "completed": stats["count"],
                "running_at_end": stats["running"],
            },
            "kpis": {
                "avg_travel_time_min":  stats["avg_travel_time_min"],
                "avg_travel_time_s":    stats["avg_travel_time_s"],
                "avg_waiting_time_s":   stats["avg_waiting_time_s"],
                "avg_speed_kmh":        stats["avg_speed_kmh"],
                "avg_speed_ms":         stats["avg_speed_ms"],
                "throughput":           stats["throughput"],
                "avg_route_length_m":   stats["avg_route_length_m"],
                "time_loss_s":          stats["time_loss_s"],
                "real_time_factor":     stats["real_time_factor"],
                "avg_co2_g_per_km":     emissions.get("avg_co2_g_per_km"),
                "avg_fuel_l_per_100km": emissions.get("avg_fuel_l_per_100km"),
            },
            "timeseries_file": f"timeseries_{level_key}.csv",
        }

        csv_map[level_key] = (csv_src, os.path.join(OUT_DIR, f"timeseries_{level_key}.csv"))

    # Write metrics.json
    metrics = {
        "algorithm":    "selfish_routing",
        "map":          "bgc_full",
        "scenario":     "Wardrop User Equilibrium / Selfish Nash Routing",
        "simulation_duration_s": 3600,
        "generated_at": datetime.now().isoformat(),
        "traffic_levels": traffic_levels,
    }

    out_json = os.path.join(OUT_DIR, "metrics.json")
    with open(out_json, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"\n[OK] Wrote {out_json}")

    # Copy timeseries CSVs
    for level_key, (src, dst) in csv_map.items():
        if os.path.exists(src):
            shutil.copy2(src, dst)
            print(f"[OK] Copied timeseries -> {os.path.basename(dst)}")
        else:
            print(f"[WARN] CSV missing: {src}")

    print(f"\n[DONE] Results compiled to: {OUT_DIR}")
    return metrics


if __name__ == "__main__":
    compile()
