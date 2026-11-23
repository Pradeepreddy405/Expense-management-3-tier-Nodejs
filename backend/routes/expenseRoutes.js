
const express = require('express');
const router = express.Router();

const {
    addExpense,
    getAllExpenses,
    updateExpense,
    deleteExpense
} = require('../controllers/expenseController');

// POST /api/expenses — create an expense.
router.post('/', addExpense);

// GET /api/expenses — retrieve all expenses.
router.get('/', getAllExpenses);

// PUT /api/expenses/:id — update an expense.
router.put('/:id', updateExpense);

// DELETE /api/expenses/:id — delete an expense.
router.delete('/:id', deleteExpense);

module.exports = router;
