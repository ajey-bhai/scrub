#!/usr/bin/env python3
"""
Stream AR_sample.csv and compute all aggregates for the bureau scrub dashboard.
Outputs JSON files to ../dashboard/public/data/

Product mapping follows the latest skill spec:
- Vehicle loan anchor  = ACCT_TYPE_CD IN (241, 242)
- Personal loan (PL)   = ACCT_TYPE_CD 191
- Credit card          = ACCT_TYPE_CD 123
"""
import csv
import json
import os
from collections import defaultdict
from datetime import datetime
from math import floor

CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "AR_sample.csv")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "dashboard", "public", "data")

# Account type codes (from skill spec)
PL_CODES = {"191"}
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
    cust_bucket = {}  # will be filled after we see full customer behaviour
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
            bucket = "D"
        elif max_dpd > 30 and max_dpd < 180:
            bucket = "C"
        elif has_closed and max_dpd <= 30:
            bucket = "B"
        else:
            bucket = "A"

        bucket_counts[bucket] += 1
        cust_bucket[cid] = bucket

    n0 = len(cust_tradelines)
    avg_tl = sum(len(v) for v in cust_tradelines.values()) / n0 if n0 else 0

    # --- RUN 2: Time-to-next-PL (Curve A and B) ---
    # Curve A: all with vehicle + at least one PL after vehicle; delta months = PL_open - vehicle_open (most recent vehicle)
    # Curve B: first-timers only (first ever tradeline = vehicle)
    curve_a_months = []  # list of delta months (>0 only, post-vehicle PL)
    curve_b_months = []
    golden_window_a = 0
    golden_window_b = 0

    month0_customers = 0
    pre_existing_pl_customers = 0
    vehicle_pl_base = 0
    first_pl_post_vehicle_month = {}  # cid -> date of first PL after vehicle (delta > 0)

    for cid in cust_has_vehicle:
        vehicle_dts = sorted(cust_vehicle_open_dts[cid], reverse=True)
        if not vehicle_dts:
            continue
        anchor_dt = vehicle_dts[0]
        first_timer = cust_first_tradeline_dt.get(cid) == anchor_dt

        pls = sorted(cust_pl_open_dts.get(cid, []))
        if not pls:
            continue

        vehicle_pl_base += 1

        has_month0 = False
        has_pre_existing = False
        best_delta_m = None
        best_pl_dt = None

        for pl_dt in pls:
            delta_days = (pl_dt - anchor_dt).days
            delta_m = floor(delta_days / 30)
            if delta_m <= 0:
                has_pre_existing = True
                if delta_m == 0:
                    has_month0 = True
                continue
            if best_delta_m is None or delta_m < best_delta_m:
                best_delta_m = delta_m
                best_pl_dt = pl_dt

        if has_month0:
            month0_customers += 1
        if has_pre_existing:
            pre_existing_pl_customers += 1

        if best_delta_m is None or best_pl_dt is None:
            continue

        first_pl_post_vehicle_month[cid] = best_pl_dt

        curve_a_months.append(best_delta_m)
        if first_timer:
            curve_b_months.append(best_delta_m)
        if 2 <= best_delta_m <= 10:
            if first_timer:
                golden_window_b += 1
            golden_window_a += 1

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
    cust_risk_score = {}

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
        cust_risk_score[cid] = score

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

    # Seasonal: PL open month index (1-12), using only first PL AFTER vehicle per customer
    pl_month_counts = defaultdict(int)
    for d in first_pl_post_vehicle_month.values():
        pl_month_counts[d.month] += 1
    total_pl_opens = sum(pl_month_counts.values()) or 1
    seasonal_index = [{"month": m, "monthName": datetime(2000, m, 1).strftime("%b"), "index": round(12 * pl_month_counts[m] / total_pl_opens, 2)} for m in range(1, 13)]

    # --- Data quality summary metrics ---
    anchor_none = n0 - len(cust_has_vehicle)
    anchor_inferred = len(cust_has_vehicle)
    anchor_confirmed = 0  # we don't have partner code mapping yet
    anchor_ambiguous = 0  # not modelled separately in this bureau-only run

    month0_pct = round(100.0 * month0_customers / vehicle_pl_base, 2) if vehicle_pl_base else 0.0
    pre_existing_pl_pct = round(100.0 * pre_existing_pl_customers / vehicle_pl_base, 2) if vehicle_pl_base else 0.0

    # Bureau freshness: age of BUREAU_DATE vs today
    today = datetime.now().date()
    age_days = (today - bureau_date_global).days if bureau_date_global else 0
    bureau_fresh_pct = 0.0 if age_days > 90 else 100.0

    # Repayment quality vs Bucket D consistency
    bucket_d_ids = {cid for cid, b in cust_bucket.items() if b == "D"}
    high_quality_ids = set()
    for cid, (on_t, total) in cust_repayment_quality.items():
        if total == 0:
            continue
        pct = 100.0 * on_t / total
        if pct >= 80.0:
            high_quality_ids.add(cid)
    bucket_d_high_quality = len(bucket_d_ids & high_quality_ids)
    bucket_d_total = len(bucket_d_ids)
    bucket_d_high_quality_pct = round(100.0 * bucket_d_high_quality / bucket_d_total, 2) if bucket_d_total else 0.0
    repayment_bucket_consistent = bucket_d_high_quality_pct < 5.0

    # Month-36 spike check
    m35 = months_since_car_hist.get(35, 0)
    m36 = months_since_car_hist.get(36, 0)
    m37 = months_since_car_hist.get(37, 0)

    # Simple status helpers
    def status_from_bounds(val, low_ok, high_ok):
        if low_ok <= val <= high_ok:
            return "OK"
        if val <= high_ok * 1.25:
            return "WARN"
        return "CHECK"

    avg_tl_status = status_from_bounds(avg_tl, 4.0, 8.0)
    anchor_none_pct = 100.0 * anchor_none / n0 if n0 else 0.0
    if anchor_none_pct <= 10:
        anchor_status = "OK"
    elif anchor_none_pct <= 20:
        anchor_status = "WARN"
    else:
        anchor_status = "CHECK"

    if month0_pct < 5:
        month0_status = "OK"
    elif month0_pct <= 15:
        month0_status = "WARN"
    else:
        month0_status = "CHECK"

    data_quality_table = [
        {"metric": "Total CUSTOMER_IDs", "value": n0, "status": ""},
        {"metric": "Avg tradelines / customer", "value": round(avg_tl, 2), "status": avg_tl_status},
        {
            "metric": "Anchor: none (timing excluded)",
            "value": f"{anchor_none} ({anchor_none_pct:.1f}%)",
            "status": anchor_status,
        },
        {
            "metric": "Month-0 spike in demand curve",
            "value": f"{month0_pct}%",
            "status": month0_status,
        },
        {
            "metric": "Bureau data freshness < 90 days",
            "value": f"{bureau_fresh_pct}%",
            "status": "OK" if bureau_fresh_pct == 100.0 else "CHECK",
        },
        {
            "metric": "Repayment vs bucket consistency",
            "value": "Pass" if repayment_bucket_consistent else "Check",
            "status": "OK" if repayment_bucket_consistent else "CHECK",
        },
    ]

    data_quality = {
        "totalCustomers": n0,
        "avgTradelinesPerCustomer": round(avg_tl, 2),
        "anchorSummary": {
            "confirmed": anchor_confirmed,
            "inferred": anchor_inferred,
            "none": anchor_none,
            "ambiguous": anchor_ambiguous,
        },
        "month0PctOnDemandCurve": month0_pct,
        "preExistingPLPct": pre_existing_pl_pct,
        "bureauFreshnessDays": age_days,
        "bureauFreshPctUnder90Days": bureau_fresh_pct,
        "repaymentBucketConsistency": {
            "pass": repayment_bucket_consistent,
            "bucketDHighQualityPct": bucket_d_high_quality_pct,
        },
        "month36Spike": {
            "month35": m35,
            "month36": m36,
            "month37": m37,
        },
        "table": data_quality_table,
    }

    # --- RUN 5: TAM Waterfall and P&L ---
    bucket_d = bucket_counts["D"]
    thin_file = sum(1 for cid in cust_tradelines if len(cust_tradelines[cid]) < 3)
    sam = n0 - bucket_d - thin_file
    sam = max(0, sam)

    sam_cids = {cid for cid in cust_tradelines if cust_bucket.get(cid) != "D" and len(cust_tradelines[cid]) >= 3}
    pl_eligible = sum(1 for cid in sam_cids if cust_risk_score.get(cid, 0) >= 70)
    lac_eligible = sum(1 for cid in sam_cids if 40 <= cust_risk_score.get(cid, 0) < 70 and cid in cust_has_vehicle)
    deferred = sum(1 for cid in sam_cids if 40 <= cust_risk_score.get(cid, 0) < 70 and cid not in cust_has_vehicle)
    excluded_sam = sum(1 for cid in sam_cids if cust_risk_score.get(cid, 0) < 40)

    demand_rate_pl = 0.32
    take_rate_pl = 0.25
    demand_rate_lac = 0.20
    take_rate_lac = 0.35
    disbursals_pl = int(pl_eligible * demand_rate_pl * take_rate_pl)
    disbursals_lac = int(lac_eligible * demand_rate_lac * take_rate_lac)

    # Revenue model (skill: PL 75K, 18mo, yield 24%, credit 5%, opex 3% → net 16%; LAC 1.5L, 24mo, 20%, 2%, net 15%)
    avg_ticket_pl = 75000
    avg_tenor_pl_months = 18
    prepayment_adj_pl = 0.75
    net_margin_pl = 0.16
    pl_aum_year1 = disbursals_pl * avg_ticket_pl * (avg_tenor_pl_months / 12.0 * prepayment_adj_pl)
    pl_revenue_yr1 = pl_aum_year1 * net_margin_pl

    avg_ticket_lac = 150000
    avg_tenor_lac_months = 24
    prepayment_adj_lac = 0.80
    net_margin_lac = 0.15
    lac_aum_year1 = disbursals_lac * avg_ticket_lac * (avg_tenor_lac_months / 12.0 * prepayment_adj_lac)
    lac_revenue_yr1 = lac_aum_year1 * net_margin_lac

    total_aum_year1 = pl_aum_year1 + lac_aum_year1
    total_net_revenue_yr1 = pl_revenue_yr1 + lac_revenue_yr1

    # AUM at month 6, 12, 24 (simplified: 6 = ~50% of year-1 runout, 12 = full year-1, 24 = year-1 + year-2 same volume)
    aum_month6 = total_aum_year1 * 0.5
    aum_month12 = total_aum_year1
    aum_month24 = total_aum_year1 * 2.0

    tam_waterfall = [
        {"stage": "Total customers (N0)", "value": n0, "type": "start"},
        {"stage": "Less: Bucket D (bad)", "value": -bucket_d, "type": "minus"},
        {"stage": "Less: Thin file (<3 tradelines)", "value": -thin_file, "type": "minus"},
        {"stage": "Serviceable base (SAM)", "value": sam, "type": "total"},
    ]

    revenue_model = {
        "pl": {
            "avgTicketInr": avg_ticket_pl,
            "avgTenorMonths": avg_tenor_pl_months,
            "yieldPct": 24,
            "creditCostPct": 5,
            "netMarginPct": round(net_margin_pl * 100, 1),
            "prepaymentAdj": prepayment_adj_pl,
            "disbursalsCount": disbursals_pl,
            "aumYear1Inr": round(pl_aum_year1, 0),
            "revenueYear1Inr": round(pl_revenue_yr1, 0),
        },
        "lac": {
            "avgTicketInr": avg_ticket_lac,
            "avgTenorMonths": avg_tenor_lac_months,
            "yieldPct": 20,
            "creditCostPct": 2,
            "netMarginPct": round(net_margin_lac * 100, 1),
            "prepaymentAdj": prepayment_adj_lac,
            "disbursalsCount": disbursals_lac,
            "aumYear1Inr": round(lac_aum_year1, 0),
            "revenueYear1Inr": round(lac_revenue_yr1, 0),
        },
        "totalAumYear1Inr": round(total_aum_year1, 0),
        "totalNetRevenueYear1Inr": round(total_net_revenue_yr1, 0),
    }

    sam_segments = {
        "plEligible": pl_eligible,
        "lacEligible": lac_eligible,
        "deferred": deferred,
        "excluded": excluded_sam,
    }

    aum_projection = [
        {"month": 6, "aumInr": round(aum_month6, 0), "label": "Month 6"},
        {"month": 12, "aumInr": round(aum_month12, 0), "label": "Month 12"},
        {"month": 24, "aumInr": round(aum_month24, 0), "label": "Month 24"},
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

    with open(os.path.join(OUT_DIR, "data_quality.json"), "w") as f:
        json.dump(data_quality, f, indent=2)

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
        "samSegments": sam_segments,
        "revenueModel": revenue_model,
        "aumProjection": aum_projection,
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
