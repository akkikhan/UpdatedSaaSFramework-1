#!/usr/bin/env python3
"""
Script to work with the citus database in Cosmos DB PostgreSQL
"""
import psycopg2
import sys

def setup_citus_database():
    # Connection parameters for citus database
    connection_params = {
        'host': 'c-primus-cospg.2756hzu3bbdzq2.postgres.cosmos.azure.com',
        'port': 5432,
        'database': 'citus',  # Use the citus database
        'user': 'citus',
        'password': 'PrimusAdmin2025!',
        'sslmode': 'require'
    }
    
    try:
        print("Connecting to Cosmos DB PostgreSQL 'citus' database...")
        conn = psycopg2.connect(**connection_params)
        cursor = conn.cursor()
        
        # Test the connection
        cursor.execute("SELECT version()")
        version = cursor.fetchone()
        print(f"✅ Connected to 'citus' database successfully!")
        print(f"PostgreSQL Version: {version[0]}")
        
        # Check what we can do
        print(f"\n🔧 Testing table creation in 'citus' database...")
        
        # Try to create a test table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS saas_connection_test (
                id SERIAL PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                message TEXT
            )
        """)
        
        cursor.execute("INSERT INTO saas_connection_test (message) VALUES ('SaaS Framework setup successful!')")
        conn.commit()
        
        cursor.execute("SELECT * FROM saas_connection_test ORDER BY id DESC LIMIT 1")
        result = cursor.fetchone()
        print(f"✅ Test table created successfully: {result}")
        
        # List existing tables
        print(f"\n📋 Existing tables in 'citus' database:")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        for table in tables:
            print(f"  - {table[0]}")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 Database setup completed successfully!")
        print("\n📄 Connection String for your SaaS Framework:")
        print("DATABASE_URL=postgresql://citus:PrimusAdmin2025!@c-primus-cospg.2756hzu3bbdzq2.postgres.cosmos.azure.com:5432/citus?sslmode=require")
        
        print("\n✅ You can now use the 'citus' database for your SaaS framework!")
        print("The framework will create its own tables as needed.")
        
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = setup_citus_database()
    sys.exit(0 if success else 1)