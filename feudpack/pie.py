"""Hamilton largest-remainder pie scoring."""


def hamilton(weights, total=100):
    """Integer shares of *total* proportional to *weights*, summing exactly to *total*."""
    if not weights:
        return []
    s = float(sum(weights))
    if s <= 0:
        return [0] * len(weights)
    raw = [w / s * total for w in weights]
    floors = [int(x) for x in raw]
    leftover = int(total) - sum(floors)
    order = sorted(range(len(raw)), key=lambda i: (raw[i] - floors[i], -i), reverse=True)
    for i in order[: max(0, leftover)]:
        floors[i] += 1
    return floors
