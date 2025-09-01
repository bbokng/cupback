// 데이터 모델 (localStorage 기반)
class CupBackApp {
    constructor() {
        this.init();
        this.updateStats();
        this.updateNavigation();
    }

    init() {
        if (!localStorage.getItem('users')) localStorage.setItem('users', JSON.stringify([]));
        if (!localStorage.getItem('scans')) localStorage.setItem('scans', JSON.stringify([]));
        if (!localStorage.getItem('posts')) localStorage.setItem('posts', JSON.stringify([]));
        if (!localStorage.getItem('session')) localStorage.setItem('session', JSON.stringify(null));
    }

    // 사용자/세션
    getCurrentUser() {
        const session = JSON.parse(localStorage.getItem('session'));
        if (!session) return null;
        const users = JSON.parse(localStorage.getItem('users'));
        return users.find(user => user.id === session);
    }

    login(username, password) {
        const users = JSON.parse(localStorage.getItem('users'));
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            localStorage.setItem('session', JSON.stringify(user.id));
            this.updateNavigation();
            this.showToast('로그인에 성공했습니다!', 'success');
            return true;
        } else {
            this.showToast('아이디와 비밀번호가 틀렷습니다.', 'error');
            return false;
        }
    }

    logout() {
        localStorage.setItem('session', JSON.stringify(null));
        this.updateNavigation();
        this.showToast('로그아웃되었습니다.', 'success');
    }

    register(userData) {
        const users = JSON.parse(localStorage.getItem('users'));
        if (users.find(u => u.username === userData.username)) {
            this.showToast('이미 존재하는 아이디입니다.', 'error');
            return false;
        }
        const newUser = { id: Date.now().toString(), ...userData };
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        window.location.href = 'signup-success.html';
        return true;
    }

    // 스캔
    addScan(code) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) { this.showToast('로그인이 필요합니다.', 'error'); return false; }
        const today = new Date().toISOString().split('T')[0];
        const scans = JSON.parse(localStorage.getItem('scans'));
        const existingScan = scans.find(scan => scan.userId === currentUser.id && scan.date === today);
        if (existingScan) { this.showToast('오늘은 이미 적립되었습니다. 내일 다시 시도해 주세요.', 'warning'); return false; }
        const newScan = { userId: currentUser.id, date: today, at: Date.now(), code };
        scans.push(newScan);
        localStorage.setItem('scans', JSON.stringify(scans));
        this.showToast('하나의 컵이 자연으로 돌아갔어요!', 'success');
        this.updateStats();
        return true;
    }

    // 통계
    getStats() {
        const users = JSON.parse(localStorage.getItem('users'));
        const scans = JSON.parse(localStorage.getItem('scans'));
        const today = new Date().toISOString().split('T')[0];
        const totalCups = scans.length;
        const todayCups = scans.filter(scan => scan.date === today).length;
        const totalUsers = users.length;
        const totalCO2 = totalCups * 30;
        return { totalCups, todayCups, totalUsers, totalCO2 };
    }

    getUserStats(userId) {
        const scans = JSON.parse(localStorage.getItem('scans'));
        const today = new Date().toISOString().split('T')[0];
        const userScans = scans.filter(scan => scan.userId === userId);
        const totalCups = userScans.length;
        const todayCups = userScans.filter(scan => scan.date === today).length;
        const totalCO2 = totalCups * 30;
        return { totalCups, todayCups, totalCO2 };
    }

    // 게시판
    async addPostWithImage(title, content, file) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) { this.showToast('로그인이 필요합니다.', 'error'); return false; }
        const posts = JSON.parse(localStorage.getItem('posts'));

        let imageDataUrl = null;
        if (file) {
            imageDataUrl = await this.readFileAsDataURL(file);
        }

        const newPost = {
            id: Date.now().toString(),
            title,
            content,
            image: imageDataUrl, // base64 data URL or null
            writer: currentUser.nickname || currentUser.name,
            writerId: currentUser.id,
            likes: [], // userId 배열
            at: Date.now()
        };
        posts.unshift(newPost);
        localStorage.setItem('posts', JSON.stringify(posts));
        this.showToast('게시글이 등록되었습니다.', 'success');
        return true;
    }

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    getPosts() { return JSON.parse(localStorage.getItem('posts')); }

    toggleLike(postId) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) { this.showToast('로그인이 필요합니다.', 'error'); return; }
        const posts = JSON.parse(localStorage.getItem('posts'));
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        const idx = post.likes.indexOf(currentUser.id);
        if (idx >= 0) {
            post.likes.splice(idx, 1);
        } else {
            post.likes.push(currentUser.id);
        }
        localStorage.setItem('posts', JSON.stringify(posts));
        this.loadPosts();
    }

    // UI
    updateStats() {
        const stats = this.getStats();
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
        const currentUser = this.getCurrentUser();
        const loginBtn = document.getElementById('loginBtn');
        const userInfo = document.getElementById('userInfo');
        const logoutBtn = document.getElementById('logoutBtn');
        if (currentUser) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (userInfo) { userInfo.textContent = `${currentUser.nickname || currentUser.name}님`; userInfo.style.display = 'inline-block'; }
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

    // 페이지 초기화
    initPage() {
        const filename = window.location.pathname.split('/').pop();
        switch (filename) {
            case 'index.html':
            case '': this.updateStats(); break;
            case 'scan.html': this.initScanPage(); break;
            case 'dashboard.html': this.initDashboardPage(); break;
            case 'board.html': this.initBoardPage(); break;
            case 'ranking.html': this.initRankingPage(); break;
            case 'login.html': this.initLoginPage(); break;
            case 'signup-success.html': break;
        }
    }

    initScanPage() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) { window.location.href = 'login.html'; return; }
        const scanForm = document.getElementById('scanForm');
        if (scanForm) {
            scanForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const code = document.getElementById('scanCode').value.trim();
                if (code) {
                    this.handleScanCode(code);
                }
            });
        }
        const startQrBtn = document.getElementById('startQrBtn');
        const qrReaderDiv = document.getElementById('qrReader');
        if (startQrBtn && qrReaderDiv && window.Html5Qrcode) {
            startQrBtn.addEventListener('click', async () => {
                qrReaderDiv.style.display = 'block';
                startQrBtn.style.display = 'none';
                const html5QrCode = new Html5Qrcode('qrReader');
                try {
                    const cameras = await Html5Qrcode.getCameras();
                    if (!cameras || cameras.length === 0) { 
                        this.showToast('카메라를 찾을 수 없습니다.', 'error'); 
                        qrReaderDiv.style.display = 'none';
                        startQrBtn.style.display = 'inline-flex';
                        return; 
                    }
                    
                    // 후면 카메라 우선 선택 (back, rear, environment 등이 포함된 카메라)
                    let cameraId = cameras[0].id;
                    for (let camera of cameras) {
                        if (camera.label.toLowerCase().includes('back') || 
                            camera.label.toLowerCase().includes('rear') || 
                            camera.label.toLowerCase().includes('environment') ||
                            camera.label.toLowerCase().includes('후면') ||
                            camera.label.toLowerCase().includes('뒷면')) {
                            cameraId = camera.id;
                            break;
                        }
                    }
                    
                    await html5QrCode.start(
                        cameraId,
                        { 
                            fps: 10, 
                            qrbox: { width: 250, height: 250 },
                            aspectRatio: 1.0
                        },
                        (decodedText) => {
                            this.handleScanCode(decodedText);
                            html5QrCode.stop();
                            qrReaderDiv.style.display = 'none';
                            startQrBtn.style.display = 'inline-flex';
                        },
                        (errorMessage) => {
                            // QR 코드 인식 실패 시 무시 (계속 스캔)
                        }
                    );
                } catch (err) {
                    this.showToast('카메라 접근 실패: HTTPS 환경과 권한을 확인하세요.', 'error');
                    qrReaderDiv.style.display = 'none';
                    startQrBtn.style.display = 'inline-flex';
                }
            });
        }
    }

    handleScanCode(code) {
        const VALID_CODES = ['WLFANS'];
        
        // QR 코드 내용 정리 (공백 제거, 대소문자 구분 없이)
        const cleanCode = code.trim().toUpperCase();
        
        if (VALID_CODES.includes(cleanCode)) {
            const ok = this.addScan(cleanCode);
            if (ok) {
                document.getElementById('scanCode').value = '';
                this.showToast('컵 회수가 성공적으로 기록되었습니다! 🌱', 'success');
            }
        } else {
            this.showToast(`유효하지 않은 QR 코드입니다. (인식된 코드: ${code})`, 'error');
        }
    }

    initDashboardPage() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) { window.location.href = 'login.html'; return; }
        this.updateDashboardStats(currentUser);
    }

    updateDashboardStats(user) {
        const userStats = this.getUserStats(user.id);
        const totalStats = this.getStats();
        const userTotalEl = document.getElementById('userTotal');
        const userTodayEl = document.getElementById('userToday');
        const userCO2El = document.getElementById('userCO2');
        if (userTotalEl) userTotalEl.textContent = userStats.totalCups;
        if (userTodayEl) userTodayEl.textContent = userStats.todayCups;
        if (userCO2El) userCO2El.textContent = userStats.totalCO2;
        const totalCupsEl = document.getElementById('totalCups');
        const totalCO2El = document.getElementById('totalCO2');
        if (totalCupsEl) totalCupsEl.textContent = totalStats.totalCups;
        if (totalCO2El) totalCO2El.textContent = totalStats.totalCO2;
        const progressPercentage = totalStats.totalCups > 0 ? (userStats.totalCups / totalStats.totalCups * 100).toFixed(1) : 0;
        const progressEl = document.getElementById('progressPercentage');
        if (progressEl) progressEl.textContent = progressPercentage;
    }

    initBoardPage() {
        this.loadPosts();
        const postForm = document.getElementById('postForm');
        if (postForm) {
            postForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const title = document.getElementById('postTitle').value.trim();
                const content = document.getElementById('postContent').value.trim();
                const imageInput = document.getElementById('postImage');
                const file = imageInput && imageInput.files && imageInput.files[0] ? imageInput.files[0] : null;
                if (title && content) {
                    await this.addPostWithImage(title, content, file);
                    this.loadPosts();
                    document.getElementById('postTitle').value = '';
                    document.getElementById('postContent').value = '';
                    if (imageInput) imageInput.value = '';
                }
            });
        }
    }

    loadPosts() {
        const posts = this.getPosts();
        const postsContainer = document.getElementById('postsContainer');
        if (!postsContainer) return;
        if (!posts || posts.length === 0) {
            postsContainer.innerHTML = `
                <div class="posts-empty">
                    <div class="empty-icon">📝</div>
                    <p>아직 게시글이 없습니다.</p>
                    <p>첫 번째 게시글을 작성해보세요!</p>
                </div>`;
            return;
        }
        postsContainer.innerHTML = posts.map(post => `
            <article class="feed-card">
                <header class="feed-header">
                    <div class="feed-writer">${post.writer}</div>
                    <div class="feed-time">${new Date(post.at).toLocaleString()}</div>
                </header>
                ${post.image ? `<div class="feed-image"><img src="${post.image}" alt="post image"></div>` : ''}
                <div class="feed-body">
                    <h3 class="feed-title">${post.title}</h3>
                    <p class="feed-text">${post.content}</p>
                </div>
                <footer class="feed-actions">
                    <button class="like-btn" data-id="${post.id}">❤ ${post.likes ? post.likes.length : 0}</button>
                </footer>
            </article>
        `).join('');
        // 좋아요 버튼 이벤트 바인딩
        postsContainer.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                this.toggleLike(id);
            });
        });
    }

    // 랭킹/로그인 초기화 동일
    initRankingPage() { this.loadRankings(); }

    loadRankings() {
        const rankings = this.getRankings();
        const personalContainer = document.getElementById('personalRanking');
        if (personalContainer) {
            if (rankings.personalRanking.length === 0) {
                personalContainer.innerHTML = `<div class="ranking-empty"><div class="empty-icon">🏆</div><p>아직 랭킹 데이터가 없습니다.</p><p>첫 번째 컵을 회수해보세요!</p></div>`; return;
            }
            personalContainer.innerHTML = rankings.personalRanking.map((user, index) => `
                <div class="ranking-item ${index < 3 ? 'top-' + (index + 1) : ''}">
                    <div class="ranking-rank">${index + 1}</div>
                    <div class="ranking-info">
                        <div class="ranking-name">${user.nickname || user.name}</div>
                        <div class="ranking-dept">${user.department} ${user.year}학년</div>
                    </div>
                    <div class="ranking-stats">
                        <div class="ranking-cups">${user.totalCups}개</div>
                        <div class="ranking-co2">${user.totalCO2}g</div>
                    </div>
                </div>`).join('');
        }
        const departmentContainer = document.getElementById('departmentRanking');
        if (departmentContainer) {
            if (rankings.departmentRanking.length === 0) {
                departmentContainer.innerHTML = `<div class="ranking-empty"><div class="empty-icon">🎓</div><p>아직 학과 랭킹 데이터가 없습니다.</p><p>더 많은 학생들이 참여해보세요!</p></div>`; return;
            }
            departmentContainer.innerHTML = rankings.departmentRanking.map((dept, index) => `
                <div class="ranking-item ${index < 3 ? 'top-' + (index + 1) : ''}">
                    <div class="ranking-rank">${index + 1}</div>
                    <div class="ranking-info">
                        <div class="ranking-name">${dept.department}</div>
                        <div class="ranking-users">${dept.totalUsers}명 참여</div>
                    </div>
                    <div class="ranking-stats">
                        <div class="ranking-cups">${dept.totalCups}개</div>
                        <div class="ranking-co2">${dept.totalCO2}g</div>
                    </div>
                </div>`).join('');
        }
    }

    initLoginPage() {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value.trim();
                if (username && password) {
                    if (this.login(username, password)) {
                        window.location.href = 'index.html';
                    }
                }
            });
        }
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(signupForm);
                const userData = {
                    nickname: formData.get('nickname'),
                    department: formData.get('department'),
                    year: formData.get('year'),
                    username: formData.get('username'),
                    password: formData.get('password')
                };
                if (userData.nickname && userData.department && userData.year && userData.username && userData.password) {
                    this.register(userData);
                } else {
                    this.showToast('모든 필드를 입력해주세요.', 'error');
                }
            });
        }
    }

    // 랭킹 계산 메서드 (기존)
    getRankings() {
        const users = JSON.parse(localStorage.getItem('users'));
        const scans = JSON.parse(localStorage.getItem('scans'));
        const personalRanking = users.map(user => {
            const userScans = scans.filter(scan => scan.userId === user.id);
            return { ...user, totalCups: userScans.length, totalCO2: userScans.length * 30 };
        }).sort((a, b) => b.totalCups - a.totalCups);
        const departmentStats = {};
        users.forEach(user => {
            if (!departmentStats[user.department]) departmentStats[user.department] = { totalCups: 0, totalUsers: 0 };
            const userScans = scans.filter(scan => scan.userId === user.id);
            departmentStats[user.department].totalCups += userScans.length;
            departmentStats[user.department].totalUsers += 1;
        });
        const departmentRanking = Object.entries(departmentStats).map(([dept, stats]) => ({ department: dept, totalCups: stats.totalCups, totalUsers: stats.totalUsers, totalCO2: stats.totalCups * 30 })).sort((a, b) => b.totalCups - a.totalCups);
        return { personalRanking, departmentRanking };
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.cupBackApp = new CupBackApp();
    window.cupBackApp.initPage();
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => { window.cupBackApp.logout(); window.location.href = 'index.html'; });
    }
    const navLinks = document.querySelectorAll('.nav-link');
    const filename = window.location.pathname.split('/').pop();
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === 'index.html' && (filename === 'index.html' || filename === '')) link.classList.add('active');
        else if (href === filename) link.classList.add('active');
        else link.classList.remove('active');
    });
});

function navigateTo(path) { window.history.pushState({}, '', path); window.cupBackApp.initPage(); }
window.addEventListener('popstate', () => { window.cupBackApp.initPage(); });
