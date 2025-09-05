# Local Database Setup

## Option 1: PostgreSQL via Docker (Easiest)

```bash
# Create docker-compose.local.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: saas_framework
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:

# Run with:
docker-compose -f docker-compose.local.yml up -d

# Update .env:
DATABASE_URL=postgresql://admin:admin123@localhost:5432/saas_framework
```

## Option 2: Use SQLite (Fastest)

```bash
# Update .env:
DATABASE_URL=file:./local.db

# Install sqlite driver:
npm install better-sqlite3
```

## Option 3: Continue with Supabase (Current)

- The retry logic should handle intermittent issues
- Database connection timeouts are common with free Supabase instances
- The application will continue to retry and eventually succeed
