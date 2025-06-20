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
    
    if (!isFirebaseConfigured) {
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
    
    updateTransactionTable(monthTransactions);
    updateSummaryCards(monthTransactions);
    updateCategoryBreakdown(monthTransactions);
}

// Обновление таблицы транзакций
function updateTransactionTable(monthTransactions) {
    const tableBody = document.getElementById('transactionTable');
    tableBody.innerHTML = '';
    
    // Сортируем по дате (новые сверху)
    const sortedTransactions = monthTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedTransactions.forEach(transaction => {
        const row = document.createElement('tr');
        const categoryName = categories[transaction.type][transaction.category] || 'Неизвестная категория';
        
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
                Нет транзакций за этот месяц
            </td>
        `;
        tableBody.appendChild(row);
    }
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
    
    const summaryContainer = document.querySelector('.summary');
    
    // Если нет данных, показываем заглушку
    if (Object.keys(currencyTotals).length === 0) {
        summaryContainer.innerHTML = `
            <div class="summary-card">
                <h3>📊 Статистика</h3>
                <div class="amount" style="color: #7f8c8d;">Нет данных</div>
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

// Обновление разбивки по категориям
function updateCategoryBreakdown(monthTransactions) {
    const breakdown = {};
    
    // Группируем по категориям и валютам
    monthTransactions.forEach(transaction => {
        const key = `${transaction.type}_${transaction.category}_${transaction.currency}`;
        if (!breakdown[key]) {
            breakdown[key] = {
                name: categories[transaction.type][transaction.category] || 'Неизвестная категория',
                amount: 0,
                type: transaction.type,
                currency: transaction.currency
            };
        }
        breakdown[key].amount += transaction.amount;
    });
    
    const container = document.getElementById('categoryBreakdown');
    
    // Если нет данных, скрываем секцию
    if (Object.keys(breakdown).length === 0) {
        container.innerHTML = '';
        return;
    }
    
    // Создаем заголовок
    container.innerHTML = `
        <h3 style="grid-column: 1/-1; color: #2c3e50; margin-bottom: 20px; text-align: center;">
            📊 Разбивка по категориям
        </h3>
    `;
    
    // Сортируем категории по сумме (по убыванию)
    const sortedBreakdown = Object.values(breakdown).sort((a, b) => b.amount - a.amount);
    
    sortedBreakdown.forEach(item => {
        const div = document.createElement('div');
        div.className = 'category-item';
        
        const emoji = item.type === 'income' ? '💚' : '💸';
        const currencyLabel = item.currency ? ` (${item.currency})` : '';
        
        div.innerHTML = `
            <div class="category-name">${emoji} ${item.name}${currencyLabel}</div>
            <div class="category-amount amount-${item.type}">
                ${item.amount.toLocaleString('ru-RU')}
            </div>
        `;
        
        container.appendChild(div);
    });
}

// Функция для показа уведомлений (можно расширить)
function showNotification(message, type = 'info') {
    // Временная реализация через alert
    // В будущем можно заменить на красивые toast уведомления
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

// ДОПОЛНЕНИЯ К ui.js ДЛЯ МОБИЛЬНЫХ УЛУЧШЕНИЙ

// Мобильные функции - добавить в конец ui.js

// Детекция мобильного устройства
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
}

// Инициализация мобильных улучшений
function initMobileEnhancements() {
    if (isMobileDevice()) {
        setupThumbNavigation();
        setupMobileOptimizations();
        setupTouchGestures();
        setupHapticFeedback();
        setupMobileModals();
    }
}

// Создание thumb-friendly навигации внизу экрана
function setupThumbNavigation() {
    const thumbNav = document.createElement('div');
    thumbNav.className = 'mobile-thumb-nav';
    thumbNav.innerHTML = `
        <button class="btn btn-add" onclick="scrollToAddForm()" title="Добавить">
            ➕
        </button>
        <button class="btn btn-export" onclick="exportToExcel()" title="Экспорт">
            📊
        </button>
        <button class="btn" onclick="scrollToTop()" title="Наверх">
            ⬆️
        </button>
        <button class="btn" onclick="toggleMobileSummary()" title="Статистика">
            💰
        </button>
    `;
    document.body.appendChild(thumbNav);
}

// Плавная прокрутка к форме добавления
function scrollToAddForm() {
    document.querySelector('.controls').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
    addHapticFeedback();
}

// Прокрутка наверх
function scrollToTop() {
    window.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
    });
    addHapticFeedback();
}

// Показ/скрытие мобильной сводки
function toggleMobileSummary() {
    const summary = document.querySelector('.summary');
    if (summary.style.display === 'none') {
        summary.style.display = 'grid';
        summary.scrollIntoView({ behavior: 'smooth' });
    } else {
        summary.style.display = 'none';
    }
    addHapticFeedback();
}

// Настройка мобильных оптимизаций
function setupMobileOptimizations() {
    // Предотвращение zoom при фокусе на input
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        if (input.type !== 'date' && input.type !== 'number') {
            input.style.fontSize = '16px';
        }
    });
    
    // Автозакрытие мобильной клавиатуры при скролле
    let lastScrollTop = 0;
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop > lastScrollTop + 50) {
            // Скролл вниз - скрываем клавиатуру
            document.activeElement.blur();
        }
        lastScrollTop = scrollTop;
    }, { passive: true });
    
    // Улучшенное отображение таблицы на мобильных
    optimizeMobileTable();
}

