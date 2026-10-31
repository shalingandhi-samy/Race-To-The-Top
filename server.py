from __future__ import annotations

import json
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).parent
DATABASE = ROOT / "race_to_the_top.db"
BUILDINGS = ["PHL5", "ORD1", "DFW5", "SMF2", "IND3"]
SHIFTS = ["S1", "S2", "S4", "S5"]
DEPARTMENTS = ["IB", "OB"]
EXPECTED_SHIFTS = {f"{building} {shift} {department}" for building in BUILDINGS for shift in SHIFTS for department in DEPARTMENTS}

app = FastAPI(title="RACE TO THE TOP API", version="1.0.0")
app.mount("/static", StaticFiles(directory=ROOT), name="static")


class SnapshotRow(BaseModel):
    shift: str
    points: int = Field(ge=0, le=50)
    order: int = Field(ge=1, le=40)


class SnapshotPayload(BaseModel):
    rows: list[SnapshotRow]
    sheet_name: str | None = None


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    with closing(connect()) as connection:
        connection.execute("""CREATE TABLE IF NOT EXISTS weekly_snapshots (
            week INTEGER PRIMARY KEY,
            sheet_name TEXT,
            imported_at TEXT NOT NULL,
            rows_json TEXT NOT NULL
        )""")
        if connection.execute("SELECT COUNT(*) FROM weekly_snapshots").fetchone()[0] == 0:
            seed = ROOT / "data" / "ww39_snapshot.json"
            if seed.exists():
                snapshot = json.loads(seed.read_text(encoding="utf-8"))
                connection.execute("INSERT INTO weekly_snapshots (week, sheet_name, imported_at, rows_json) VALUES (?, ?, ?, ?)", (snapshot["week"], snapshot["sheet_name"], snapshot["imported_at"], json.dumps(snapshot["rows"])))
        connection.commit()


def snapshot_rows(week: int) -> list[dict[str, Any]] | None:
    with closing(connect()) as connection:
        row = connection.execute("SELECT rows_json FROM weekly_snapshots WHERE week = ?", (week,)).fetchone()
    return json.loads(row["rows_json"]) if row else None


def validate_rows(rows: list[SnapshotRow]) -> None:
    shifts = [row.shift for row in rows]
    if len(rows) != 40:
        raise HTTPException(status_code=422, detail=f"Expected 40 shifts; received {len(rows)}.")
    if len(set(shifts)) != 40:
        raise HTTPException(status_code=422, detail="Duplicate shift names found.")
    unknown = sorted(set(shifts) - EXPECTED_SHIFTS)
    missing = sorted(EXPECTED_SHIFTS - set(shifts))
    if unknown:
        raise HTTPException(status_code=422, detail={"unknown_shifts": unknown})
    if missing:
        raise HTTPException(status_code=422, detail={"missing_shifts": missing})


@app.on_event("startup")
def startup() -> None:
    initialize_database()


@app.get("/")
def home() -> FileResponse:
    return FileResponse(ROOT / "index.html")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "race-to-the-top"}


@app.post("/api/weeks/{week}/snapshots")
def publish_snapshot(week: int, payload: SnapshotPayload) -> dict[str, Any]:
    if not 1 <= week <= 53:
        raise HTTPException(status_code=422, detail="Walmart Week must be between 1 and 53.")
    validate_rows(payload.rows)
    rows_json = json.dumps([row.model_dump() for row in payload.rows])
    with closing(connect()) as connection:
        connection.execute(
            "INSERT INTO weekly_snapshots (week, sheet_name, imported_at, rows_json) VALUES (?, ?, datetime('now'), ?) "
            "ON CONFLICT(week) DO UPDATE SET sheet_name=excluded.sheet_name, imported_at=excluded.imported_at, rows_json=excluded.rows_json",
            (week, payload.sheet_name, rows_json),
        )
        connection.commit()
    return {"week": week, "rows": len(payload.rows), "status": "published"}


@app.get("/api/weeks")
def list_weeks() -> list[dict[str, Any]]:
    with closing(connect()) as connection:
        rows = connection.execute("SELECT week, sheet_name, imported_at, rows_json FROM weekly_snapshots ORDER BY week").fetchall()
    return [{"week": row["week"], "sheet_name": row["sheet_name"], "imported_at": row["imported_at"], "rows": len(json.loads(row["rows_json"]))} for row in rows]


@app.get("/api/weeks/{week}")
def get_week(week: int) -> dict[str, Any]:
    rows = snapshot_rows(week)
    if rows is None:
        raise HTTPException(status_code=404, detail="Week snapshot not found.")
    ranked = sorted(rows, key=lambda row: (-row["points"], row["order"]))
    return {"week": week, "rows": [{**row, "rank": index + 1} for index, row in enumerate(ranked)]}


@app.get("/api/podium-streaks")
def podium_streaks() -> list[dict[str, Any]]:
    counts: dict[str, dict[str, int]] = {}
    with closing(connect()) as connection:
        weeks = connection.execute("SELECT week, rows_json FROM weekly_snapshots").fetchall()
    for week in weeks:
        ranked = sorted(json.loads(week["rows_json"]), key=lambda row: (-row["points"], row["order"]))
        for index, row in enumerate(ranked[:3]):
            result = counts.setdefault(row["shift"], {"gold": 0, "silver": 0, "bronze": 0})
            result["gold" if index == 0 else "silver" if index == 1 else "bronze"] += 1
    return sorted(({"shift": shift, **medals, "podiums": sum(medals.values())} for shift, medals in counts.items()), key=lambda row: (-row["podiums"], row["shift"]))
