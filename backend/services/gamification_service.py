from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from datetime import datetime, timedelta

from models import Report, ReportUpvote, ReportComment, User


def _safe_int(value: Optional[int]) -> int:
    try:
        return int(value or 0)
    except Exception:
        return 0


def compute_points(db: Session, user_id: str) -> int:
    reports_count = _safe_int(db.query(func.count(Report.id)).filter(Report.reporter_id == user_id, Report.is_deleted == False).scalar())
    resolved_count = _safe_int(db.query(func.count(Report.id)).filter(Report.reporter_id == user_id, Report.status == "resolved").scalar())
    upvotes_given = _safe_int(db.query(func.count(ReportUpvote.id)).filter(ReportUpvote.user_id == user_id).scalar())
    comments_made = _safe_int(db.query(func.count(ReportComment.id)).filter(ReportComment.user_id == user_id).scalar())

    # Simple scoring rules; adjust as needed
    points = reports_count * 50 + resolved_count * 20 + upvotes_given * 2 + comments_made * 3
    return points


def compute_level(points: int) -> Tuple[str, int, int]:
    # Returns (level_name, xp_in_level, xp_required)
    # Tiers: Bronze 0-499, Silver 500-999, Gold 1000-1999, Platinum 2000+
    if points >= 2000:
        base = 2000
        return ("Platinum", points - base, 1000)
    if points >= 1000:
        base = 1000
        return ("Gold", points - base, 1000)
    if points >= 500:
        base = 500
        return ("Silver", points - base, 500)
    base = 0
    return ("Bronze", points - base, 500)


def compute_streak_days(db: Session, user_id: str) -> int:
    # Count consecutive days with at least one report or comment in the last N days
    today = datetime.utcnow().date()
    streak = 0
    for i in range(0, 30):
        day = today - timedelta(days=i)
        next_day = day + timedelta(days=1)
        reports_on_day = db.query(Report.id).filter(
            Report.reporter_id == user_id,
            Report.created_at >= datetime.combine(day, datetime.min.time()),
            Report.created_at < datetime.combine(next_day, datetime.min.time()),
        ).first()
        comments_on_day = db.query(ReportComment.id).filter(
            ReportComment.user_id == user_id,
            ReportComment.created_at >= datetime.combine(day, datetime.min.time()),
            ReportComment.created_at < datetime.combine(next_day, datetime.min.time()),
        ).first()
        if reports_on_day or comments_on_day:
            streak += 1
        else:
            break
    return streak


def _load_badge_catalog(db: Session) -> List[Dict[str, Any]]:
    try:
        rows = db.execute(text("SELECT code, name, description, tier, icon_url, criteria_json FROM badges"))
        catalog = []
        for r in rows:
            catalog.append({
                "code": r[0],
                "name": r[1],
                "description": r[2],
                "tier": r[3],
                "icon_url": r[4],
                "criteria_json": r[5],
            })
        if catalog:
            return catalog
    except Exception:
        pass
    # Fallback minimal catalog
    return [
        {"code": "first_report", "name": "First Report", "description": "Awarded for submitting your first verified report.", "tier": 1, "icon_url": "/assets/badges/first_report.svg", "criteria_json": {"reports_verified": 1}},
        {"code": "verified_reporter", "name": "Verified Reporter", "description": "Awarded at 5, 25, 100 verified reports.", "tier": 3, "icon_url": "/assets/badges/verified_reporter_tier1.svg", "criteria_json": {"reports_verified": [5, 25, 100]}},
        {"code": "community_ally", "name": "Community Ally", "description": "Awarded at 50, 200 upvotes given.", "tier": 2, "icon_url": "/assets/badges/community_ally_tier1.svg", "criteria_json": {"upvotes_given": [50, 200]}},
        {"code": "evidence_pro", "name": "Evidence Pro", "description": "Awarded for 10 reports with valid EXIF & geo-close photos.", "tier": 1, "icon_url": "/assets/badges/evidence_pro.svg", "criteria_json": {"evidence_valid": 10}},
        {"code": "no_duplicate_champ", "name": "No-Duplicate Champ", "description": "Awarded for 20 reports submitted with zero duplicate blocks.", "tier": 1, "icon_url": "/assets/badges/no_duplicate_champ.svg", "criteria_json": {"no_duplicates": 20}},
        {"code": "impact_under_sla", "name": "Impact Under SLA", "description": "Awarded for 5 reports resolved within SLA.", "tier": 1, "icon_url": "/assets/badges/impact_under_sla.svg", "criteria_json": {"resolved_within_sla": 5}},
        {"code": "eco_warrior", "name": "Eco Warrior", "description": "Awarded for 10 resolved issues in Clean & Green categories.", "tier": 1, "icon_url": "/assets/badges/eco_warrior.svg", "criteria_json": {"eco_resolved": 10}},
        {"code": "neighborhood_guardian", "name": "Neighborhood Guardian", "description": "Awarded for resolving 5 reports within the same ward in a month.", "tier": 1, "icon_url": "/assets/badges/neighborhood_guardian.svg", "criteria_json": {"ward_resolved": 5}},
        {"code": "monthly_top10", "name": "Monthly Top 10", "description": "Earned by placing in monthly top 10 leaderboard.", "tier": 1, "icon_url": "/assets/badges/monthly_top10.svg", "criteria_json": {"leaderboard_top10": True}},
    ]


