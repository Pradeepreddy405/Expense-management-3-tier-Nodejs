const expenseForm = document.getElementById("expenseForm");
const expenseTableBody = document.getElementById("expenseTableBody");
const message = document.getElementById("message");

const titleInput = document.getElementById("title");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("expense_date");
const descriptionInput = document.getElementById("description");

// Set today's date using the local system date
function setTodayDate() {
    const today = new Date();
    const localDate = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");

    dateInput.value = localDate;
}

// Display success or error messages
function showMessage(text, type) {
    message.textContent = text;
    message.className = type;
}

// Load expenses from the backend API
async function loadExpenses() {
    expenseTableBody.textContent = "";

    try {
        const response = await fetch("/api/expenses");
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Unable to fetch expenses");
        }

        if (result.data.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 5;
            cell.textContent = "No expenses found";

            row.appendChild(cell);
            expenseTableBody.appendChild(row);
            return;
        }

        result.data.forEach((expense) => {
            const row = document.createElement("tr");

            const values = [
                expense.id,
                expense.title,
                expense.category,
                Number(expense.amount).toFixed(2),
                expense.expense_date
            ];

            values.forEach((value) => {
                const cell = document.createElement("td");
                cell.textContent = value ?? "";
                row.appendChild(cell);
            });

            expenseTableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Error loading expenses:", error);
        showMessage(error.message, "error");
    }
}

// Submit a new expense
expenseForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = expenseForm.querySelector('button[type="submit"]');

    const expense = {
        title: titleInput.value.trim(),
        amount: amountInput.value,
        category: categoryInput.value.trim(),
        expense_date: dateInput.value,
        description: descriptionInput.value.trim() || null
    };

    submitButton.disabled = true;
    showMessage("Adding expense...", "");

    try {
        const response = await fetch("/api/expenses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(expense)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Failed to add expense");
        }

        showMessage("Expense added successfully!", "success");

        expenseForm.reset();
        setTodayDate();

        await loadExpenses();

    } catch (error) {
        console.error("Error adding expense:", error);
        showMessage(error.message, "error");

    } finally {
        submitButton.disabled = false;
    }
});

// Initial application setup
setTodayDate();
loadExpenses();
