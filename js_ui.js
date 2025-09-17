// Функции пользовательского интерфейса

// Обновление интерфейса пользователя (авторизация)
function updateUserInterface(user) {
    const userInfo = document.getElementById('userInfo');
    
    if (user) {
        userInfo.innerHTML = `
            <img src="${user.photoURL}" alt="Avatar" class="user-avatar">
            <span>${user.displayName}</span>
            <button class="auth-btn" onclick="signOutUser()">Выйти</button>
        `;
        currentUser = user;
    } else {
        userInfo.innerHTML = `
            <button class="auth-btn" onclick="signInWithGoogle()">
                🔐 Войти через Google
            </button>
        `;
        currentUser = null;
    }
    
    updateSyncIndicator();
}

// Обновление индикатора синхронизации
function updateSyncIndicator(status) {
    const indicator = document.getElementById('syncIndicator');
    
    if (typeof isFirebaseConfigured === 'undefined' || !isFirebaseConfigured) {
        indicator.className = 'sync-indicator sync-offline';
        indicator.innerHTML = '📱 Локальный режим';
    } else if (!currentUser) {
        indicator.className = 'sync-indicator sync-offline';
        indicator.innerHTML = '🔐 Не авторизован';
    } else if (!isOnline) {
        indicator.className = 'sync-indicator sync-offline';
        indicator.innerHTML = '⚠️ Оффлайн';
    } else {
        switch (status) {
            case 'syncing':
                indicator.className = 'sync-indicator sync-syncing';
                indicator.innerHTML = '🔄 Синхронизация...';
                break;
            case 'online':
                indicator.className = 'sync-indicator sync-online';
                indicator.innerHTML = '✅ Синхронизировано';
                break;
            default:
                indicator.className = 'sync-indicator sync-offline';
                indicator.innerHTML = '⚠️ Оффлайн';
        }
    }
}

// Главная функция обновления отображения данных
function updateDisplay() {
    const monthTransactions = transactions.filter(t => t.month === currentMonth);
    
    updateDashboard();
    updateSummaryCards(monthTransactions);
    updateRecentTransactions();
    updateTransactionsPage();
}

// Обновление дашборда
function updateDashboard() {
    const currentMonthTransactions = transactions.filter(t => t.month === currentMonth);
    
    // Подсчет общего баланса и статистики по валютам
    const currencyTotals = {};
    let totalBalanceInMDL = 0;
    
    transactions.forEach(transaction => {
        if (!currencyTotals[transaction.currency]) {
            currencyTotals[transaction.currency] = { income: 0, expense: 0 };
        }
        currencyTotals[transaction.currency][transaction.type] += transaction.amount;
        
        // Конвертируем в MDL для общего баланса
        const amountInMDL = transaction.amount * currencies[transaction.currency].rate;
        if (transaction.type === 'income') {
            totalBalanceInMDL += amountInMDL;
        } else {
            totalBalanceInMDL -= amountInMDL;
        }
    });
    
    // Обновляем общий баланс
    document.getElementById('total-balance').textContent = `${totalBalanceInMDL.toLocaleString('ru-RU')} MDL`;
}

// Обновление карточек сводки по валютам
function updateSummaryCards(monthTransactions) {
    const currencyTotals = {};
    
    // Группируем транзакции по валютам
    monthTransactions.forEach(transaction => {
        if (!currencyTotals[transaction.currency]) {
            currencyTotals[transaction.currency] = { income: 0, expense: 0 };
        }
        currencyTotals[transaction.currency][transaction.type] += transaction.amount;
    });
    
    const summaryContainer = document.getElementById('summaryContainer');
    
    // Если нет данных, показываем заглушку
    if (Object.keys(currencyTotals).length === 0) {
        summaryContainer.innerHTML = `
            <div class="summary-card">
                <h3>📊 Статистика</h3>
                <div class="amount" style="color: #7f8c8d;">Нет данных за этот месяц</div>
            </div>
        `;
        return;
    }
    
    // Создаем карточки для каждой валюты
    let summaryHTML = '';
    
    Object.keys(currencyTotals).sort().forEach(currency => {
        const income = currencyTotals[currency].income;
        const expense = currencyTotals[currency].expense;
        const balance = income - expense;
        
        summaryHTML += `
            <div class="summary-card income-card">
                <h3>💚 Доход ${currency}</h3>
                <div class="amount">${income.toLocaleString('ru-RU')}</div>
            </div>
            <div class="summary-card expense-card">
                <h3>💸 Расход ${currency}</h3>
                <div class="amount">${expense.toLocaleString('ru-RU')}</div>
            </div>
            <div class="summary-card balance-card">
                <h3>💎 Баланс ${currency}</h3>
                <div class="amount">${balance.toLocaleString('ru-RU')}</div>
            </div>
        `;
    });
    
    summaryContainer.innerHTML = summaryHTML;
}

// Обновление последних транзакций на дашборде
function updateRecentTransactions() {
    const recentTransactions = transactions
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);
    
    displayTransactionsModern(recentTransactions, 'recent-transactions');
}

