// Firebase конфигурация
const firebaseConfig = {
    apiKey: "AIzaSyCGGVVdO_6PWRzfZmVTF2seGYXvAnvXmRs",
    authDomain: "finance-tracker-9ec6d.firebaseapp.com",
    projectId: "finance-tracker-9ec6d",
    storageBucket: "finance-tracker-9ec6d.firebasestorage.app",
    messagingSenderId: "1008097998702",
    appId: "1:1008097998702:web:5a93e734199d9bb98d737f"
};

// Инициализация Firebase
let app, auth, db, googleProvider;
let isFirebaseInitialized = false;

try {
    console.log("Инициализация Firebase...");
    
    // Инициализируем Firebase
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    
    // Настройка Google провайдера с дополнительными параметрами
    googleProvider = new firebase.auth.GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    
    // Добавляем custom параметры для решения проблемы popup
    googleProvider.setCustomParameters({
        'prompt': 'select_account',
        'display': 'popup'
    });
    
    isFirebaseInitialized = true;
    console.log("Firebase успешно инициализирован");
    
} catch (error) {
    console.error("Ошибка инициализации Firebase:", error);
    isFirebaseInitialized = false;
}

// Улучшенная функция входа через Google
async function signInWithGoogle() {
    if (!isFirebaseInitialized) {
        console.error("Firebase не инициализирован");
        return;
    }

    try {
        console.log("Попытка входа через Google...");
        
        // Проверяем возможность popup
        if (typeof window !== 'undefined' && window.navigator.userAgent.includes('Instagram')) {
            // Для Instagram и других встроенных браузеров используем redirect
            await auth.signInWithRedirect(googleProvider);
            return;
        }
        
        // Основной метод - popup
        const result = await auth.signInWithPopup(googleProvider);
        
        const user = result.user;
        console.log("Успешный вход:", user.displayName);
        
        // Обновляем UI
        updateAuthUI(user);
        
        // Загружаем данные пользователя
        await loadUserTransactions();
        
        return result;
        
    } catch (error) {
        console.error("Ошибка авторизации:", error);
        
        // Улучшенная обработка ошибок
        switch (error.code) {
            case 'auth/popup-closed-by-user':
                // Пробуем альтернативный метод
                console.log("Popup закрыт, пробуем redirect...");
                try {
                    await auth.signInWithRedirect(googleProvider);
                } catch (redirectError) {
                    console.error("Ошибка redirect:", redirectError);
                    showUserMessage("Ошибка входа. Попробуйте еще раз.", "error");
                }
                break;
                
            case 'auth/popup-blocked':
                console.log("Popup заблокирован, используем redirect...");
                try {
                    await auth.signInWithRedirect(googleProvider);
                } catch (redirectError) {
                    console.error("Ошибка redirect:", redirectError);
                    showUserMessage("Разрешите всплывающие окна или обновите страницу", "error");
                }
                break;
                
            case 'auth/unauthorized-domain':
                console.error("Домен не авторизован:", error.message);
                showUserMessage("Ошибка конфигурации. Обратитесь к администратору.", "error");
                break;
                
            default:
                console.error("Неизвестная ошибка авторизации:", error);
                showUserMessage("Ошибка входа: " + error.message, "error");
        }
    }
}

// Функция выхода
async function signOutUser() {
    if (!isFirebaseInitialized) return;
    
    try {
        await auth.signOut();
        console.log("Пользователь вышел из системы");
        
        // Обновляем UI
        updateAuthUI(null);
        
        // Очищаем локальные данные
        transactions = [];
        updateDisplay();
        
    } catch (error) {
        console.error("Ошибка выхода:", error);
        showUserMessage("Ошибка выхода: " + error.message, "error");
    }
}

// Обработка результата redirect (если был использован)
auth.getRedirectResult().then((result) => {
    if (result.user) {
        console.log("Успешный вход через redirect:", result.user.displayName);
        updateAuthUI(result.user);
        loadUserTransactions();
    }
}).catch((error) => {
    console.error("Ошибка redirect result:", error);
});

// Слушатель изменения состояния авторизации
auth.onAuthStateChanged((user) => {
    console.log("Изменение состояния авторизации:", user ? user.displayName : "не авторизован");
    updateAuthUI(user);
    
    if (user) {
        loadUserTransactions();
    } else {
        // Пользователь не авторизован
        transactions = [];
        updateDisplay();
    }
});