def _count_verified_reports(db: Session, user_id: str) -> int:
    # Approximate "verified" as non-deleted user reports
    return _safe_int(db.query(func.count(Report.id)).filter(Report.reporter_id == user_id, Report.is_deleted == False).scalar())


def _count_evidence_valid(db: Session, user_id: str) -> int:
    # Approximate as reports with an image_url and coordinates present
    return _safe_int(db.query(func.count(Report.id)).filter(
        Report.reporter_id == user_id,
        Report.image_url != None,
        Report.latitude != None,
        Report.longitude != None,
    ).scalar())


def _count_resolved_within_sla(db: Session, user_id: str, hours: int = 72) -> int:
    # SLA: resolved within N hours from created_at
    rows = db.query(Report).filter(Report.reporter_id == user_id, Report.status == "resolved", Report.created_at != None, Report.resolved_at != None).all()
    count = 0
    for r in rows:
        try:
            delta = (r.resolved_at - r.created_at).total_seconds() / 3600.0
            if delta <= hours:
                count += 1
        except Exception:
            continue
    return count


def _count_eco_resolved(db: Session, user_id: str) -> int:
    eco_categories = {"Garbage", "Water", "Drainage", "Clean", "Green"}
    rows = db.query(Report).filter(Report.reporter_id == user_id, Report.status == "resolved").all()
    count = 0
    for r in rows:
        cat = (r.category or "").lower()
        if any(ec.lower() in cat for ec in eco_categories):
            count += 1
    return count


def _count_upvotes_given(db: Session, user_id: str) -> int:
    return _safe_int(db.query(func.count(ReportUpvote.id)).filter(ReportUpvote.user_id == user_id).scalar())


