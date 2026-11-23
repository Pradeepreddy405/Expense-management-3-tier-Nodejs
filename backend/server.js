
const express = require('express');
const cors = require('cors');
require('dotenv').config();

require('./config/db');

const expenseRoutes = require('./routes/expenseRoutes');

const app = express();

// Log each completed HTTP request to stdout.
app.use((req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
        console.log(
            `${new Date().toISOString()} | ${req.method} ${req.originalUrl} | ${res.statusCode} | ${Date.now() - startTime}ms`
        );
    });

    next();
});

// Middleware
app.use(cors());
app.use(express.json());

// Expense API routes
app.use('/api/expenses', expenseRoutes);

// Backend health check
app.get('/', (req, res) => {
    res.send('Expense Tracker Backend is Running!');
});

// Server configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