// Обновление UI авторизации
function updateAuthUI(user) {
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const userPhoto = document.getElementById('userPhoto');
    
    if (user) {
        // Пользователь авторизован
        loginBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        userName.textContent = user.displayName || user.email;
        
        if (user.photoURL) {
            userPhoto.src = user.photoURL;
            userPhoto.style.display = 'block';
        } else {
            userPhoto.style.display = 'none';
        }
        
        updateSyncStatus("✅ Синхронизировано");
    } else {
        // Пользователь не авторизован
        loginBtn.style.display = 'block';
        userInfo.style.display = 'none';
        updateSyncStatus("❌ Не авторизован");
    }
}

// Функция отображения сообщений пользователю
function showUserMessage(message, type = 'info') {
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
    `;
    
    // Цвет в зависимости от типа
    switch (type) {
        case 'error':
            notification.style.background = '#e74c3c';
            break;
        case 'success':
            notification.style.background = '#27ae60';
            break;
        default:
            notification.style.background = '#3498db';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Удаляем через 5 секунд
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Функции для работы с Firestore
async function saveTransactionToFirestore(transaction) {
    if (!isFirebaseInitialized || !auth.currentUser) {
        console.log("Пользователь не авторизован, сохраняем локально");
        return false;
    }
    
    try {
        const userCollection = db.collection('users').doc(auth.currentUser.uid).collection('transactions');
        await userCollection.add({
            ...transaction,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        updateSyncStatus("✅ Синхронизировано");
        return true;
    } catch (error) {
        console.error("Ошибка сохранения в Firestore:", error);
        updateSyncStatus("⚠️ Ошибка синхронизации");
        return false;
    }
}

async function loadUserTransactions() {
    if (!isFirebaseInitialized || !auth.currentUser) {
        console.log("Пользователь не авторизован");
        return;
    }
    
    try {
        updateSyncStatus("🔄 Загрузка данных...");
        
        const userCollection = db.collection('users').doc(auth.currentUser.uid).collection('transactions');
        const snapshot = await userCollection.orderBy('date', 'desc').get();
        
        const cloudTransactions = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            cloudTransactions.push({
                id: doc.id,
                ...data
            });
        });
        
        console.log(`Загружено ${cloudTransactions.length} транзакций из облака`);
        
        // Мерджим с локальными данными
        mergeTransactions(cloudTransactions);
        updateDisplay();
        updateSyncStatus("✅ Синхронизировано");
        
    } catch (error) {
        console.error("Ошибка загрузки данных:", error);
        updateSyncStatus("⚠️ Ошибка загрузки");
    }
}

async function deleteTransactionFromFirestore(transactionId) {
    if (!isFirebaseInitialized || !auth.currentUser || !transactionId) {
        return false;
    }
    
    try {
        const userCollection = db.collection('users').doc(auth.currentUser.uid).collection('transactions');
        await userCollection.doc(transactionId).delete();
        
        updateSyncStatus("✅ Синхронизировано");
        return true;
    } catch (error) {
        console.error("Ошибка удаления из Firestore:", error);
        updateSyncStatus("⚠️ Ошибка синхронизации");
        return false;
    }
}

// Функция обновления статуса синхронизации
function updateSyncStatus(status) {
    const syncStatusElement = document.getElementById('syncStatus');
    if (syncStatusElement) {
        syncStatusElement.textContent = status;
    }
}

// Функция мерджинга транзакций
function mergeTransactions(cloudTransactions) {
    if (cloudTransactions.length === 0) return;
    
    // Если локальных транзакций нет, используем облачные
    if (!transactions || transactions.length === 0) {
        transactions = cloudTransactions;
        return;
    }
    
    // Мерджим данные (приоритет у облачных)
    const mergedMap = new Map();
    
    // Добавляем локальные
    transactions.forEach(t => {
        if (!t.id) t.id = generateId();
        mergedMap.set(t.id, t);
    });
    
    // Добавляем/обновляем облачными
    cloudTransactions.forEach(t => {
        mergedMap.set(t.id, t);
    });
    
    transactions = Array.from(mergedMap.values());
}

// Вспомогательная функция генерации ID
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

console.log("Firebase модуль загружен");
