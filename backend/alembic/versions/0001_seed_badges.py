"""Seed initial badges catalog

Revision ID: 0001
Revises: 
Create Date: 2025-09-05
"""

from alembic import op
import sqlalchemy as sa
import json


# revision identifiers, used by Alembic.
revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


BADGES = [
    {
        "code": "first_report",
        "name": "First Report",
        "description": "Awarded for submitting your first verified report.",
        "tier": 1,
        "icon_url": "/assets/badges/first_report.svg",
        "criteria_json": {"reports_verified": 1},
    },
    {
        "code": "verified_reporter",
        "name": "Verified Reporter",
        "description": "Awarded at 5, 25, 100 verified reports.",
        "tier": 3,
        "icon_url": "/assets/badges/verified_reporter_tier1.svg",
        "criteria_json": {"reports_verified": [5, 25, 100]},
    },
    {
        "code": "community_ally",
        "name": "Community Ally",
        "description": "Awarded at 50, 200 upvotes given.",
        "tier": 2,
        "icon_url": "/assets/badges/community_ally_tier1.svg",
        "criteria_json": {"upvotes_given": [50, 200]},
    },
    {
        "code": "evidence_pro",
        "name": "Evidence Pro",
        "description": "Awarded for 10 reports with valid EXIF & geo-close photos.",
        "tier": 1,
        "icon_url": "/assets/badges/evidence_pro.svg",
        "criteria_json": {"evidence_valid": 10},
    },
    {
        "code": "no_duplicate_champ",
        "name": "No-Duplicate Champ",
        "description": "Awarded for 20 reports submitted with zero duplicate blocks.",
        "tier": 1,
        "icon_url": "/assets/badges/no_duplicate_champ.svg",
        "criteria_json": {"no_duplicates": 20},
    },
    {
        "code": "impact_under_sla",
        "name": "Impact Under SLA",
        "description": "Awarded for 5 reports resolved within SLA.",
        "tier": 1,
        "icon_url": "/assets/badges/impact_under_sla.svg",
        "criteria_json": {"resolved_within_sla": 5},
    },
    {
        "code": "eco_warrior",
        "name": "Eco Warrior",
        "description": "Awarded for 10 resolved issues in Clean & Green categories.",
        "tier": 1,
        "icon_url": "/assets/badges/eco_warrior.svg",
        "criteria_json": {"eco_resolved": 10},
    },
    {
        "code": "neighborhood_guardian",
        "name": "Neighborhood Guardian",
        "description": "Awarded for resolving 5 reports within the same ward in a month.",
        "tier": 1,
        "icon_url": "/assets/badges/neighborhood_guardian.svg",
        "criteria_json": {"ward_resolved": 5},
    },
    {
        "code": "monthly_top10",
        "name": "Monthly Top 10",
        "description": "Earned by placing in monthly top 10 leaderboard.",
        "tier": 1,
        "icon_url": "/assets/badges/monthly_top10.svg",
        "criteria_json": {"leaderboard_top10": True},
    },
]


def upgrade() -> None:
    # Idempotent inserts: insert only if code not present
    insert_sql = sa.text(
        """
        INSERT INTO badges (code, name, description, tier, icon_url, criteria_json)
        SELECT :code, :name, :description, :tier, :icon_url, (:criteria_json)::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM badges WHERE code = :code);
        """
    )

    conn = op.get_bind()
    for badge in BADGES:
        conn.execute(
            insert_sql,
            {
                "code": badge["code"],
                "name": badge["name"],
                "description": badge["description"],
                "tier": badge["tier"],
                "icon_url": badge["icon_url"],
                "criteria_json": json.dumps(badge["criteria_json"]),
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    delete_sql = sa.text("DELETE FROM badges WHERE code = :code")
    for badge in BADGES:
        conn.execute(delete_sql, {"code": badge["code"]})


