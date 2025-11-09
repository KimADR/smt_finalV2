#!/bin/bash

# Wait-for-db: parse DATABASE_URL (expected format: protocol://user:pass@host:port/dbname[?query])
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set in container environment"
  exit 1
fi

# Extract username, password and db name robustly
DB_USER=$(echo "$DATABASE_URL" | sed -n 's#.*://\([^:@]*\):.*@.*#\1#p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's#.*://[^:@]*:\([^@]*\)@.*#\1#p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's#.*/\([^/?]*\).*#\1#p')

# Fallbacks if parsing fails
if [ -z "$DB_USER" ]; then
  DB_USER=postgres
fi
if [ -z "$DB_PASS" ]; then
  DB_PASS=$POSTGRES_PASSWORD
fi
if [ -z "$DB_NAME" ]; then
  DB_NAME=$POSTGRES_DB
fi

echo "Waiting for Postgres at host 'db' as user '$DB_USER' db '$DB_NAME'"
until PGPASSWORD="$DB_PASS" psql -h "db" -U "$DB_USER" -d "$DB_NAME" -c '\q' >/dev/null 2>&1; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up - executing command"
exec "$@"