// Firebase 설정 파일
// 이 파일은 Firebase Console에서 받은 설정 정보로 업데이트해야 합니다

const firebaseConfig = {
    apiKey: "AIzaSyCrJpigqAQdtg0Qw84QEY8j9aRPdijBYAo",
    authDomain: "cupback-app.firebaseapp.com",
    projectId: "cupback-app",
    storageBucket: "cupback-app.firebasestorage.app",
    messagingSenderId: "444527098865",
    appId: "1:444527098865:web:123554cb0a4d97ca9ae250",
    measurementId: "G-WG7D2MQ34R"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// Firestore 데이터베이스 참조
const db = firebase.firestore();

// 실시간 리스너 설정
function setupRealtimeListeners() {
    // 사용자 데이터 실시간 업데이트
    db.collection('users').onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
                console.log('사용자 데이터 업데이트:', change.doc.data());
            }
        });
    });

    // 스캔 데이터 실시간 업데이트
    db.collection('scans').onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
                console.log('스캔 데이터 업데이트:', change.doc.data());
            }
        });
    });

    // 게시글 데이터 실시간 업데이트
    db.collection('posts').onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
                console.log('게시글 데이터 업데이트:', change.doc.data());
            }
        });
    });
}

// Firebase 설정이 완료되면 이 함수를 호출하세요
function initializeFirebase() {
    setupRealtimeListeners();
    console.log('Firebase 초기화 완료!');
}

// 설정 확인 함수
function checkFirebaseConfig() {
    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
        console.error('❌ Firebase 설정이 완료되지 않았습니다!');
        console.log('firebase-config.js 파일을 업데이트하세요.');
        return false;
    }
    console.log('✅ Firebase 설정 완료!');
    return true;
}
