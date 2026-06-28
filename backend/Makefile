dev-backend:
	uv run uvicorn src.main:app --reload --port 3838

prod-backend:
	uv run uvicorn src.main:app --host 0.0.0.0 --port 8000

# Database migrations
migrate:
	uv run alembic revision --autogenerate -m "$(msg)"

migrate-upgrade:
	uv run alembic upgrade head

migrate-downgrade:
	uv run alembic downgrade -1

migrate-current:
	uv run alembic current

migrate-history:
	uv run alembic history --verbose

# Demo data: restore the pre-processed database snapshot (10 docs, prices,
# normalization, anomalies, catalog embeddings + demo login operator/Operator123).
# No OCR, no Azure, no pipeline — instant. Needs the medtech_db container running.
restore-demo:
	gunzip -c fixtures/demo_db.sql.gz | docker exec -i medtech_db psql -U med -d medarchive

# Same, but against any Postgres via DB_* env vars (needs psql installed).
restore-demo-psql:
	gunzip -c fixtures/demo_db.sql.gz | PGPASSWORD=$(DB_PASSWORD) psql -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) -d $(DB_NAME)

# Create the snapshot from the current DB (maintainers only).
dump-demo:
	docker exec medtech_db pg_dump -U med -d medarchive --no-owner --no-privileges --clean --if-exists | gzip > fixtures/demo_db.sql.gz