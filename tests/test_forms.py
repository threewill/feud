from pathlib import Path

from openpyxl import Workbook

from feudpack.cli import build_pack
from feudpack.forms import parse_survey


def _xlsx(tmp_path: Path) -> Path:
    wb = Workbook()
    ws = wb.active
    ws.append(
        [
            "ID",
            "Name",
            "Email",
            "Name a snack — first answer",
            "Name a snack — second answer (optional)",
            "Name a game — first answer",
        ]
    )
    ws.append([1, "Ann", "a@x", "Nuts", "Peanuts", "Jenga"])
    ws.append([2, "Bob", "b@x", "nuts", None, "kubb"])
    p = tmp_path / "survey.xlsx"
    wb.save(p)
    return p


def test_parse_forms_columns(tmp_path):
    order, by_q = parse_survey(_xlsx(tmp_path))
    assert len(order) == 2
    snack = by_q[order[0]]
    assert len(snack) == 2
    assert snack[0][1] == ["Nuts", "Peanuts"]


def test_build_pack_review(tmp_path):
    src = _xlsx(tmp_path)
    pack, review = build_pack(
        src,
        pack_id="unit",
        title="Unit Feud",
        threshold=85,
        pie=100,
        max_live=10,
        live_ids=None,
        lightning_count=0,
        target_points=300,
        host_can_end=True,
        lightning_enabled=False,
    )
    assert pack["id"] == "unit"
    assert pack["win"]["targetPoints"] == 300
    assert pack["lightning"]["enabled"] is False
    assert len(pack["boards"]) == 2
    assert "Cluster review" in review
    snack = pack["boards"][0]
    assert sum(a["pts"] for a in snack["answers"]) == 100
