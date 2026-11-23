
const db = require('../config/db');

// POST /api/expenses — create an expense.
exports.addExpense = (req, res) => {
    const { title, amount, category, expense_date, description } = req.body;

    if (!title || amount === undefined || amount === null ||
        !category || !expense_date) {
        return res.status(400).json({
            message: 'Title, amount, category and expense date are required'
        });
    }

    const sql = `
        INSERT INTO expenses
        (title, amount, category, expense_date, description)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [title, amount, category, expense_date, description || null],
        (err, result) => {
            if (err) {
                console.error('Failed to add expense:', err.message);
                return res.status(500).json({
                    message: 'Failed to add expense',
                    error: err.message
                });
            }

            return res.status(201).json({
                message: 'Expense added successfully',
                expenseId: result.insertId
            });
        }
    );
};


// GET /api/expenses — retrieve all expenses.
exports.getAllExpenses = (req, res) => {
    const sql = 'SELECT * FROM expenses ORDER BY expense_date DESC';

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Failed to retrieve expenses:', err.message);
            return res.status(500).json({
                message: 'Failed to retrieve expenses',
                error: err.message
            });
        }

        return res.status(200).json({
            message: 'Expenses retrieved successfully',
            data: results
        });
    });
};


// PUT /api/expenses/:id — update an existing expense.
exports.updateExpense = (req, res) => {
    const { id } = req.params;
    const { title, amount, category, expense_date, description } = req.body;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
        return res.status(400).json({
            message: 'Invalid expense ID'
        });
    }

    if (!title || amount === undefined || amount === null ||
        !category || !expense_date) {
        return res.status(400).json({
            message: 'Title, amount, category and expense date are required'
        });
    }

    const sql = `
        UPDATE expenses
        SET title = ?,
            amount = ?,
            category = ?,
            expense_date = ?,
            description = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [title, amount, category, expense_date, description || null, id],
        (err, result) => {
            if (err) {
                console.error('Failed to update expense:', err.message);
                return res.status(500).json({
                    message: 'Failed to update expense',
                    error: err.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: 'Expense not found'
                });
            }

            return res.status(200).json({
                message: 'Expense updated successfully',
                expenseId: Number(id)
            });
        }
    );
};


// DELETE /api/expenses/:id — delete an existing expense.
exports.deleteExpense = (req, res) => {
    const { id } = req.params;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
        return res.status(400).json({
            message: 'Invalid expense ID'
        });
    }

    const sql = 'DELETE FROM expenses WHERE id = ?';

    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Failed to delete expense:', err.message);
            return res.status(500).json({
                message: 'Failed to delete expense',
                error: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Expense not found'
            });
        }

        return res.status(200).json({
            message: 'Expense deleted successfully',
            expenseId: Number(id)
        });
    });
};
