#!/usr/bin/env tsx
/**
 * Development Setup Validation Script
 * 
 * Validates that the development environment is properly configured
 * Run with: tsx scripts/validate-setup.ts
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

interface ValidationResult {
  success: boolean;
  message: string;
  fix?: string;
}

class SetupValidator {
  private results: { [key: string]: ValidationResult } = {};

  async validate(): Promise<boolean> {
    console.log('🔍 Validating development setup...\n');

    // Check Node.js version
    this.checkNodeVersion();

    // Check required files
    this.checkRequiredFiles();

    // Check environment variables
    this.checkEnvironmentVariables();

    // Check database configuration
    await this.checkDatabaseConnection();

    // Check email configuration
    this.checkEmailConfiguration();

    // Check port availability
    await this.checkPortAvailability();

    // Print results
    this.printResults();

    // Return overall success
    return Object.values(this.results).every(r => r.success);
  }

  private checkNodeVersion() {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion >= 20) {
      this.results.nodeVersion = {
        success: true,
        message: `Node.js ${nodeVersion} ✅`
      };
    } else {
      this.results.nodeVersion = {
        success: false,
        message: `Node.js ${nodeVersion} is too old`,
        fix: 'Update to Node.js 20+ from https://nodejs.org'
      };
    }
  }

  private checkRequiredFiles() {
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'shared/schema.ts',
      'server/index.ts',
      'client/src/App.tsx'
    ];

    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        this.results[`file_${file}`] = {
          success: true,
          message: `${file} exists ✅`
        };
      } else {
        this.results[`file_${file}`] = {
          success: false,
          message: `${file} is missing`,
          fix: 'Restore missing file from repository'
        };
      }
    }

    // Check for environment template
    if (fs.existsSync('env.example')) {
      this.results.envTemplate = {
        success: true,
        message: 'Environment template exists ✅'
      };
    } else {
      this.results.envTemplate = {
        success: false,
        message: 'env.example template missing',
        fix: 'Create env.example with required environment variables'
      };
    }

    // Check for .env file
    if (fs.existsSync('.env')) {
      this.results.envFile = {
        success: true,
        message: '.env file exists ✅'
      };
    } else {
      this.results.envFile = {
        success: false,
        message: '.env file missing',
        fix: 'Copy env.example to .env and configure your settings'
      };
    }
  }

  private checkEnvironmentVariables() {
    const requiredVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'SMTP_HOST',
      'SMTP_USERNAME',
      'SMTP_PASSWORD',
      'FROM_EMAIL'
    ];

    for (const varName of requiredVars) {
      if (process.env[varName]) {
        this.results[`env_${varName}`] = {
          success: true,
          message: `${varName} is set ✅`
        };
      } else {
        this.results[`env_${varName}`] = {
          success: false,
          message: `${varName} environment variable missing`,
          fix: `Add ${varName} to your .env file`
        };
      }
    }

    // Validate JWT secret length
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length >= 32) {
      this.results.jwtSecretLength = {
        success: true,
        message: 'JWT secret is secure length ✅'
      };
    } else {
      this.results.jwtSecretLength = {
        success: false,
        message: 'JWT secret too short or missing',
        fix: 'Generate a secure JWT secret: openssl rand -base64 32'
      };
    }
  }

  private async checkDatabaseConnection() {
    try {
      if (!process.env.DATABASE_URL) {
        this.results.dbConnection = {
          success: false,
          message: 'DATABASE_URL not set',
          fix: 'Set DATABASE_URL in .env file'
        };
        return;
      }

      // Try to import and test database connection
      const { db } = await import('../server/db');
      await db.execute('SELECT 1');
      
      this.results.dbConnection = {
        success: true,
        message: 'Database connection successful ✅'
      };
    } catch (error) {
      this.results.dbConnection = {
        success: false,
        message: `Database connection failed: ${error.message}`,
        fix: 'Check DATABASE_URL and ensure PostgreSQL is running'
      };
    }
  }

  private checkEmailConfiguration() {
    const requiredEmailVars = ['SMTP_HOST', 'SMTP_USERNAME', 'SMTP_PASSWORD', 'FROM_EMAIL'];
    const hasAllEmailVars = requiredEmailVars.every(v => process.env[v]);

    if (hasAllEmailVars) {
      // Basic validation of email format
      const fromEmail = process.env.FROM_EMAIL!;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (emailRegex.test(fromEmail)) {
        this.results.emailConfig = {
          success: true,
          message: 'Email configuration looks valid ✅'
        };
      } else {
        this.results.emailConfig = {
          success: false,
          message: 'FROM_EMAIL format invalid',
          fix: 'Set FROM_EMAIL to a valid email address'
        };
      }
    } else {
      this.results.emailConfig = {
        success: false,
        message: 'Email configuration incomplete',
        fix: 'Set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, and FROM_EMAIL'
      };
    }
  }

  private async checkPortAvailability() {
    const port = parseInt(process.env.PORT || '5000');
    
    try {
      const net = await import('net');
      
      return new Promise<void>((resolve) => {
        const server = net.createServer();
        
        server.listen(port, () => {
          server.close(() => {
            this.results.portAvailable = {
              success: true,
              message: `Port ${port} is available ✅`
            };
            resolve();
          });
        });
        
        server.on('error', () => {
          this.results.portAvailable = {
            success: false,
            message: `Port ${port} is already in use`,
            fix: `Kill the process using port ${port} or change PORT in .env`
          };
          resolve();
        });
      });
    } catch (error) {
      this.results.portAvailable = {
        success: false,
        message: `Could not check port availability: ${error.message}`,
        fix: 'Check your network configuration'
      };
    }
  }

  private printResults() {
    console.log('\n📋 Validation Results:\n');
    
    let successCount = 0;
    let totalCount = 0;

    for (const [key, result] of Object.entries(this.results)) {
      totalCount++;
      if (result.success) {
        successCount++;
        console.log(`✅ ${result.message}`);
      } else {
        console.log(`❌ ${result.message}`);
        if (result.fix) {
          console.log(`   💡 Fix: ${result.fix}`);
        }
      }
    }

    console.log(`\n📊 Summary: ${successCount}/${totalCount} checks passed\n`);

    if (successCount === totalCount) {
      console.log('🎉 All checks passed! Your development environment is ready.');
      console.log('\n🚀 Next steps:');
      console.log('   1. npm run db:push    # Update database schema');
      console.log('   2. npm run db:seed    # Seed development data');
      console.log('   3. npm run dev        # Start development server');
    } else {
      console.log('⚠️  Some checks failed. Please fix the issues above before continuing.');
      console.log('\n🔧 Quick setup commands:');
      console.log('   1. cp env.example .env    # Copy environment template');
      console.log('   2. # Edit .env with your settings');
      console.log('   3. npm install            # Install dependencies');
      console.log('   4. npm run setup          # Setup database and seed data');
    }
  }
}

// Run validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new SetupValidator();
  
  validator.validate()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}