def _compute_badge_progress(db: Session, user: User, catalog: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    badges: List[Dict[str, Any]] = []
    reports_verified = _count_verified_reports(db, user.id)
    upvotes_given = _count_upvotes_given(db, user.id)
    evidence_valid = _count_evidence_valid(db, user.id)
    resolved_sla = _count_resolved_within_sla(db, user.id)
    eco_resolved = _count_eco_resolved(db, user.id)

    for item in catalog:
        criteria = item.get("criteria_json") or {}
        # Determine progress and goal
        goal = 0
        progress = 0
        tier = 1
        code = item["code"]

        if "reports_verified" in criteria:
            target = criteria["reports_verified"]
            if isinstance(target, list) and target:
                # Determine achieved tier by thresholds
                thresholds = sorted(target)
                progress = reports_verified
                goal = thresholds[-1]
                tier = 1
                for idx, th in enumerate(thresholds, start=1):
                    if progress >= th:
                        tier = idx
            else:
                progress = reports_verified
                goal = int(target)
        elif "upvotes_given" in criteria:
            target = criteria["upvotes_given"]
            if isinstance(target, list) and target:
                thresholds = sorted(target)
                progress = upvotes_given
                goal = thresholds[-1]
                tier = 1
                for idx, th in enumerate(thresholds, start=1):
                    if progress >= th:
                        tier = idx
            else:
                progress = upvotes_given
                goal = int(target)
        elif "evidence_valid" in criteria:
            progress = evidence_valid
            goal = int(criteria["evidence_valid"])
        elif "no_duplicates" in criteria:
            progress = reports_verified  # approximation
            goal = int(criteria["no_duplicates"])
        elif "resolved_within_sla" in criteria:
            progress = resolved_sla
            goal = int(criteria["resolved_within_sla"])
        elif "eco_resolved" in criteria:
            progress = eco_resolved
            goal = int(criteria["eco_resolved"])
        elif "ward_resolved" in criteria:
            progress = 0
            goal = int(criteria["ward_resolved"])  # not tracked; show 0
        elif "leaderboard_top10" in criteria:
            progress = 1 if False else 0
            goal = 1

        earned = progress >= goal if goal > 0 else False
        computed_tier = tier
        badges.append({
            "code": code,
            "tier": computed_tier,
            "name": item["name"],
            "icon_url": item["icon_url"].replace("tier1", f"tier{computed_tier}") if "tier" in item["icon_url"] else item["icon_url"],
            "earned": earned,
            "earned_at": None,
            "progress": progress,
            "goal": goal,
        })
    return badges


def _compute_leaderboard_preview(db: Session, current_user: User) -> Tuple[List[Dict[str, Any]], int]:
    users = db.query(User).filter(User.role == "citizen").all()
    scored: List[Tuple[User, int]] = []
    for u in users:
        try:
            scored.append((u, compute_points(db, u.id)))
        except Exception:
            continue
    scored.sort(key=lambda tup: tup[1], reverse=True)
    top5 = [{"rank": i + 1, "name": u.full_name, "points": pts} for i, (u, pts) in enumerate(scored[:5])]
    rank = next((i + 1 for i, (u, _) in enumerate(scored) if u.id == current_user.id), len(scored) or 0)
    return top5, rank


def get_gamification_profile(db: Session, current_user: User) -> Dict[str, Any]:
    points = compute_points(db, current_user.id)
    level_name, xp_in_level, xp_required = compute_level(points)
    streak_days = compute_streak_days(db, current_user.id)
    catalog = _load_badge_catalog(db)
    badges = _compute_badge_progress(db, current_user, catalog)
    leaderboard_preview, rank = _compute_leaderboard_preview(db, current_user)

    return {
        "user": {
            "name": current_user.full_name,
            "avatar": None,
            "level": level_name,
            "points": points,
            "streak_days": streak_days,
            "rank": rank,
            "xp_in_level": xp_in_level,
            "xp_required": xp_required,
        },
        "badges": badges,
        "leaderboard_preview": leaderboard_preview,
    }


def maybe_emit_badge_unlocks(db: Session, current_user: User, previous: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Compare previous profile snapshot to current to find newly unlocked badges."""
    now = get_gamification_profile(db, current_user)
    prev_codes = {(b.get("code"), b.get("tier")) for b in previous.get("badges", []) if b.get("earned")}
    new_codes = [(b.get("code"), b.get("tier"), b.get("name")) for b in now.get("badges", []) if b.get("earned")]
    newly = []
    for code, tier, name in new_codes:
        if (code, tier) not in prev_codes:
            label = name + (f" {['I','II','III'][tier-1]}" if tier in (1,2,3) else "")
            newly.append({"code": code, "label": label})
    return newly


