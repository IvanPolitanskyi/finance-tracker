// Глобальные переменные приложения
let transactions = [];
let currentMonth = new Date().getMonth();
let currentUser = null;
let isOnline = navigator.onLine;

// Категории доходов и расходов (ваши оригинальные)
const categories = {
    income: {
        initial: { name: 'Начальный баланс', icon: '💰' },
        salary: { name: 'Зарплата', icon: '💼' },
        crypto: { name: 'Крипта', icon: '₿' },
        gift: { name: 'Подарили', icon: '🎁' },
        additional: { name: 'Доп генерация', icon: '💡' },
        exchange: { name: 'Обмен валют', icon: '💱' }
    },
    expense: {
        food: { name: 'Продукты', icon: '🛒' },
        transport: { name: 'Транспорт', icon: '🚗' },
        utilities: { name: 'Коммунальные услуги', icon: '🏠' },
        rent: { name: 'Аренда', icon: '🏘️' },
        restaurant: { name: 'Кафе/Рестораны', icon: '🍽️' },
        clothes: { name: 'Одежда', icon: '👕' },
        online: { name: 'Заказы в интернете', icon: '📦' },
        pharmacy: { name: 'Аптека', icon: '💊' },
        exchange: { name: 'Обмен валют', icon: '💱' },
        other: { name: 'Прочее', icon: '💸' }
    }
};

// Валюты (ваши оригинальные)
const currencies = {
    MDL: { symbol: 'MDL', rate: 1 },
    UAH: { symbol: 'UAH', rate: 0.5 },
    USD: { symbol: '$', rate: 18 },
    EUR: { symbol: '€', rate: 20 },
    USDT: { symbol: 'USDT', rate: 18 }
};

// Инициализация приложения
async function initializeApp() {
    console.log('Инициализация приложения...');
    
    // Инициализируем Firebase
    const firebaseInitialized = await initializeFirebase();
    
    // Настраиваем интерфейс
    setupEventListeners();
    
    // Загружаем локальные данные если Firebase не настроен
    if (!firebaseInitialized) {
        loadLocalData();
    }
    
    // Инициализируем UI
    initializeUI();
    
    console.log('Приложение инициализировано');
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Основные элементы формы
    document.getElementById('typeSelect').addEventListener('change', updateCategoryOptions);
    document.getElementById('monthSelect').addEventListener('change', function() {
        currentMonth = parseInt(this.value);
        updateDisplay();
    });
    
    // Обработчики для обмена валют
    const fromAmountInput = document.getElementById('fromAmountInput');
    const toAmountInput = document.getElementById('toAmountInput');
    const fromCurrencySelect = document.getElementById('fromCurrencySelect');
    const toCurrencySelect = document.getElementById('toCurrencySelect');
    
    if (fromAmountInput) fromAmountInput.addEventListener('input', calculateExchangeRate);
    if (toAmountInput) toAmountInput.addEventListener('input', calculateExchangeRate);
    if (fromCurrencySelect) fromCurrencySelect.addEventListener('change', calculateExchangeRate);
    if (toCurrencySelect) toCurrencySelect.addEventListener('change', calculateExchangeRate);
    
    // Обработчики для онлайн/оффлайн режима
    window.addEventListener('online', () => {
        isOnline = true;
        updateSyncIndicator('online');
        if (currentUser) {
            syncDataAfterReconnect();
        }
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        updateSyncIndicator('offline');
    });
    
    // Закрытие модального окна при клике вне его
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('transaction-modal');
        if (event.target === modal) {
            closeModal();
        }
    });
}

// Инициализация UI элементов
function initializeUI() {
    // Устанавливаем текущую дату
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateInput').value = today;

    // Устанавливаем текущий месяц
    document.getElementById('monthSelect').value = currentMonth;
    
    // Обновляем категории
    updateCategoryOptions();
    
    // Обновляем отображение
    updateDisplay();
    
    // Обновляем индикатор синхронизации
    updateSyncIndicator('offline');
}