// Обновление страницы всех транзакций
function updateTransactionsPage() {
    const allTransactions = [...transactions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    displayTransactionsTable(allTransactions);
}

// Современное отображение транзакций (для дашборда)
function displayTransactionsModern(transactionsList, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if (transactionsList.length === 0) {
        container.innerHTML = '<div style="padding: 40px; text-align: center; color: #64748b;">Транзакций пока нет</div>';
        return;
    }
    
    transactionsList.forEach(transaction => {
        const category = categories[transaction.type][transaction.category];
        const isIncome = transaction.type === 'income';
        
        const item = document.createElement('div');
        item.className = 'transaction-item';
        item.innerHTML = `
            <div class="transaction-icon" style="background: ${isIncome ? '#dcfce7' : '#fef2f2'}; color: ${isIncome ? '#16a34a' : '#dc2626'}">
                ${category.icon}
            </div>
            <div class="transaction-info">
                <h4>${category.name}</h4>
                <p>${transaction.description || 'Без описания'}</p>
            </div>
            <div style="font-size: 12px; color: #64748b;">
                ${new Date(transaction.date).toLocaleDateString('ru-RU')}
            </div>
            <div class="transaction-amount ${isIncome ? 'amount-positive' : 'amount-negative'}">
                ${isIncome ? '+' : '-'}${transaction.amount.toLocaleString('ru-RU')} ${transaction.currency}
            </div>
            <button onclick="deleteTransaction(${transaction.id})" style="background: none; border: none; cursor: pointer; color: #64748b; font-size: 16px;">🗑️</button>
        `;
        
        container.appendChild(item);
    });
}

// Отображение транзакций в таблице (для страницы транзакций)
function displayTransactionsTable(transactionsList) {
    const tableBody = document.getElementById('transactionTable');
    tableBody.innerHTML = '';
    
    // Сортируем по дате (новые сверху)
    const sortedTransactions = transactionsList.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedTransactions.forEach(transaction => {
        const row = document.createElement('tr');
        const categoryName = categories[transaction.type][transaction.category].name;
        
        row.innerHTML = `
            <td>${new Date(transaction.date).toLocaleDateString('ru-RU')}</td>
            <td>${transaction.type === 'income' ? '💚 Доход' : '💸 Расход'}</td>
            <td>${categoryName}</td>
            <td>${transaction.description || ''}</td>
            <td class="amount-${transaction.type}">${transaction.amount.toLocaleString('ru-RU')}</td>
            <td><strong>${transaction.currency}</strong></td>
            <td><button class="delete-btn" onclick="deleteTransaction(${transaction.id})">Удалить</button></td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Если нет транзакций, показываем сообщение
    if (sortedTransactions.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="7" style="text-align: center; color: #7f8c8d; padding: 30px;">
                Нет транзакций
            </td>
        `;
        tableBody.appendChild(row);
    }
}

// Обновление страницы категорий
function updateCategoriesPage() {
    const breakdown = {};
    const currentMonthTransactions = transactions.filter(t => t.month === currentMonth);
    
    // Группируем по категориям и валютам
    currentMonthTransactions.forEach(transaction => {
        const key = `${transaction.type}_${transaction.category}_${transaction.currency}`;
        if (!breakdown[key]) {
            breakdown[key] = {
                name: categories[transaction.type][transaction.category].name,
                icon: categories[transaction.type][transaction.category].icon,
                amount: 0,
                type: transaction.type,
                currency: transaction.currency
            };
        }
        breakdown[key].amount += transaction.amount;
    });
    
    const container = document.getElementById('categoryBreakdown');
    
    // Если нет данных, показываем заглушку
    if (Object.keys(breakdown).length === 0) {
        container.innerHTML = `
            <div class="category-card">
                <div class="category-icon">📊</div>
                <div class="category-name">Нет данных</div>
                <div class="category-amount">За этот месяц нет транзакций</div>
            </div>
        `;
        return;
    }
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    // Сортируем категории по сумме (по убыванию)
    const sortedBreakdown = Object.values(breakdown).sort((a, b) => b.amount - a.amount);
    
    sortedBreakdown.forEach(item => {
        const card = document.createElement('div');
        card.className = 'category-card';
        
        const emoji = item.type === 'income' ? '💚' : '💸';
        const currencyLabel = item.currency ? ` (${item.currency})` : '';
        
        card.innerHTML = `
            <div class="category-icon">${item.icon}</div>
            <div class="category-name">${item.name}${currencyLabel}</div>
            <div class="category-amount">
                ${emoji} ${item.amount.toLocaleString('ru-RU')} ${item.currency}
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Функция для показа уведомлений
function showNotification(message, type = 'info') {
    // Временная реализация через alert
    if (type === 'error') {
        alert('Ошибка: ' + message);
    } else if (type === 'success') {
        console.log('Успех: ' + message);
    } else {
        console.log('Инфо: ' + message);
    }
}

// Функция для форматирования валют
function formatCurrency(amount, currency) {
    return `${amount.toLocaleString('ru-RU')} ${currency}`;
}

// Функция для форматирования даты
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Функция для получения названия месяца
function getMonthName(monthIndex) {
    const months = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    return months[monthIndex] || 'Неизвестный месяц';
}

// Функция для валидации формы
function validateTransactionForm() {
    const date = document.getElementById('dateInput').value;
    const amount = parseFloat(document.getElementById('amountInput').value);
    
    const errors = [];
    
    if (!date) {
        errors.push('Выберите дату');
    }
    
    if (!amount || amount <= 0) {
        errors.push('Введите корректную сумму');
    }
    
    if (errors.length > 0) {
        showNotification(errors.join(', '), 'error');
        return false;
    }
    
    return true;
}

// Функция для анимации при добавлении новой транзакции
function animateNewTransaction() {
    const tableBody = document.getElementById('transactionTable');
    const firstRow = tableBody.querySelector('tr');
    
    if (firstRow) {
        firstRow.style.backgroundColor = '#d4edda';
        setTimeout(() => {
            firstRow.style.backgroundColor = '';
        }, 1000);
    }
}