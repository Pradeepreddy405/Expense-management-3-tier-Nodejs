
const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());

// Serve frontend files from the project root.
app.use(express.static(__dirname));

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Expense frontend server is running'
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Frontend server running on port ${PORT}`);
});
