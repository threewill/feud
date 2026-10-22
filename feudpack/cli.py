"""CLI: python -m feudpack import survey.xlsx -o packs/myshow.json"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from .cluster import cluster_answers, clusters_to_answers
from .forms import parse_survey


def slug(text: str, n: int) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return (s[:n] or "q").rstrip("-")


def build_pack(
    path: Path,
    *,
    pack_id: str,
    title: str,
    threshold: int,
    pie: int | None,
    max_live: int,
    live_ids: list[str] | None,
    lightning_count: int,
    target_points: int | None,
    host_can_end: bool,
    lightning_enabled: bool,
) -> tuple[dict, str]:
    order, by_q = parse_survey(path)
    boards = []
    review_lines = [f"# Cluster review for `{pack_id}`", "", f"Source: `{path}`", ""]
    used_ids = set()
    for i, question in enumerate(order, start=1):
        rows = by_q[question]
        clusters = cluster_answers(rows, threshold=threshold)
        answers = clusters_to_answers(clusters, pie_total=pie)
        bid = f"Q-{i:02d}-{slug(question, 24)}"
        while bid in used_ids:
            bid += "x"
        used_ids.add(bid)
        boards.append(
            {
                "id": bid,
                "pool": "live",
                "source": path.name,
                "question": question,
                "answers": answers,
            }
        )
        review_lines.append(f"## {bid}")
        review_lines.append(f"**{question}**")
        review_lines.append("")
        for c, a in zip(clusters, answers):
            review_lines.append(f"- **{a['text']}** ({c.votes} people, {a['pts']} pts)")
            for m in c.members:
                review_lines.append(f"  - {m}")
        extras = clusters[len(answers) :]
        for c in extras:
            review_lines.append(f"- *(dropped 0 pts)* {c.label}: {c.members}")
        review_lines.append("")

    if live_ids:
        want = set(live_ids)
        for b in boards:
            b["pool"] = "live" if b["id"] in want else "backup"
    else:
        live_n = max(1, max_live)
        for i, b in enumerate(boards):
            b["pool"] = "live" if i < live_n else "backup"

    lightning_questions = []
    unused = [b for b in boards if b["pool"] == "backup"]
    take = unused[: lightning_count] if lightning_count else []
    for b in take:
        q = {k: v for k, v in b.items() if k != "pool"}
        lightning_questions.append(q)

    pack = {
        "id": pack_id,
        "title": title,
        "families": {"a": "Family A", "b": "Family B"},
        "win": {
            "targetPoints": target_points,
            "hostCanEnd": host_can_end,
            "onTarget": "endAndMaybeLightning",
        },
        "lightning": {
            "enabled": bool(lightning_enabled and lightning_questions),
            "target": 200,
            "player1Seconds": 15,
            "player2Seconds": 20,
            "steal": True,
            "questions": lightning_questions,
        },
        "boards": boards,
    }
    return pack, "\n".join(review_lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="feudpack", description="Build a Feud show pack from a Forms export.")
    sub = p.add_subparsers(dest="cmd", required=True)
    imp = sub.add_parser("import", help="Cluster a Microsoft Forms xlsx/csv into a pack JSON")
    imp.add_argument("survey", type=Path)
    imp.add_argument("-o", "--out", type=Path, required=True)
    imp.add_argument("--id", dest="pack_id", default="myshow")
    imp.add_argument("--title", default="Feud")
    imp.add_argument("--threshold", type=int, default=85, help="RapidFuzz token-set ratio 0-100")
    imp.add_argument("--pie", type=int, default=100, help="Hamilton pie total; 0 keeps raw vote counts")
    imp.add_argument("--max-live", type=int, default=10)
    imp.add_argument("--live-ids", default="", help="Comma-separated board ids to mark live")
    imp.add_argument("--lightning-count", type=int, default=0)
    imp.add_argument("--lightning", action="store_true", help="Enable lightning if questions were pulled")
    imp.add_argument("--target-points", type=int, default=500)
    imp.add_argument("--no-target", action="store_true", help="No auto-win score")
    imp.add_argument("--no-end-button", action="store_true")
    args = p.parse_args(argv)

    if args.cmd != "import":
        p.print_help()
        return 2

    live_ids = [s.strip() for s in args.live_ids.split(",") if s.strip()] or None
    pie = None if args.pie == 0 else args.pie
    target = None if args.no_target else args.target_points
    pack, review = build_pack(
        args.survey,
        pack_id=args.pack_id,
        title=args.title,
        threshold=args.threshold,
        pie=pie,
        max_live=args.max_live,
        live_ids=live_ids,
        lightning_count=args.lightning_count,
        target_points=target,
        host_can_end=not args.no_end_button,
        lightning_enabled=args.lightning,
    )
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(pack, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    review_path = args.out.with_suffix(".review.md")
    review_path.write_text(review, encoding="utf-8")
    print(f"Wrote {args.out}")
    print(f"Wrote {review_path} — edit cluster labels in the JSON before air.")
    return 0
