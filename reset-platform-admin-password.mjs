import { platformAdminAuthService } from "./server/services/platform-admin-auth.js";
import bcrypt from "bcrypt";
import { storage } from "./server/storage.js";

async function resetPlatformAdminPassword() {
  try {
    console.log("Platform Admin Password Reset Tool\n");
    
    // Get all admins
    const admins = await platformAdminAuthService.getAllAdmins();
    
    if (admins.length === 0) {
      console.log("No platform admins found!");
      return;
    }
    
    console.log("Available Platform Admins:");
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.email} (${admin.role})`);
    });
    
    // For now, let's reset the password for khan.aakib@outlook.com
    const emailToReset = "khan.aakib@outlook.com";
    const newPassword = "Admin123!"; // You can change this
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password in database
    const updated = await storage.updatePlatformAdminPassword(emailToReset, hashedPassword);
    
    if (updated) {
      console.log(`\n✅ Password reset successful!`);
      console.log(`📧 Email: ${emailToReset}`);
      console.log(`🔑 New Password: ${newPassword}`);
      console.log(`\n🔗 Login at: http://localhost:5000/admin/login`);
      console.log(`\n⚠️  IMPORTANT: Change this password after logging in!`);
    } else {
      console.log(`\n❌ Failed to reset password for ${emailToReset}`);
    }
    
  } catch (error) {
    console.error("Error resetting password:", error);
  }
  
  process.exit(0);
}

resetPlatformAdminPassword();
