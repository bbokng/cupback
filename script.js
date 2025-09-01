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
                .get();

            if (userSnapshot.empty) {
                this.showToast('존재하지 않는 아이디입니다.', 'error');
                return false;
            }

            const userData = userSnapshot.docs[0].data();
            
            // 비밀번호 확인
            if (userData.password !== password) {
                this.showToast('비밀번호가 틀렸습니다.', 'error');
                return false;
            }

            // Firebase Auth로 로그인 (이메일/비밀번호 방식)
            await this.auth.signInWithEmailAndPassword(userData.email || username + '@cupback.com', password);
            this.showToast('로그인에 성공했습니다!', 'success');
            return true;
        } catch (error) {
            console.error('로그인 오류:', error);
            
            // Firebase Auth 오류 처리
            if (error.code === 'auth/user-not-found') {
                this.showToast('존재하지 않는 아이디입니다.', 'error');
            } else if (error.code === 'auth/wrong-password') {
                this.showToast('비밀번호가 틀렸습니다.', 'error');
            } else if (error.code === 'auth/too-many-requests') {
                this.showToast('로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.', 'error');
            } else {
                this.showToast('로그인 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
            }
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
            // 아이디 중복 확인
            const existingUsername = await this.db.collection('users')
                .where('username', '==', userData.username)
                .get();

            if (!existingUsername.empty) {
                this.showToast('이미 존재하는 아이디입니다. 다른 아이디를 사용해주세요.', 'error');
                return false;
            }

            // 닉네임 중복 확인
            const existingNickname = await this.db.collection('users')
                .where('nickname', '==', userData.nickname)
                .get();

            if (!existingNickname.empty) {
                this.showToast('이미 존재하는 닉네임입니다. 다른 닉네임을 사용해주세요.', 'error');
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
            
            this.showToast('회원가입이 완료되었습니다!', 'success');
            window.location.href = 'signup-success.html';
            return true;
        } catch (error) {
            console.error('회원가입 오류:', error);
            
            // Firebase Auth 오류 처리
            if (error.code === 'auth/email-already-in-use') {
                this.showToast('이미 존재하는 아이디입니다. 다른 아이디를 사용해주세요.', 'error');
            } else if (error.code === 'auth/weak-password') {
                this.showToast('비밀번호가 너무 약합니다. 더 강한 비밀번호를 사용해주세요.', 'error');
            } else if (error.code === 'auth/invalid-email') {
                this.showToast('유효하지 않은 이메일 형식입니다.', 'error');
            } else {
                this.showToast('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
            }
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

    // QR 스캔 페이지 초기화
    initScanPage() {
        const startQrBtn = document.getElementById('startQrBtn');
        const qrReader = document.getElementById('qrReader');
        const scanForm = document.getElementById('scanForm');
        
        if (startQrBtn) {
            startQrBtn.addEventListener('click', () => {
                this.startQrScanner();
            });
        }
        
        if (scanForm) {
            scanForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const code = document.getElementById('scanCode').value;
                if (code) {
                    await this.handleScanCode(code);
                }
            });
        }
        
        // 오늘 통계 업데이트
        this.updateStats();
    }

    // QR 스캐너 시작
    async startQrScanner() {
        const startQrBtn = document.getElementById('startQrBtn');
        const qrReader = document.getElementById('qrReader');
        
        if (!qrReader) return;
        
        try {
            // HTML5-QRCode 라이브러리 로드 확인
            if (typeof Html5Qrcode === 'undefined') {
                this.showToast('QR 스캔 라이브러리를 로드할 수 없습니다.', 'error');
                return;
            }
            
            startQrBtn.textContent = '🔄 스캔 중...';
            startQrBtn.disabled = true;
            
            const html5QrCode = new Html5Qrcode("qrReader");
            
            // 카메라 설정 (후면 카메라 우선)
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };
            
            // 사용 가능한 카메라 목록 가져오기
            const devices = await Html5Qrcode.getCameras();
            let selectedCamera = null;
            
            // 후면 카메라 찾기
            for (const device of devices) {
                if (device.label.toLowerCase().includes('back') || 
                    device.label.toLowerCase().includes('rear') ||
                    device.label.toLowerCase().includes('후면')) {
                    selectedCamera = device.id;
                    break;
                }
            }
            
            // 후면 카메라가 없으면 첫 번째 카메라 사용
            if (!selectedCamera && devices.length > 0) {
                selectedCamera = devices[0].id;
            }
            
            if (!selectedCamera) {
                this.showToast('카메라를 찾을 수 없습니다.', 'error');
                startQrBtn.textContent = '📷 카메라로 스캔';
                startQrBtn.disabled = false;
                return;
            }
            
            // QR 스캐너 시작
            await html5QrCode.start(
                selectedCamera,
                config,
                (decodedText) => {
                    this.handleScanCode(decodedText);
                    html5QrCode.stop();
                },
                (errorMessage) => {
                    // 스캔 오류는 무시 (정상적인 동작)
                }
            );
            
            qrReader.style.display = 'block';
            this.showToast('QR 스캐너가 시작되었습니다.', 'success');
            
        } catch (error) {
            console.error('QR 스캐너 시작 오류:', error);
            this.showToast('QR 스캐너를 시작할 수 없습니다: ' + error.message, 'error');
            startQrBtn.textContent = '📷 카메라로 스캔';
            startQrBtn.disabled = false;
        }
    }

    // QR 스캔 코드 처리
    async handleScanCode(code) {
        console.log('스캔된 QR 코드:', code);
        
        // QR 코드 정리 (공백 제거, 대문자 변환, 줄바꿈 제거)
        const cleanCode = code.trim().toUpperCase().replace(/[\r\n]/g, '');
        console.log('정리된 QR 코드:', cleanCode);
        
        // 유효한 QR 코드 확인
        const VALID_CODES = ['CUPBACK-2025', 'CUPBACK', 'WLFANS'];
        
        let isValid = false;
        for (const validCode of VALID_CODES) {
            if (cleanCode.includes(validCode) || cleanCode === validCode) {
                isValid = true;
                break;
            }
        }
        
        if (!isValid) {
            this.showToast('유효하지 않은 QR 코드입니다: ' + cleanCode, 'error');
            return false;
        }
        
        // 스캔 성공 처리
        const success = await this.addScan(cleanCode);
        if (success) {
            // QR 스캐너 정리
            const qrReader = document.getElementById('qrReader');
            const startQrBtn = document.getElementById('startQrBtn');
            
            if (qrReader) {
                qrReader.style.display = 'none';
                qrReader.innerHTML = '';
            }
            
            if (startQrBtn) {
                startQrBtn.textContent = '📷 카메라로 스캔';
                startQrBtn.disabled = false;
            }
        }
        
        return success;
    }

    // 대시보드 페이지 초기화
    initDashboardPage() {
        this.updateStats();
    }

    // 게시판 페이지 초기화
    initBoardPage() {
        this.loadPosts();
    }

    // 랭킹 페이지 초기화
    initRankingPage() {
        this.loadRankings();
    }

    // 로그인 페이지 초기화
    initLoginPage() {
        // 로그인 페이지는 별도 스크립트에서 처리
    }

    // 게시글 로드
    async loadPosts() {
        try {
            const posts = await this.getPosts();
            const postsContainer = document.getElementById('postsContainer');
            
            if (!postsContainer) return;
            
            if (posts.length === 0) {
                postsContainer.innerHTML = '<p class="no-posts">아직 게시글이 없습니다.</p>';
                return;
            }
            
            postsContainer.innerHTML = posts.map(post => `
                <div class="post-card">
                    <div class="post-header">
                        <span class="post-writer">${post.writer || '익명'}</span>
                        <span class="post-date">${post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString() : '방금 전'}</span>
                    </div>
                    <h3 class="post-title">${post.title}</h3>
                    <p class="post-content">${post.content}</p>
                    ${post.image ? `<img src="${post.image}" alt="게시글 이미지" class="post-image">` : ''}
                    <div class="post-actions">
                        <button onclick="window.cupBackApp.toggleLike('${post.id}')" class="like-btn ${post.likes && post.likes.includes(window.cupBackApp.currentUser?.uid) ? 'liked' : ''}">
                            ❤️ ${post.likes ? post.likes.length : 0}
                        </button>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('게시글 로드 오류:', error);
        }
    }

    // 랭킹 로드
    async loadRankings() {
        try {
            const rankings = await this.getRankings();
            const personalRankingEl = document.getElementById('personalRanking');
            const departmentRankingEl = document.getElementById('departmentRanking');
            
            if (personalRankingEl) {
                personalRankingEl.innerHTML = rankings.personalRanking.map((user, index) => `
                    <div class="ranking-item">
                        <div class="ranking-number">${index + 1}</div>
                        <div class="ranking-info">
                            <div class="ranking-name">${user.nickname || user.name || '익명'}</div>
                            <div class="ranking-dept">${user.department}</div>
                        </div>
                        <div class="ranking-stats">
                            <div class="ranking-cups">${user.totalCups}개</div>
                            <div class="ranking-co2">${user.totalCO2}g</div>
                        </div>
                    </div>
                `).join('');
            }
            
            if (departmentRankingEl) {
                departmentRankingEl.innerHTML = rankings.departmentRanking.map((dept, index) => `
                    <div class="ranking-item">
                        <div class="ranking-number">${index + 1}</div>
                        <div class="ranking-info">
                            <div class="ranking-name">${dept.department}</div>
                            <div class="ranking-users">${dept.totalUsers}명 참여</div>
                        </div>
                        <div class="ranking-stats">
                            <div class="ranking-cups">${dept.totalCups}개</div>
                            <div class="ranking-co2">${dept.totalCO2}g</div>
                        </div>
                    </div>
                `).join('');
            }
            
        } catch (error) {
            console.error('랭킹 로드 오류:', error);
        }
    }
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