// Навигация по страницам
function showPage(pageId) {
    // Убираем активный класс у всех страниц и навигации
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.mobile-nav-item').forEach(item => item.classList.remove('active'));

    // Активируем нужную страницу
    document.getElementById(pageId).classList.add('active');

    // Активируем соответствующий пункт десктопной навигации, если вызвано из события
    if (typeof event !== 'undefined' && event.target) {
        const navItem = event.target.closest('.nav-item');
        if (navItem) {
            navItem.classList.add('active');
        }
    }

    // Активируем соответствующий пункт мобильной навигации
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
    mobileNavItems.forEach(item => {
        if (item.getAttribute('data-page') === pageId) {
            item.classList.add('active');
        }
    });

    // Обновляем заголовок
    const titles = {
        dashboard: 'Дашборд',
        transactions: 'Транзакции',
        exchange: 'Обмен валют',
        categories: 'Категории',
        analytics: 'Аналитика'
    };
    document.getElementById('page-title').textContent = titles[pageId];

    // Обновляем содержимое в зависимости от страницы
    if (pageId === 'categories') {
        updateCategoriesPage();
    }

    // Прокручиваем страницу наверх
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Обновление опций категорий в зависимости от типа операции
function updateCategoryOptions() {
    const type = document.getElementById('typeSelect').value;
    const categorySelect = document.getElementById('categorySelect');
    categorySelect.innerHTML = '';
    
    const categoryList = categories[type];
    for (let key in categoryList) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${categoryList[key].icon} ${categoryList[key].name}`;
        categorySelect.appendChild(option);
    }
}

// Модальные окна
function openAddTransactionModal(type = 'expense') {
    document.getElementById('typeSelect').value = type;
    updateCategoryOptions();
    document.getElementById('transaction-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('transaction-modal').classList.remove('active');
    document.getElementById('transaction-form').reset();
    
    // Сбрасываем дату на сегодня
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateInput').value = today;
}

// Добавление новой транзакции
function addTransaction(event) {
    event.preventDefault();
    
    const date = document.getElementById('dateInput').value;
    const type = document.getElementById('typeSelect').value;
    const category = document.getElementById('categorySelect').value;
    const amount = parseFloat(document.getElementById('amountInput').value);
    const currency = document.getElementById('currencySelect').value;
    const description = document.getElementById('descriptionInput').value;
    
    // Валидация данных
    if (!date || !amount || amount <= 0) {
        alert('Пожалуйста, заполните все обязательные поля корректно!');
        return;
    }
    
    // Создаем объект транзакции
    const transaction = {
        id: Date.now(),
        date: date,
        type: type,
        category: category,
        amount: amount,
        currency: currency,
        description: description,
        month: new Date(date).getMonth(),
        timestamp: new Date().toISOString()
    };
    
    // Добавляем транзакцию
    transactions.push(transaction);
    
    // Обновляем отображение и сохраняем данные
    updateDisplay();
    saveData();
    closeModal();
    
    console.log('Добавлена транзакция:', transaction);
}

// Функция для изменения месяца
function onMonthChange() {
    currentMonth = parseInt(document.getElementById('monthSelect').value);
    updateDisplay();
}

// Удаление транзакции
function deleteTransaction(id) {
    const confirmed = confirm('Вы уверены, что хотите удалить эту транзакцию?');
    if (!confirmed) return;
    
    transactions = transactions.filter(t => t.id !== id);
    updateDisplay();
    saveData();
    
    console.log('Удалена транзакция с ID:', id);
}

// Расчет курса обмена валют
function calculateExchangeRate() {
    const fromAmount = parseFloat(document.getElementById('fromAmountInput').value) || 0;
    const toAmount = parseFloat(document.getElementById('toAmountInput').value) || 0;
    const fromCurrency = document.getElementById('fromCurrencySelect').value;
    const toCurrency = document.getElementById('toCurrencySelect').value;

    if (fromAmount > 0 && toAmount > 0 && fromCurrency !== toCurrency) {
        const rate = (toAmount / fromAmount).toFixed(4);
        document.getElementById('rateDisplay').textContent = `1 ${fromCurrency} = ${rate} ${toCurrency}`;
    } else if (fromCurrency === toCurrency) {
        document.getElementById('rateDisplay').textContent = 'Выберите разные валюты';
    } else {
        document.getElementById('rateDisplay').textContent = 'Введите сумму для расчета курса';
    }
}

// Функция обмена валют местами
function swapCurrencies() {
    const fromAmount = document.getElementById('fromAmountInput').value;
    const toAmount = document.getElementById('toAmountInput').value;
    const fromCurrency = document.getElementById('fromCurrencySelect').value;
    const toCurrency = document.getElementById('toCurrencySelect').value;

    // Меняем местами суммы
    document.getElementById('fromAmountInput').value = toAmount;
    document.getElementById('toAmountInput').value = fromAmount;

    // Меняем местами валюты
    document.getElementById('fromCurrencySelect').value = toCurrency;
    document.getElementById('toCurrencySelect').value = fromCurrency;

    // Пересчитываем курс
    calculateExchangeRate();
}

// Добавление операции обмена валют
function addExchange() {
    const fromAmount = parseFloat(document.getElementById('fromAmountInput').value);
    const toAmount = parseFloat(document.getElementById('toAmountInput').value);
    const fromCurrency = document.getElementById('fromCurrencySelect').value;
    const toCurrency = document.getElementById('toCurrencySelect').value;

    // Валидация данных
    if (!fromAmount || !toAmount || fromAmount <= 0 || toAmount <= 0) {
        alert('Пожалуйста, введите корректные суммы для обмена!');
        return;
    }

    if (fromCurrency === toCurrency) {
        alert('Валюты обмена должны отличаться!');
        return;
    }

    // Используем текущую дату
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD format

    const rate = (toAmount / fromAmount).toFixed(4);
    const exchangeDescription = `Обмен ${fromCurrency}→${toCurrency} (курс: ${rate})`;

    // Создаем транзакцию расхода (отдаем валюту)
    const expenseTransaction = {
        id: Date.now(),
        date: date,
        type: 'expense',
        category: 'exchange',
        amount: fromAmount,
        currency: fromCurrency,
        description: exchangeDescription,
        month: now.getMonth(),
        timestamp: now.toISOString()
    };

    // Создаем транзакцию дохода (получаем валюту)
    const incomeTransaction = {
        id: Date.now() + 1,
        date: date,
        type: 'income',
        category: 'exchange',
        amount: toAmount,
        currency: toCurrency,
        description: exchangeDescription,
        month: now.getMonth(),
        timestamp: now.toISOString()
    };

    transactions.push(expenseTransaction);
    transactions.push(incomeTransaction);

    // Очищаем форму обмена
    clearExchangeForm();

    // Обновляем отображение и сохраняем данные
    updateDisplay();
    saveData();

    // Показываем успешное сообщение и возвращаемся на дашборд
    alert(`✓ Обмен выполнен успешно!\n\n${fromAmount} ${fromCurrency} → ${toAmount} ${toCurrency}`);
    showPage('dashboard');

    console.log('Добавлен обмен валют:', { expenseTransaction, incomeTransaction });
}

// Очистка формы обмена валют
function clearExchangeForm() {
    document.getElementById('fromAmountInput').value = '';
    document.getElementById('toAmountInput').value = '';
    document.getElementById('rateDisplay').textContent = 'Введите сумму для расчета курса';
}

// Фильтрация транзакций
function filterTransactions() {
    const filterValue = document.getElementById('typeFilter').value;
    let filteredTransactions = transactions;
    
    if (filterValue !== 'all') {
        filteredTransactions = transactions.filter(t => t.type === filterValue);
    }
    
    filteredTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    displayTransactionsTable(filteredTransactions);
}

// Сохранение данных (локально и в Firebase)
async function saveData() {
    // Всегда сохраняем локально
    localStorage.setItem('financeTransactions', JSON.stringify(transactions));
    
    // Сохраняем в Firebase если доступно
    if (typeof isFirebaseConfigured !== 'undefined' && isFirebaseConfigured && currentUser && isOnline) {
        await saveDataToFirebase();
    }
}

// Загрузка локальных данных
function loadLocalData() {
    const savedData = localStorage.getItem('financeTransactions');
    if (savedData) {
        try {
            transactions = JSON.parse(savedData);
            updateDisplay();
            console.log('Загружены локальные данные');
        } catch (error) {
            console.error('Ошибка загрузки локальных данных:', error);
            transactions = [];
        }
    }
}

// Экспорт данных в Excel
function exportToExcel() {
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                       'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    
    const monthTransactions = transactions.filter(t => t.month === currentMonth);
    
    if (monthTransactions.length === 0) {
        alert('Нет данных для экспорта!');
        return;
    }
    
    // Подготавливаем данные для экспорта
    const data = monthTransactions.map(t => ({
        'Дата': new Date(t.date).toLocaleDateString('ru-RU'),
        'Тип': t.type === 'income' ? 'Доход' : 'Расход',
        'Категория': categories[t.type][t.category].name,
        'Описание': t.description,
        'Сумма': t.amount,
        'Валюта': t.currency
    }));
    
    // Создаем Excel файл
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, monthNames[currentMonth]);
    
    // Скачиваем файл
    const fileName = `Финансы_${monthNames[currentMonth]}_2025.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    console.log('Экспортирован файл:', fileName);
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', initializeApp);