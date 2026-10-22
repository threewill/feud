from feudpack.pie import hamilton


def test_hamilton_sums_to_total():
    pts = hamilton([4, 2, 1, 1], 100)
    assert sum(pts) == 100
    assert pts[0] > pts[1]


def test_hamilton_empty():
    assert hamilton([]) == []


def test_hamilton_equal():
    assert hamilton([1, 1], 100) == [50, 50]
