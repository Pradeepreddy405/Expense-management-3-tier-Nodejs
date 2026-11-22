const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve frontend static files
app.use(express.static(path.join(__dirname, "public")));

// Health check
app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "Expense frontend server is running"
    });
});

// Start frontend server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Frontend server running on port ${PORT}`);
});
