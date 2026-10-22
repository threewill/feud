"""Normalize, fuzzy-merge, and unique-person collapse survey answers."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from rapidfuzz import fuzz

from .pie import hamilton

_PUNCT = re.compile(r"[^\w\s]+", re.UNICODE)
_SPACE = re.compile(r"\s+")


def normalize(text: str) -> str:
    s = (text or "").strip().lower()
    s = _PUNCT.sub(" ", s)
    s = _SPACE.sub(" ", s).strip()
    return s


@dataclass
class Cluster:
    label: str
    members: list[str] = field(default_factory=list)
    respondents: set[str] = field(default_factory=set)

    @property
    def votes(self) -> int:
        return len(self.respondents)


def cluster_answers(
    rows: list[tuple[str, list[str]]],
    threshold: int = 85,
) -> list[Cluster]:
    """rows: (respondent_id, [answer, ...]) per person for one question.

    Each person contributes at most one vote per cluster (unique-person collapse).
    """
    clusters: list[Cluster] = []
    for respondent, answers in rows:
        seen_in = set()
        for raw in answers:
            text = (raw or "").strip()
            if not text:
                continue
            key = normalize(text)
            if not key:
                continue
            idx = _best_cluster(clusters, key, threshold)
            if idx is None:
                clusters.append(Cluster(label=text, members=[text], respondents=set()))
                idx = len(clusters) - 1
            elif text not in clusters[idx].members:
                clusters[idx].members.append(text)
            if idx not in seen_in:
                clusters[idx].respondents.add(str(respondent))
                seen_in.add(idx)
    clusters.sort(key=lambda c: (-c.votes, c.label.lower()))
    return clusters


def _best_cluster(clusters: list[Cluster], key: str, threshold: int) -> int | None:
    best_i = None
    best = -1
    for i, c in enumerate(clusters):
        score = max(fuzz.token_set_ratio(key, normalize(m)) for m in c.members) if c.members else 0
        if score >= threshold and score > best:
            best = score
            best_i = i
    return best_i


def clusters_to_answers(clusters: list[Cluster], pie_total: int | None = 100) -> list[dict]:
    weights = [c.votes for c in clusters]
    pts = hamilton(weights, pie_total) if pie_total else weights
    out = []
    for c, p in zip(clusters, pts):
        if p <= 0 and c.votes <= 0:
            continue
        out.append({"text": c.label, "pts": int(p)})
    return [a for a in out if a["pts"] > 0]
