#!/usr/bin/env python3
"""
Stream AR_sample.csv and compute all aggregates for the bureau scrub dashboard.
Outputs JSON files to ../dashboard/public/data/
Uses: PL = ACCT_TYPE_CD 123, Vehicle = 241/242 (skill: 241/242 vehicle).
"""
import csv
import json
import os
from collections import defaultdict
from datetime import datetime
from math import floor

CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "AR_sample.csv")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "dashboard", "public", "data")

# Account type codes (user said 123 = PL; skill 241/242 = vehicle)
PL_CODES = {"123"}
VEHICLE_CODES = {"241", "242"}

def parse_dt_ddmmyyyy(s):
    s = (s or "").strip()
    if not s:
        return None
    try:
        return datetime.strptime(s, "%d/%m/%Y").date()
    except Exception:
        return None

def parse_dt_yyyymmdd(s):
    s = (s or "").strip()
    if not s:
        return None
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except Exception:
        return None

def safe_float(v, default=0.0):
    try:
        s = (v or "").strip()
        return float(s) if s else default
    except Exception:
        return default

def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    # Per-customer aggregates (we'll fill these in one pass)
    cust_tradelines = defaultdict(list)  # list of dicts per row
    cust_has_pl = set()
    cust_has_vehicle = set()
    cust_vehicle_open_dts = defaultdict(list)  # all vehicle OPEN_DT per customer
    cust_pl_open_dts = defaultdict(list)
    cust_first_tradeline_dt = {}  # min OPEN_DT across all accounts
    cust_acct_types = defaultdict(set)
    cust_m_sub_ids = defaultdict(set)
    cust_max_dpd = defaultdict(int)
    cust_has_charge_off = set()
    cust_has_write_off = set()
    cust_closed_dt = defaultdict(list)
    cust_repayment_quality = {}  # customer_id -> (on_time_count, total_count)
    cust_max_credit = defaultdict(float)  # max(ORIG_LOAN_AM, CREDIT_LIMIT_AM)
    cust_open_last_12m = defaultdict(int)  # count of tradelines opened in last 12m from bureau
    bureau_date_global = None

    with open(CSV_PATH, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cid = (row.get("CUSTOMER_ID") or "").strip()
            if not cid:
                continue

            open_dt = parse_dt_ddmmyyyy(row.get("OPEN_DT"))
            bureau_dt = parse_dt_yyyymmdd(row.get("BUREAU_DATE"))
            if bureau_dt:
                bureau_date_global = bureau_dt

            acct_type = (row.get("ACCT_TYPE_CD") or "").strip()
            m_sub = (row.get("M_SUB_ID") or "").strip() or "Unknown"
            cust_acct_types[cid].add(acct_type)
            cust_m_sub_ids[cid].add(m_sub)

            dpd = int(safe_float(row.get("DAYS_PAST_DUE"), 0))
            cust_max_dpd[cid] = max(cust_max_dpd[cid], dpd)
            if safe_float(row.get("CHARGE_OFF_AM"), 0) > 0:
                cust_has_charge_off.add(cid)
            if (row.get("WRITE_OFF_STATUS_DT") or "").strip():
                cust_has_write_off.add(cid)

            closed_dt = parse_dt_ddmmyyyy(row.get("CLOSED_DT"))
            if closed_dt:
                cust_closed_dt[cid].append(closed_dt)

            orig = safe_float(row.get("ORIG_LOAN_AM"))
            limit = safe_float(row.get("CREDIT_LIMIT_AM"))
            cust_max_credit[cid] = max(cust_max_credit[cid], orig, limit)

            if acct_type in PL_CODES:
                cust_has_pl.add(cid)
                if open_dt:
                    cust_pl_open_dts[cid].append(open_dt)
            if acct_type in VEHICLE_CODES:
                cust_has_vehicle.add(cid)
                if open_dt:
                    cust_vehicle_open_dts[cid].append(open_dt)

            if open_dt:
                if cid not in cust_first_tradeline_dt or open_dt < cust_first_tradeline_dt[cid]:
                    cust_first_tradeline_dt[cid] = open_dt
                if bureau_dt and (bureau_dt - open_dt).days <= 365:
                    cust_open_last_12m[cid] += 1

            # Repayment quality from PAYMENT_HISTORY_GRID
            grid = (row.get("PAYMENT_HISTORY_GRID") or "").strip()
            if grid:
                total = 0
                on_time = 0
                for c in grid:
                    if c == "?":
                        continue
                    total += 1
                    if c == "0":
                        on_time += 1
                if total > 0 and cid:
                    prev = cust_repayment_quality.get(cid, (0, 0))
                    cust_repayment_quality[cid] = (prev[0] + on_time, prev[1] + total)

            cust_tradelines[cid].append(row)

    # Use single bureau date for "months since" (use latest seen)
    if not bureau_date_global:
        bureau_date_global = datetime.now().date()

    # --- RUN 1: Buckets ---
    bucket_counts = defaultdict(int)
    lender_type_counts = defaultdict(int)
    product_mix = defaultdict(int)  # vehicle_only, vehicle_pl, multi

    for cid in cust_tradelines:
        # Lender type: NBF / PVT / PUB / mixed
        m_subs = cust_m_sub_ids[cid]
        nbf = sum(1 for m in m_subs if m == "NBF")
        pvt = sum(1 for m in m_subs if m == "PVT")
        pub = sum(1 for m in m_subs if m == "PUB")
        if nbf and not pvt and not pub:
            lender_type_counts["NBF"] += 1
        elif pvt and not nbf and not pub:
            lender_type_counts["PVT"] += 1
        elif pub and not nbf and not pvt:
            lender_type_counts["PUB"] += 1
        else:
            lender_type_counts["Mixed"] += 1

        # Product mix
        has_v = cid in cust_has_vehicle
        has_pl = cid in cust_has_pl
        types = cust_acct_types[cid]
        if has_v and has_pl:
            product_mix["vehicle_and_pl"] += 1
        elif has_v:
            product_mix["vehicle_only"] += 1
        else:
            product_mix["other"] += 1

        # Bucket
        max_dpd = cust_max_dpd[cid]
        charge_off = cid in cust_has_charge_off
        write_off = cid in cust_has_write_off
        has_closed = bool(cust_closed_dt[cid])

        if charge_off or write_off or max_dpd >= 180:
            bucket_counts["D"] += 1
        elif max_dpd > 30 and max_dpd < 180:
            bucket_counts["C"] += 1
        elif has_closed and max_dpd <= 30:
            bucket_counts["B"] += 1
        else:
            bucket_counts["A"] += 1

    n0 = len(cust_tradelines)
    avg_tl = sum(len(v) for v in cust_tradelines.values()) / n0 if n0 else 0

    # --- RUN 2: Time-to-next-PL (Curve A and B) ---
    # Curve A: all with vehicle + at least one PL after vehicle; delta months = PL_open - vehicle_open (most recent vehicle)
    # Curve B: first-timers only (first ever tradeline = vehicle)
    curve_a_months = []  # list of delta months
    curve_b_months = []
    golden_window_a = 0
    golden_window_b = 0

    for cid in cust_has_vehicle:
        vehicle_dts = sorted(cust_vehicle_open_dts[cid], reverse=True)
        if not vehicle_dts:
            continue
        anchor_dt = vehicle_dts[0]
        first_timer = cust_first_tradeline_dt.get(cid) == anchor_dt

        for pl_dt in cust_pl_open_dts.get(cid, []):
            if pl_dt <= anchor_dt:
                continue
            delta_days = (pl_dt - anchor_dt).days
            delta_m = max(0, floor(delta_days / 30))
            curve_a_months.append(delta_m)
            if first_timer:
                curve_b_months.append(delta_m)
            if 2 <= delta_m <= 10:
                if first_timer:
                    golden_window_b += 1
                golden_window_a += 1
            break  # one PL per customer for histogram (first PL after vehicle)

    # Histogram 0..36 months
    def hist(months_list, max_m=36):
        h = defaultdict(int)
        for m in months_list:
            if m <= max_m:
                h[m] += 1
        return [{"months": m, "count": h[m]} for m in range(max_m + 1)]

    curve_a_hist = hist(curve_a_months)
    curve_b_hist = hist(curve_b_months)

    # Repayment quality distribution (buckets 0-60, 60-70, 70-80, 80-90, 90-100)
    rq_buckets = {"0-60": 0, "60-70": 0, "70-80": 0, "80-90": 0, "90-100": 0}
    for cid, (on_t, total) in cust_repayment_quality.items():
        if total == 0:
            continue
        pct = 100.0 * on_t / total
        if pct <= 60:
            rq_buckets["0-60"] += 1
        elif pct <= 70:
            rq_buckets["60-70"] += 1
        elif pct <= 80:
            rq_buckets["70-80"] += 1
        elif pct <= 90:
            rq_buckets["80-90"] += 1
        else:
            rq_buckets["90-100"] += 1

    repayment_quality_dist = [{"bucket": k, "customers": v} for k, v in rq_buckets.items()]

    # Credit velocity: % with 2+ accounts in last 12 months
    velocity_2plus = sum(1 for cid, c in cust_open_last_12m.items() if c >= 2)
    velocity_1 = sum(1 for cid, c in cust_open_last_12m.items() if c == 1)
    velocity_0 = n0 - velocity_1 - velocity_2plus

    # --- RUN 3: Risk (simplified composite) ---
    risk_buckets = {"0-39": 0, "40-69": 0, "70-100": 0}
    affordability_buckets = {"micro": 0, "mid": 0, "mass": 0, "affluent": 0}

    for cid in cust_tradelines:
        score = 50
        if cust_max_dpd[cid] == 0 and cid not in cust_has_charge_off and cid not in cust_has_write_off:
            score += 40
        if cust_repayment_quality.get(cid, (0, 0))[1] and 100.0 * cust_repayment_quality[cid][0] / cust_repayment_quality[cid][1] > 90:
            score += 20
        if len(cust_tradelines[cid]) == 1:
            score -= 10
        if cid in cust_has_charge_off or cid in cust_has_write_off:
            score -= 40
        elif cust_max_dpd[cid] >= 90:
            score -= 30
        elif cust_max_dpd[cid] > 0:
            score -= 10
        score = max(0, min(100, score))

        if score < 40:
            risk_buckets["0-39"] += 1
        elif score < 70:
            risk_buckets["40-69"] += 1
        else:
            risk_buckets["70-100"] += 1

        cap = cust_max_credit[cid]
        if cap < 50000:
            affordability_buckets["micro"] += 1
        elif cap < 200000:
            affordability_buckets["mid"] += 1
        elif cap < 1000000:
            affordability_buckets["mass"] += 1
        else:
            affordability_buckets["affluent"] += 1

    risk_dist = [{"tier": k, "customers": v} for k, v in risk_buckets.items()]
    affordability_dist = [{"tier": k, "customers": v} for k, v in affordability_buckets.items()]

    # --- RUN 4: Timing ---
    timing_flags = {"golden_window": 0, "milestone": 0, "early": 0, "dormant": 0}
    months_since_car_hist = defaultdict(int)
    for cid in cust_has_vehicle:
        vehicle_dts = sorted(cust_vehicle_open_dts[cid], reverse=True)
        if not vehicle_dts:
            continue
        anchor_dt = vehicle_dts[0]
        delta_days = (bureau_date_global - anchor_dt).days
        if delta_days < 0:
            continue
        delta_m = floor(delta_days / 30)
        months_since_car_hist[min(delta_m, 36)] += 1
        if 2 <= delta_m <= 10:
            timing_flags["golden_window"] += 1
        elif 10 < delta_m <= 18:
            timing_flags["milestone"] += 1
        elif delta_m < 2:
            timing_flags["early"] += 1
        else:
            timing_flags["dormant"] += 1

    timing_dist = [{"flag": k, "customers": v} for k, v in timing_flags.items()]
    months_since_car_dist = [{"months": m, "customers": months_since_car_hist[m]} for m in range(37)]

    # Seasonal: PL open month index (1-12)
    pl_month_counts = defaultdict(int)
    for cid, dts in cust_pl_open_dts.items():
        for d in dts:
            pl_month_counts[d.month] += 1
    total_pl_opens = sum(pl_month_counts.values()) or 1
    seasonal_index = [{"month": m, "monthName": datetime(2000, m, 1).strftime("%b"), "index": round(12 * pl_month_counts[m] / total_pl_opens, 2)} for m in range(1, 13)]

    # --- RUN 5: TAM Waterfall (simplified) ---
    bucket_d = bucket_counts["D"]
    stressed = sum(1 for cid in cust_tradelines if cust_max_dpd[cid] >= 30)
    thin_file = sum(1 for cid in cust_tradelines if len(cust_tradelines[cid]) == 1)
    sam = n0 - bucket_d - thin_file
    sam = max(0, sam)

    tam_waterfall = [
        {"stage": "Total customers (N0)", "value": n0, "type": "start"},
        {"stage": "Less: Bucket D (bad)", "value": -bucket_d, "type": "minus"},
        {"stage": "Less: Thin file", "value": -thin_file, "type": "minus"},
        {"stage": "Serviceable base (SAM)", "value": sam, "type": "total"},
    ]

    # Outreach cohorts (simplified: by risk tier as proxy for priority)
    outreach_immediate = risk_buckets["70-100"]  # top tier
    outreach_30d = risk_buckets["40-69"]
    outreach_90d = risk_buckets["0-39"]

    outreach_dist = [
        {"cohort": "Immediate (top 20%)", "customers": min(outreach_immediate, n0 // 5)},
        {"cohort": "Next 30 days", "customers": outreach_30d},
        {"cohort": "Next 90 days", "customers": outreach_90d},
        {"cohort": "Hold", "customers": max(0, n0 - outreach_immediate - outreach_30d - outreach_90d)},
    ]

    # ACCT_TYPE distribution (top types)
    acct_type_counts = defaultdict(int)
    for cid, types in cust_acct_types.items():
        for t in types:
            acct_type_counts[t] += 1
    acct_type_dist = [{"acctType": k, "tradelines": v} for k, v in sorted(acct_type_counts.items(), key=lambda x: -x[1])[:12]]

    # Build payloads
    overview = {
        "totalCustomers": n0,
        "avgTradelinesPerCustomer": round(avg_tl, 2),
        "serviceableBase": sam,
        "plPenetrationRate": round(100.0 * len(cust_has_pl) / n0, 2) if n0 else 0,
        "goldenWindowCurveA": golden_window_a,
        "goldenWindowCurveB": golden_window_b,
        "customersInGoldenWindowNow": timing_flags["golden_window"],
        "bureauDate": str(bureau_date_global),
    }

    with open(os.path.join(OUT_DIR, "overview.json"), "w") as f:
        json.dump(overview, f, indent=2)

    population = {
        "bucketDistribution": [{"bucket": f"Bucket {k}", "customers": v, "pct": round(100.0 * v / n0, 2) if n0 else 0} for k, v in [("A", bucket_counts["A"]), ("B", bucket_counts["B"]), ("C", bucket_counts["C"]), ("D", bucket_counts["D"])]],
        "lenderTypeDistribution": [{"lenderType": k, "customers": v} for k, v in lender_type_counts.items()],
        "productMix": [{"mix": k, "customers": v} for k, v in product_mix.items()],
        "acctTypeDistribution": acct_type_dist,
    }
    with open(os.path.join(OUT_DIR, "population.json"), "w") as f:
        json.dump(population, f, indent=2)

    behaviour = {
        "timeToNextPLCurveA": curve_a_hist,
        "timeToNextPLCurveB": curve_b_hist,
        "repaymentQualityDistribution": repayment_quality_dist,
        "creditVelocity": [{"segment": "0 accounts (12m)", "customers": velocity_0}, {"segment": "1 account", "customers": velocity_1}, {"segment": "2+ accounts", "customers": velocity_2plus}],
    }
    with open(os.path.join(OUT_DIR, "behaviour.json"), "w") as f:
        json.dump(behaviour, f, indent=2)

    risk = {
        "riskTierDistribution": risk_dist,
        "affordabilityDistribution": affordability_dist,
    }
    with open(os.path.join(OUT_DIR, "risk.json"), "w") as f:
        json.dump(risk, f, indent=2)

    timing = {
        "timingFlagDistribution": timing_dist,
        "monthsSinceCarLoan": months_since_car_dist,
        "seasonalIndex": seasonal_index,
    }
    with open(os.path.join(OUT_DIR, "timing.json"), "w") as f:
        json.dump(timing, f, indent=2)

    monetisation = {
        "tamWaterfall": tam_waterfall,
    }
    with open(os.path.join(OUT_DIR, "monetisation.json"), "w") as f:
        json.dump(monetisation, f, indent=2)

    outreach = {
        "outreachCohortDistribution": outreach_dist,
    }
    with open(os.path.join(OUT_DIR, "outreach.json"), "w") as f:
        json.dump(outreach, f, indent=2)

    print("Wrote JSON to", OUT_DIR)
    print("N0:", n0, "SAM:", sam, "PL penetration %:", overview["plPenetrationRate"])

if __name__ == "__main__":
    main()
