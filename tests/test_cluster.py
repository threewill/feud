from feudpack.cluster import cluster_answers, clusters_to_answers, normalize


def test_normalize():
    assert normalize("  Kubb!! ") == "kubb"


def test_unique_person_collapse():
    rows = [
        ("a", ["kubb", "KUBB"]),
        ("b", ["jenga"]),
        ("c", ["jenga tournament"]),
    ]
    clusters = cluster_answers(rows, threshold=85)
    jenga = next(c for c in clusters if "jenga" in c.label.lower())
    kubb = next(c for c in clusters if "kubb" in c.label.lower())
    assert kubb.votes == 1
    assert jenga.votes == 2


def test_pie_from_clusters():
    rows = [("a", ["nuts"]), ("b", ["nuts"]), ("c", ["chips"])]
    clusters = cluster_answers(rows, threshold=90)
    answers = clusters_to_answers(clusters, pie_total=100)
    assert sum(a["pts"] for a in answers) == 100
    assert answers[0]["pts"] > answers[1]["pts"]
