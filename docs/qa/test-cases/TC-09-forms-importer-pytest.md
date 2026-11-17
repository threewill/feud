# TC-09 — Forms importer (pytest)

**Area:** Import  
**Type:** Automated

## Setup

Python 3. `pip install -r requirements.txt`.

## Steps

```bash
python -m pytest -q
```

## Expected

All tests pass. Current coverage:

- Hamilton pie sums to the requested total (`tests/test_pie.py`)
- Unique-person collapse when both of one person’s answers land in the same cluster (`tests/test_cluster.py`)
- Forms-style headers (`— first answer` / second optional) and pack/review build (`tests/test_forms.py`)

There is no pytest for `app.js`.
