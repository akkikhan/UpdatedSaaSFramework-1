// Direct test of RBAC route with minimal implementation
import express from "express";
const app = express();

app.use(express.json());

// Simple test endpoint
app.post("/test-rbac", (req, res) => {
  try {
    const { userId, permission } = req.body;

    if (!userId || !permission) {
      return res.status(400).json({ message: "User ID and permission are required" });
    }

    // Just return success for testing
    res.json({
      hasPermission: true,
      userId,
      permission,
      message: "RBAC test successful",
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Test failed" });
  }
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Test RBAC server running on port ${PORT}`);
});