// Оптимизация таблицы для мобильных
function optimizeMobileTable() {
    const table = document.querySelector('table');
    if (!table) return;
    
    // Добавляем классы для скрытия колонок на маленьких экранах
    const headers = table.querySelectorAll('th');
    const cells = table.querySelectorAll('td');
    
    if (window.innerWidth <= 390) {
        // Скрываем описание на очень маленьких экранах
        if (headers[3]) headers[3].classList.add('hide-on-small');
        cells.forEach((cell, index) => {
            if ((index + 1) % 7 === 4) { // Каждая 4-я колонка (описание)
                cell.classList.add('hide-on-small');
            }
        });
    }
    
    // Добавляем горизонтальный скролл с индикатором
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer && !tableContainer.querySelector('.swipe-indicator')) {
        tableContainer.classList.add('swipe-indicator');
    }
}

// Настройка touch жестов
function setupTouchGestures() {
    let startX, startY, currentX, currentY;
    
    // Swipe для навигации между месяцами
    const monthSelect = document.getElementById('monthSelect');
    
    document.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        if (!startX || !startY) return;
        
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
        if (!startX || !startY) return;
        
        const diffX = startX - currentX;
        const diffY = startY - currentY;
        
        // Горизонтальный swipe для смены месяца
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            if (diffX > 0) {
                // Swipe влево - следующий месяц
                changeMonth(1);
            } else {
                // Swipe вправо - предыдущий месяц
                changeMonth(-1);
            }
        }
        
        // Сброс значений
        startX = startY = currentX = currentY = null;
    }, { passive: true });
}

// Смена месяца через swipe
function changeMonth(direction) {
    const monthSelect = document.getElementById('monthSelect');
    const currentMonth = parseInt(monthSelect.value);
    let newMonth = currentMonth + direction;
    
    // Ограничиваем диапазон (0-11)
    if (newMonth < 0) newMonth = 11;
    if (newMonth > 11) newMonth = 0;
    
    monthSelect.value = newMonth;
    monthSelect.dispatchEvent(new Event('change'));
    
    // Показываем уведомление о смене месяца
    showMobileToast(`Переключено на ${getMonthName(newMonth)}`);
    addHapticFeedback();
}

// Мобильные уведомления (toast)
function showMobileToast(message, duration = 2000) {
    // Удаляем предыдущий toast если есть
    const existingToast = document.querySelector('.mobile-toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'mobile-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 14px;
        z-index: 3000;
        backdrop-filter: blur(10px);
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Анимация появления
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });
    
    // Удаление через указанное время
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Имитация haptic feedback
function setupHapticFeedback() {
    // Добавляем haptic feedback ко всем кнопкам
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', addHapticFeedback);
    });
}

function addHapticFeedback() {
    // Попытка использовать реальный haptic feedback если доступен
    if (navigator.vibrate) {
        navigator.vibrate(10); // Короткая вибрация
    }
    
    // Визуальная имитация haptic feedback
    event.target.classList.add('haptic-feedback');
    setTimeout(() => {
        event.target.classList.remove('haptic-feedback');
    }, 100);
}

// Настройка мобильных модальных окон
function setupMobileModals() {
    // Можно использовать для полноэкранного редактирования транзакций
}

// Адаптивное изменение размера при повороте экрана
function handleOrientationChange() {
    setTimeout(() => {
        optimizeMobileTable();
        
        // Обновляем viewport height для мобильных браузеров
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }, 100);
}

// Улучшенная функция валидации для мобильных
function validateMobileForm() {
    const errors = [];
    
    // Проверяем обязательные поля
    const date = document.getElementById('dateInput').value;
    const amount = parseFloat(document.getElementById('amountInput').value);
    
    if (!date) {
        errors.push('📅 Выберите дату');
    }
    
    if (!amount || amount <= 0) {
        errors.push('💰 Введите корректную сумму');
    }
    
    if (errors.length > 0) {
        showMobileToast(errors.join(', '), 3000);
        addHapticFeedback();
        return false;
    }
    
    return true;
}

// Оптимизация производительности для мобильных
function optimizeMobilePerformance() {
    // Lazy loading для больших списков транзакций
    if (transactions.length > 50) {
        implementVirtualScrolling();
    }
    
    // Debounce для поиска и фильтрации
    const searchInput = document.querySelector('#searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterTransactions(e.target.value);
            }, 300);
        });
    }
}

// Инициализация всех мобильных улучшений
document.addEventListener('DOMContentLoaded', () => {
    if (isMobileDevice()) {
        initMobileEnhancements();
        
        // Слушатели для изменения ориентации
        window.addEventListener('orientationchange', handleOrientationChange);
        window.addEventListener('resize', handleOrientationChange);
        
        // Обновляем CSS переменную для viewport height
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
});

// Экспорт функций для использования в других файлах
window.mobileEnhancements = {
    showToast: showMobileToast,
    addHapticFeedback: addHapticFeedback,
    isMobileDevice: isMobileDevice
};
