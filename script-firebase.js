// Firebase 기반 CupBack 앱
class CupBackAppFirebase {
    constructor() {
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Firebase 설정 확인
        if (!checkFirebaseConfig()) {
            this.showToast('Firebase 설정이 필요합니다. firebase-config.js를 확인하세요.', 'error');
            return;
        }

        // 인증 상태 리스너
        this.auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            this.updateNavigation();
            this.updateStats();
        });

        // 실시간 데이터 리스너 설정
        this.setupRealtimeListeners();
    }

    setupRealtimeListeners() {
        // 통계 실시간 업데이트
        this.db.collection('scans').onSnapshot(() => {
            this.updateStats();
        });

        // 게시글 실시간 업데이트
        this.db.collection('posts').onSnapshot(() => {
            this.loadPosts();
        });

        // 랭킹 실시간 업데이트
        this.db.collection('users').onSnapshot(() => {
            this.loadRankings();
        });
    }

    // 사용자 인증
    async login(username, password) {
        try {
            // Firestore에서 사용자 찾기
            const userSnapshot = await this.db.collection('users')
                .where('username', '==', username)
                .where('password', '==', password)
                .get();

            if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data();
                // Firebase Auth로 로그인 (이메일/비밀번호 방식)
                await this.auth.signInWithEmailAndPassword(userData.email || username + '@cupback.com', password);
                this.showToast('로그인에 성공했습니다!', 'success');
                return true;
            } else {
                this.showToast('아이디와 비밀번호가 틀렸습니다.', 'error');
                return false;
            }
        } catch (error) {
            console.error('로그인 오류:', error);
            this.showToast('로그인 중 오류가 발생했습니다.', 'error');
            return false;
        }
    }

    async logout() {
        try {
            await this.auth.signOut();
            this.showToast('로그아웃되었습니다.', 'success');
        } catch (error) {
            console.error('로그아웃 오류:', error);
        }
    }

    async register(userData) {
        try {
            // 중복 사용자 확인
            const existingUser = await this.db.collection('users')
                .where('username', '==', userData.username)
                .get();

            if (!existingUser.empty) {
                this.showToast('이미 존재하는 아이디입니다.', 'error');
                return false;
            }

            // 새 사용자 생성
            const newUser = {
                id: Date.now().toString(),
                email: userData.username + '@cupback.com', // 임시 이메일
                ...userData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await this.db.collection('users').doc(newUser.id).set(newUser);
            
            // Firebase Auth 계정 생성
            await this.auth.createUserWithEmailAndPassword(newUser.email, userData.password);
            
            window.location.href = 'signup-success.html';
            return true;
        } catch (error) {
            console.error('회원가입 오류:', error);
            this.showToast('회원가입 중 오류가 발생했습니다.', 'error');
            return false;
        }
    }

    // 스캔 기능
    async addScan(code) {
        if (!this.currentUser) {
            this.showToast('로그인이 필요합니다.', 'error');
            return false;
        }

        try {
            const today = new Date().toISOString().split('T')[0];
            
            // 오늘 이미 스캔했는지 확인
            const existingScan = await this.db.collection('scans')
                .where('userId', '==', this.currentUser.uid)
                .where('date', '==', today)
                .get();

            if (!existingScan.empty) {
                this.showToast('오늘은 이미 적립되었습니다. 내일 다시 시도해 주세요.', 'warning');
                return false;
            }

            // 새 스캔 추가
            const newScan = {
                userId: this.currentUser.uid,
                date: today,
                code: code,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await this.db.collection('scans').add(newScan);
            this.showToast('하나의 컵이 자연으로 돌아갔어요!', 'success');
            return true;
        } catch (error) {
            console.error('스캔 추가 오류:', error);
            this.showToast('스캔 기록 중 오류가 발생했습니다.', 'error');
            return false;
        }
    }

    // 통계
    async getStats() {
        try {
            const scansSnapshot = await this.db.collection('scans').get();
            const usersSnapshot = await this.db.collection('users').get();
            
            const today = new Date().toISOString().split('T')[0];
            const scans = scansSnapshot.docs.map(doc => doc.data());
            const users = usersSnapshot.docs.map(doc => doc.data());
            
            const totalCups = scans.length;
            const todayCups = scans.filter(scan => scan.date === today).length;
            const totalUsers = users.length;
            const totalCO2 = totalCups * 30;
            
            return { totalCups, todayCups, totalUsers, totalCO2 };
        } catch (error) {
            console.error('통계 조회 오류:', error);
            return { totalCups: 0, todayCups: 0, totalUsers: 0, totalCO2: 0 };
        }
    }

    async getUserStats(userId) {
        try {
            const scansSnapshot = await this.db.collection('scans')
                .where('userId', '==', userId)
                .get();
            
            const today = new Date().toISOString().split('T')[0];
            const scans = scansSnapshot.docs.map(doc => doc.data());
            
            const totalCups = scans.length;
            const todayCups = scans.filter(scan => scan.date === today).length;
            const totalCO2 = totalCups * 30;
            
            return { totalCups, todayCups, totalCO2 };
        } catch (error) {
            console.error('사용자 통계 조회 오류:', error);
            return { totalCups: 0, todayCups: 0, totalCO2: 0 };
        }
    }

    // 게시판
    async addPostWithImage(title, content, file) {
        if (!this.currentUser) {
            this.showToast('로그인이 필요합니다.', 'error');
            return false;
        }

        try {
            let imageUrl = null;
            
            // 이미지 업로드
            if (file) {
                const storageRef = firebase.storage().ref();
                const imageRef = storageRef.child(`posts/${Date.now()}_${file.name}`);
                const snapshot = await imageRef.put(file);
                imageUrl = await snapshot.ref.getDownloadURL();
            }

            // 사용자 정보 가져오기
            const userSnapshot = await this.db.collection('users')
                .doc(this.currentUser.uid)
                .get();
            const userData = userSnapshot.data();

            const newPost = {
                title,
                content,
                image: imageUrl,
                writer: userData.nickname || userData.name,
                writerId: this.currentUser.uid,
                likes: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await this.db.collection('posts').add(newPost);
            this.showToast('게시글이 등록되었습니다.', 'success');
            return true;
        } catch (error) {
            console.error('게시글 작성 오류:', error);
            this.showToast('게시글 작성 중 오류가 발생했습니다.', 'error');
            return false;
        }
    }

    async getPosts() {
        try {
            const postsSnapshot = await this.db.collection('posts')
                .orderBy('createdAt', 'desc')
                .get();
            
            return postsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('게시글 조회 오류:', error);
            return [];
        }
    }

    async toggleLike(postId) {
        if (!this.currentUser) {
            this.showToast('로그인이 필요합니다.', 'error');
            return;
        }

        try {
            const postRef = this.db.collection('posts').doc(postId);
            const postDoc = await postRef.get();
            const postData = postDoc.data();
            
            const likes = postData.likes || [];
            const userIndex = likes.indexOf(this.currentUser.uid);
            
            if (userIndex >= 0) {
                likes.splice(userIndex, 1);
            } else {
                likes.push(this.currentUser.uid);
            }
            
            await postRef.update({ likes });
        } catch (error) {
            console.error('좋아요 토글 오류:', error);
            this.showToast('좋아요 처리 중 오류가 발생했습니다.', 'error');
        }
    }

    // 랭킹
    async getRankings() {
        try {
            const usersSnapshot = await this.db.collection('users').get();
            const scansSnapshot = await this.db.collection('scans').get();
            
            const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const scans = scansSnapshot.docs.map(doc => doc.data());
            
            // 개인 랭킹
            const personalRanking = users.map(user => {
                const userScans = scans.filter(scan => scan.userId === user.id);
                return { ...user, totalCups: userScans.length, totalCO2: userScans.length * 30 };
            }).sort((a, b) => b.totalCups - a.totalCups);
            
            // 학과 랭킹
            const departmentStats = {};
            users.forEach(user => {
                if (!departmentStats[user.department]) {
                    departmentStats[user.department] = { totalCups: 0, totalUsers: 0 };
                }
                const userScans = scans.filter(scan => scan.userId === user.id);
                departmentStats[user.department].totalCups += userScans.length;
                departmentStats[user.department].totalUsers += 1;
            });
            
            const departmentRanking = Object.entries(departmentStats)
                .map(([dept, stats]) => ({
                    department: dept,
                    totalCups: stats.totalCups,
                    totalUsers: stats.totalUsers,
                    totalCO2: stats.totalCups * 30
                }))
                .sort((a, b) => b.totalCups - a.totalCups);
            
            return { personalRanking, departmentRanking };
        } catch (error) {
            console.error('랭킹 조회 오류:', error);
            return { personalRanking: [], departmentRanking: [] };
        }
    }

    // UI 업데이트 (기존과 동일)
    async updateStats() {
        const stats = await this.getStats();
        const totalCupsEl = document.getElementById('totalCups');
        const totalCO2El = document.getElementById('totalCO2');
        const totalUsersEl = document.getElementById('totalUsers');
        const todayCupsEl = document.getElementById('todayCups');
        
        if (totalCupsEl) totalCupsEl.textContent = stats.totalCups.toLocaleString();
        if (totalCO2El) totalCO2El.textContent = stats.totalCO2.toLocaleString();
        if (totalUsersEl) totalUsersEl.textContent = stats.totalUsers.toLocaleString();
        if (todayCupsEl) todayCupsEl.textContent = stats.todayCups.toLocaleString();
    }

    updateNavigation() {
        const loginBtn = document.getElementById('loginBtn');
        const userInfo = document.getElementById('userInfo');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (this.currentUser) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (userInfo) {
                // 사용자 정보 가져오기
                this.db.collection('users').doc(this.currentUser.uid).get()
                    .then(doc => {
                        if (doc.exists) {
                            const userData = doc.data();
                            userInfo.textContent = `${userData.nickname || userData.name}님`;
                            userInfo.style.display = 'inline-block';
                        }
                    });
            }
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
        } else {
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (userInfo) userInfo.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        setTimeout(() => { toast.classList.remove('show'); }, 3000);
    }

    // 페이지 초기화 (기존과 동일)
    async initPage() {
        const filename = window.location.pathname.split('/').pop();
        switch (filename) {
            case 'index.html':
            case '': await this.updateStats(); break;
            case 'scan.html': this.initScanPage(); break;
            case 'dashboard.html': this.initDashboardPage(); break;
            case 'board.html': this.initBoardPage(); break;
            case 'ranking.html': this.initRankingPage(); break;
            case 'login.html': this.initLoginPage(); break;
            case 'signup-success.html': break;
        }
    }

    // 기존 페이지 초기화 메서드들과 동일 (QR 스캔, 대시보드, 게시판, 랭킹, 로그인)
    // ... (기존 코드와 동일하지만 Firebase 메서드 사용)
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', async () => {
    // Firebase SDK 로드 확인
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK가 로드되지 않았습니다!');
        return;
    }
    
    window.cupBackApp = new CupBackAppFirebase();
    await window.cupBackApp.initPage();
    
    // 로그아웃 버튼 이벤트
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.cupBackApp.logout();
            window.location.href = 'index.html';
        });
    }
    
    // 네비게이션 활성 상태 설정
    const navLinks = document.querySelectorAll('.nav-link');
    const filename = window.location.pathname.split('/').pop();
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === 'index.html' && (filename === 'index.html' || filename === '')) {
            link.classList.add('active');
        } else if (href === filename) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
});
