#!/usr/bin/env python3
"""
Script to create the saasframework database in Cosmos DB PostgreSQL
"""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import sys

def create_database():
    # Connection parameters
    connection_params = {
        'host': 'c-primus-cospg.2756hzu3bbdzq2.postgres.cosmos.azure.com',
        'port': 5432,
        'database': 'postgres',  # Connect to default postgres database first
        'user': 'citus',
        'password': 'PrimusAdmin2025!',
        'sslmode': 'require'
    }
    
    try:
        print("Connecting to Cosmos DB PostgreSQL...")
        # Connect to the default postgres database
        conn = psycopg2.connect(**connection_params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = 'saasframework'")
        exists = cursor.fetchone()
        
        if exists:
            print("✅ Database 'saasframework' already exists!")
        else:
            print("Creating database 'saasframework'...")
            cursor.execute("CREATE DATABASE saasframework")
            print("✅ Database 'saasframework' created successfully!")
        
        # Close connections
        cursor.close()
        conn.close()
        
        # Now connect to the new database to verify
        connection_params['database'] = 'saasframework'
        conn = psycopg2.connect(**connection_params)
        cursor = conn.cursor()
        
        # Test the connection
        cursor.execute("SELECT version()")
        version = cursor.fetchone()
        print(f"✅ Connected to saasframework database successfully!")
        print(f"PostgreSQL Version: {version[0]}")
        
        # Create a simple test table to verify everything works
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS connection_test (
                id SERIAL PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                message TEXT
            )
        """)
        
        cursor.execute("INSERT INTO connection_test (message) VALUES ('Database setup successful!')")
        conn.commit()
        
        cursor.execute("SELECT * FROM connection_test ORDER BY id DESC LIMIT 1")
        result = cursor.fetchone()
        print(f"✅ Test table created and data inserted: {result}")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 Database setup completed successfully!")
        print("\n📄 Connection String for your SaaS Framework:")
        print(f"DATABASE_URL=postgresql://citus:PrimusAdmin2025!@c-primus-cospg.2756hzu3bbdzq2.postgres.cosmos.azure.com:5432/saasframework?sslmode=require")
        
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = create_database()
    sys.exit(0 if success else 1)