require("dotenv").config();

const express = require("express");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Validate expense input
function validateExpense(data) {
    const { title, amount, category, expense_date } = data;

    if (
        typeof title !== "string" ||
        !title.trim() ||
        title.trim().length > 150
    ) {
        return "Title is required and must not exceed 150 characters";
    }

    if (
        amount === undefined ||
        amount === null ||
        amount === "" ||
        !Number.isFinite(Number(amount)) ||
        Number(amount) <= 0 ||
        !/^\\d+(\\.\\d{1,2})?$/.test(String(amount))
    ) {
        return "Amount must be a positive number with up to 2 decimal places";
    }

    if (
        typeof category !== "string" ||
        !category.trim() ||
        category.trim().length > 100
    ) {
        return "Category is required and must not exceed 100 characters";
    }

    if (
        typeof expense_date !== "string" ||
        !/^\\d{4}-\\d{2}-\\d{2}$/.test(expense_date)
    ) {
        return "Expense date must be in YYYY-MM-DD format";
    }

    const date = new Date(`${expense_date}T00:00:00Z`);

    if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== expense_date
    ) {
        return "Invalid expense date";
    }

    if (
        data.description !== undefined &&
        data.description !== null &&
        typeof data.description !== "string"
    ) {
        return "Description must be a string or null";
    }

    return null;
}

// Validate expense ID
function validateId(id) {
    return /^[1-9]\\d*$/.test(id) &&
        Number.isSafeInteger(Number(id));
}

// 1. Health Check API
app.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.status(200).json({
            status: "UP",
            application: "Expense Backend",
            database: "Connected"
        });

    } catch (error) {
        console.error("Health check failed:", error.message);

        res.status(503).json({
            status: "DOWN",
            application: "Expense Backend",
            database: "Disconnected"
        });
    }
});

// 2. Get All Expenses
app.get("/api/expenses", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM expenses ORDER BY expense_date DESC, id DESC"
        );

        res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });

    } catch (error) {
        console.error("Fetch expenses error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve expenses"
        });
    }
});

// 3. Get Expense By ID
app.get("/api/expenses/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!validateId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid expense ID"
            });
        }

        const [rows] = await pool.execute(
            "SELECT * FROM expenses WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }

        res.status(200).json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        console.error("Fetch expense error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve expense"
        });
    }
});

// 4. Create Expense
app.post("/api/expenses", async (req, res) => {
    try {
        const validationError = validateExpense(req.body);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        const {
            title,
            amount,
            category,
            description,
            expense_date
        } = req.body;

        const [result] = await pool.execute(
            `INSERT INTO expenses
            (title, amount, category, description, expense_date)
            VALUES (?, ?, ?, ?, ?)`,
            [
                title.trim(),
                amount,
                category.trim(),
                description ?? null,
                expense_date
            ]
        );

        const [rows] = await pool.execute(
            "SELECT * FROM expenses WHERE id = ?",
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: "Expense created successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("Create expense error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to create expense"
        });
    }
});

// 5. Update Expense
app.put("/api/expenses/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!validateId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid expense ID"
            });
        }

        const validationError = validateExpense(req.body);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        const [existing] = await pool.execute(
            "SELECT id FROM expenses WHERE id = ?",
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }

        const {
            title,
            amount,
            category,
            description,
            expense_date
        } = req.body;

        await pool.execute(
            `UPDATE expenses
             SET title = ?,
                 amount = ?,
                 category = ?,
                 description = ?,
                 expense_date = ?
             WHERE id = ?`,
            [
                title.trim(),
                amount,
                category.trim(),
                description ?? null,
                expense_date,
                id
            ]
        );

        const [rows] = await pool.execute(
            "SELECT * FROM expenses WHERE id = ?",
            [id]
        );

        res.status(200).json({
            success: true,
            message: "Expense updated successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("Update expense error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to update expense"
        });
    }
});

// 6. Delete Expense
app.delete("/api/expenses/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!validateId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid expense ID"
            });
        }

        const [result] = await pool.execute(
            "DELETE FROM expenses WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Expense deleted successfully",
            id: Number(id)
        });

    } catch (error) {
        console.error("Delete expense error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to delete expense"
        });
    }
});

// Handle unknown routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});

// Start server
const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Expense Backend running on port ${PORT}`);
});

// Graceful shutdown
async function shutdown() {
    console.log("Shutting down application...");

    server.close(async () => {
        await pool.end();
        console.log("MySQL pool closed");
        process.exit(0);
    });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
