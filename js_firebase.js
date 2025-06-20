// Firebase конфигурация
// ВАЖНО: Замените эти значения на ваши настройки Firebase после создания проекта
const firebaseConfig = {
    apiKey: "AIzaSyCGGVVdO_6PWRzfZmVTF2seGYXvAnvXmRs",
    authDomain: "finance-tracker-9ec6d.firebaseapp.com",
    projectId: "finance-tracker-9ec6d",
    storageBucket: "finance-tracker-9ec6d.firebasestorage.app",
    messagingSenderId: "1008097998702",
    appId: "1:1008097998702:web:5a93e734199d9bb98d737f"
};

// Глобальные переменные Firebase
let auth = null;
let db = null;
let isFirebaseConfigured = false;

// Инициализация Firebase
async function initializeFirebase() {
    // Проверяем, настроен ли Firebase
    isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";
    
    if (!isFirebaseConfigured) {
        console.warn('Firebase не настроен. Работаем в локальном режиме.');
        return false;
    }

    try {
        // Динамический импорт Firebase модулей
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
        const { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
        const { getFirestore, doc, getDoc, setDoc, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        
        // Инициализация Firebase
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        
        // Создаем провайдер Google
        const provider = new GoogleAuthProvider();
        
        // Сохраняем функции в глобальных переменных для доступа из других файлов
        window.firebaseAuth = {
            signInWithPopup: (auth, provider) => signInWithPopup(auth, provider),
            signOut: (auth) => signOut(auth),
            onAuthStateChanged: (auth, callback) => onAuthStateChanged(auth, callback),
            provider: provider
        };
        
        window.firebaseFirestore = {
            doc: (db, collection, docId) => doc(db, collection, docId),
            getDoc: (docRef) => getDoc(docRef),
            setDoc: (docRef, data) => setDoc(docRef, data),
            onSnapshot: (docRef, callback) => onSnapshot(docRef, callback)
        };
        
        // Слушаем изменения авторизации
        onAuthStateChanged(auth, (user) => {
            updateUserInterface(user);
            if (user) {
                loadUserData(user);
            } else {
                currentUser = null;
                transactions = [];
                updateDisplay();
            }
        });
        
        console.log('Firebase успешно инициализирован');
        return true;
        
    } catch (error) {
        console.error('Ошибка инициализации Firebase:', error);
        return false;
    }
}

// Авторизация через Google
async function signInWithGoogle() {
    if (!isFirebaseConfigured) {
        alert('Firebase не настроен. Приложение работает в локальном режиме.');
        return;
    }
    
    if (!auth || !window.firebaseAuth) {
        alert('Firebase не инициализирован');
        return;
    }
    
    try {
        const result = await window.firebaseAuth.signInWithPopup(auth, window.firebaseAuth.provider);
        currentUser = result.user;
        console.log('Пользователь авторизован:', currentUser.displayName);
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        alert('Ошибка авторизации: ' + error.message);
    }
}

// Выход из аккаунта
async function signOutUser() {
    if (!auth || !window.firebaseAuth) return;
    
    try {
        await window.firebaseAuth.signOut(auth);
        currentUser = null;
        transactions = [];
        console.log('Пользователь вышел из системы');
    } catch (error) {
        console.error('Ошибка выхода:', error);
    }
}

// Загрузка данных пользователя из Firestore
async function loadUserData(user) {
    if (!db || !window.firebaseFirestore || !user) return;
    
    try {
        updateSyncIndicator('syncing');
        
        const userDoc = window.firebaseFirestore.doc(db, 'users', user.uid);
        const docSnap = await window.firebaseFirestore.getDoc(userDoc);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            transactions = data.transactions || [];
            updateDisplay();
            console.log('Данные пользователя загружены из Firebase');
        } else {
            // Если документа нет, создаем его с текущими данными
            console.log('Документ пользователя не найден, создаем новый');
            await saveDataToFirebase();
        }
        
        // Настраиваем слушателя для синхронизации в реальном времени
        window.firebaseFirestore.onSnapshot(userDoc, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const serverTransactions = data.transactions || [];
                
                // Обновляем только если данные действительно изменились
                if (JSON.stringify(serverTransactions) !== JSON.stringify(transactions)) {
                    transactions = serverTransactions;
                    updateDisplay();
                    console.log('Данные синхронизированы в реальном времени');
                }
            }
        });
        
        updateSyncIndicator('online');
        
    } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
        updateSyncIndicator('offline');
    }
}

// Сохранение данных в Firestore
async function saveDataToFirebase() {
    if (!db || !window.firebaseFirestore || !currentUser || !isOnline) {
        return false;
    }
    
    try {
        updateSyncIndicator('syncing');
        
        const userDoc = window.firebaseFirestore.doc(db, 'users', currentUser.uid);
        await window.firebaseFirestore.setDoc(userDoc, {
            transactions: transactions,
            lastUpdated: new Date().toISOString(),
            userInfo: {
                name: currentUser.displayName,
                email: currentUser.email,
                photoURL: currentUser.photoURL
            }
        });
        
        updateSyncIndicator('online');
        console.log('Данные сохранены в Firebase');
        return true;
        
    } catch (error) {
        console.error('Ошибка сохранения в Firebase:', error);
        updateSyncIndicator('offline');
        return false;
    }
}

// Синхронизация данных при восстановлении соединения
async function syncDataAfterReconnect() {
    if (!db || !window.firebaseFirestore || !currentUser || !isOnline) return;
    
    try {
        console.log('Начинаем синхронизацию после восстановления соединения...');
        
        // Получаем локальные данные
        const localData = localStorage.getItem('financeTransactions');
        const localTransactions = localData ? JSON.parse(localData) : [];
        
        // Получаем данные с сервера
        const userDoc = window.firebaseFirestore.doc(db, 'users', currentUser.uid);
        const docSnap = await window.firebaseFirestore.getDoc(userDoc);
        
        if (docSnap.exists()) {
            const serverData = docSnap.data();
            const serverTransactions = serverData.transactions || [];
            
            // Простое слияние: используем данные с большим количеством транзакций
            // В реальном приложении здесь была бы более сложная логика слияния
            if (localTransactions.length >= serverTransactions.length) {
                transactions = localTransactions;
                await saveDataToFirebase();
                console.log('Загружены локальные данные в Firebase');
            } else {
                transactions = serverTransactions;
                updateDisplay();
                console.log('Загружены данные с Firebase');
            }
        } else {
            // Сервер пустой, загружаем локальные данные
            transactions = localTransactions;
            await saveDataToFirebase();
            console.log('Созданы новые данные в Firebase');
        }
        
    } catch (error) {
        console.error('Ошибка синхронизации:', error);
    }
}
