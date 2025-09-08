const { storage } = require("./server/storage.ts");

console.log("🔍 Checking storage functions...");
console.log("Storage object methods:");
console.log(
  Object.getOwnPropertyNames(Object.getPrototypeOf(storage)).filter(name => name !== "constructor")
);
console.log("\nHas checkUserPermission?", typeof storage.checkUserPermission);

if (typeof storage.checkUserPermission === "function") {
  console.log("✅ checkUserPermission function exists");

  // Test the function
  storage
    .checkUserPermission("1", "read", "test-tenant-id")
    .then(result => {
      console.log("✅ Function call successful, result:", result);
    })
    .catch(err => {
      console.log("❌ Function call failed:", err.message);
    });
} else {
  console.log("❌ checkUserPermission function does NOT exist");
}
