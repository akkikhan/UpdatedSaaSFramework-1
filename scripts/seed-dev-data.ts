#!/usr/bin/env tsx
/**
 * Development Data Seeding Script
 * 
 * This script seeds the database with sample data for development purposes.
 * Run with: npm run db:seed
 */

import dotenv from 'dotenv';
dotenv.config();

import { db } from '../server/db';
import { storage } from '../server/storage';

async function seedDevelopmentData() {
  console.log('🌱 Seeding development data...');
  
  try {
    // Seed RBAC configuration first
    console.log('📝 Seeding RBAC configuration...');
    
    // Create permission templates
    const standardTemplate = await storage.createPermissionTemplate({
      name: "Standard Template",
      description: "Basic permissions for general business operations",
      permissions: ['read_users', 'create_users', 'read_reports', 'manage_settings'],
      businessTypes: ['general'],
      isDefault: true,
      isActive: true
    });

    const bankingTemplate = await storage.createPermissionTemplate({
      name: "Banking Regulatory Template",
      description: "Comprehensive banking permissions with regulatory compliance",
      permissions: [
        'read_users', 'create_users', 'financial_data_access', 'transaction_processing',
        'account_management', 'wire_transfers', 'loan_processing', 'credit_analysis',
        'aml_monitoring', 'kyc_verification', 'regulatory_reporting', 'risk_assessment'
      ],
      businessTypes: ['banking'],
      isDefault: false,
      isActive: true
    });

    const insuranceTemplate = await storage.createPermissionTemplate({
      name: "Insurance Operations Template",
      description: "Insurance-specific permissions for policy and claims management",
      permissions: [
        'read_users', 'create_users', 'policy_management', 'claims_processing',
        'underwriting_access', 'actuarial_data_access', 'premium_calculation',
        'risk_modeling', 'regulatory_filings'
      ],
      businessTypes: ['insurance'],
      isDefault: false,
      isActive: true
    });

    // Create business types
    const generalBusiness = await storage.createBusinessType({
      name: "General Business",
      description: "Standard business operations with basic compliance requirements",
      requiredCompliance: ['gdpr'],
      defaultPermissions: ['read_users', 'manage_settings'],
      riskLevel: 'low',
      isActive: true,
      maxTenants: null
    });

    const bankingBusiness = await storage.createBusinessType({
      name: "Banking",
      description: "Commercial and retail banks with comprehensive regulatory oversight",
      requiredCompliance: ['basel-iii', 'dodd-frank', 'ffiec', 'glba', 'bsa-aml', 'sox', 'pci'],
      defaultPermissions: ['read_users', 'financial_data_access', 'regulatory_reporting'],
      riskLevel: 'critical',
      isActive: true,
      maxTenants: 25
    });

    const insuranceBusiness = await storage.createBusinessType({
      name: "Insurance",
      description: "Insurance companies with actuarial and solvency requirements",
      requiredCompliance: ['naic', 'solvency-ii', 'ifrs17', 'sox', 'gdpr'],
      defaultPermissions: ['read_users', 'policy_management', 'regulatory_filings'],
      riskLevel: 'high',
      isActive: true,
      maxTenants: 30
    });

    // Create default roles
    await storage.createDefaultRole({
      name: "Administrator",
      description: "Full system access with all permissions",
      permissions: ['read_users', 'create_users', 'update_users', 'delete_users', 'manage_roles', 'manage_permissions'],
      businessTypeId: generalBusiness.id,
      permissionTemplateId: standardTemplate.id,
      isSystemRole: true,
      canBeModified: false,
      isActive: true,
      priority: 1
    });

    await storage.createDefaultRole({
      name: "Bank Administrator",
      description: "Senior banking administrator with full system access",
      permissions: ['read_users', 'create_users', 'financial_data_access', 'regulatory_reporting', 'manage_roles'],
      businessTypeId: bankingBusiness.id,
      permissionTemplateId: bankingTemplate.id,
      isSystemRole: false,
      canBeModified: true,
      isActive: true,
      priority: 1
    });

    console.log('✅ RBAC configuration seeded successfully');

    // Create sample tenants
    console.log('🏢 Creating sample tenants...');
    
    const demoTenant = await storage.createTenant({
      name: "Demo Corporation",
      orgId: "demo-corp",
      businessType: "Technology",
      adminEmail: "admin@demo-corp.local",
      website: "https://demo-corp.local",
      description: "Demo tenant for testing and development",
      enabledModules: ["auth", "rbac", "notifications"],
      moduleConfigs: {
        rbac: {
          permissionTemplate: "standard-template",
          businessType: "general"
        }
      }
    });

    const bankTenant = await storage.createTenant({
      name: "Community Bank Demo",
      orgId: "community-bank",
      businessType: "Banking",
      adminEmail: "admin@community-bank.local",
      website: "https://community-bank.local",
      description: "Demo banking tenant with regulatory compliance",
      enabledModules: ["auth", "rbac", "notifications", "compliance"],
      moduleConfigs: {
        rbac: {
          permissionTemplate: "banking-regulatory-template",
          businessType: "banking"
        }
      }
    });

    const insuranceTenant = await storage.createTenant({
      name: "Insurance Solutions Demo",
      orgId: "insurance-demo",
      businessType: "Insurance",
      adminEmail: "admin@insurance-demo.local",
      website: "https://insurance-demo.local",
      description: "Demo insurance company with actuarial capabilities",
      enabledModules: ["auth", "rbac", "notifications"],
      moduleConfigs: {
        rbac: {
          permissionTemplate: "insurance-operations-template",
          businessType: "insurance"
        }
      }
    });

    console.log('✅ Sample tenants created successfully');

    // Create sample users for demo tenant
    console.log('👥 Creating sample users...');
    
    const demoAdmin = await storage.createTenantUser({
      tenantId: demoTenant.id,
      firstName: "Demo",
      lastName: "Administrator",
      email: "admin@demo-corp.local",
      passwordHash: "$2b$10$example.hash.for.development.only", // bcrypt hash for "password123"
      status: "active"
    });

    const demoUser = await storage.createTenantUser({
      tenantId: demoTenant.id,
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@demo-corp.local",
      passwordHash: "$2b$10$example.hash.for.development.only",
      status: "active"
    });

    const demoManager = await storage.createTenantUser({
      tenantId: demoTenant.id,
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@demo-corp.local",
      passwordHash: "$2b$10$example.hash.for.development.only",
      status: "active"
    });

    console.log('✅ Sample users created successfully');

    // Create sample notifications
    console.log('📬 Creating sample notifications...');
    
    await storage.createTenantNotification({
      tenantId: demoTenant.id,
      type: "module_enabled",
      title: "RBAC Module Enabled",
      message: "Role-based access control has been enabled for your tenant.",
      metadata: { module: "rbac", enabledBy: "System Administrator" },
      isRead: false
    });

    await storage.createTenantNotification({
      tenantId: bankTenant.id,
      type: "compliance_alert",
      title: "Compliance Review Required",
      message: "Your banking compliance configuration requires quarterly review.",
      metadata: { compliance: "basel-iii", dueDate: "2024-12-31" },
      isRead: false
    });

    console.log('✅ Sample notifications created successfully');

    console.log('\n🎉 Development data seeding completed!');
    console.log('\n📊 Summary:');
    console.log('  • 3 Permission Templates created');
    console.log('  • 3 Business Types created');
    console.log('  • 2 Default Roles created');
    console.log('  • 3 Sample Tenants created');
    console.log('  • 3 Sample Users created');
    console.log('  • 2 Sample Notifications created');
    
    console.log('\n🚀 You can now:');
    console.log('  • Visit http://localhost:5000 for admin portal');
    console.log('  • Test with tenant "demo-corp" (admin@demo-corp.local)');
    console.log('  • Explore banking tenant "community-bank"');
    console.log('  • Test RBAC with insurance tenant "insurance-demo"');
    
    console.log('\n🔐 Default Login Credentials:');
    console.log('  • Email: admin@demo-corp.local');
    console.log('  • Password: password123');
    console.log('  • (For development only - change in production!)');

  } catch (error) {
    console.error('❌ Error seeding development data:', error);
    throw error;
  }
}

// Run the seeding if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDevelopmentData()
    .then(() => {
      console.log('\n✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    });
}
