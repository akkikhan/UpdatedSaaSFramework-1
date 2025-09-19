#!/usr/bin/env python3
"""
Script to list available databases and check permissions in Cosmos DB PostgreSQL
"""
import psycopg2
import sys

def check_databases():
    # Connection parameters
    connection_params = {
        'host': 'c-primus-cospg.2756hzu3bbdzq2.postgres.cosmos.azure.com',
        'port': 5432,
        'database': 'postgres',  # Connect to default postgres database
        'user': 'citus',
        'password': 'PrimusAdmin2025!',
        'sslmode': 'require'
    }
    
    try:
        print("Connecting to Cosmos DB PostgreSQL...")
        conn = psycopg2.connect(**connection_params)
        cursor = conn.cursor()
        
        # List all databases
        print("\n📋 Available databases:")
        cursor.execute("SELECT datname FROM pg_database WHERE datistemplate = false")
        databases = cursor.fetchall()
        for db in databases:
            print(f"  - {db[0]}")
        
        # Check current user permissions
        print(f"\n👤 Current user permissions:")
        cursor.execute("SELECT current_user, session_user")
        users = cursor.fetchone()
        print(f"  Current user: {users[0]}")
        print(f"  Session user: {users[1]}")
        
        # Check if we can create schemas in the current database
        print(f"\n🔧 Testing schema creation in 'postgres' database...")
        try:
            cursor.execute("CREATE SCHEMA IF NOT EXISTS saasframework")
            print("✅ Can create schemas - we can use the 'postgres' database with a custom schema!")
            
            # Create a test table in our schema
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS saasframework.connection_test (
                    id SERIAL PRIMARY KEY,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    message TEXT
                )
            """)
            
            cursor.execute("INSERT INTO saasframework.connection_test (message) VALUES ('Schema setup successful!')")
            conn.commit()
            
            cursor.execute("SELECT * FROM saasframework.connection_test ORDER BY id DESC LIMIT 1")
            result = cursor.fetchone()
            print(f"✅ Test table created in schema: {result}")
            
            print("\n🎉 Setup completed successfully using schema approach!")
            print("\n📄 Connection String for your SaaS Framework:")
            print(f"DATABASE_URL=postgresql://citus:PrimusAdmin2025!@c-primus-cospg.2756hzu3bbdzq2.postgres.cosmos.azure.com:5432/postgres?sslmode=require&options=-csearch_path%3Dsaasframework")
            
            return True
            
        except psycopg2.Error as e:
            print(f"❌ Cannot create schema: {e}")
            return False
        
        cursor.close()
        conn.close()
        
    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = check_databases()
    sys.exit(0 if success else 1)