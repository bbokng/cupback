# 🔥 Firebase 설정 가이드 - CupBack 앱

## 📋 목차
1. [Firebase 프로젝트 생성](#1-firebase-프로젝트-생성)
2. [웹 앱 등록](#2-웹-앱-등록)
3. [Firestore 데이터베이스 설정](#3-firestore-데이터베이스-설정)
4. [코드 수정](#4-코드-수정)
5. [배포](#5-배포)

---

## 1. Firebase 프로젝트 생성

### 1-1. Firebase Console 접속
- [Firebase Console](https://console.firebase.google.com/)에 접속
- Google 계정으로 로그인

### 1-2. 프로젝트 생성
1. **"프로젝트 추가"** 클릭
2. **프로젝트 이름**: `cupback-app` 입력
3. **Google Analytics**: 비활성화 (선택사항)
4. **"프로젝트 만들기"** 클릭
5. 생성 완료까지 대기 (1-2분 소요)

---

## 2. 웹 앱 등록

### 2-1. 웹 앱 추가
1. Firebase Console에서 **"웹 앱 추가"** 클릭
2. **앱 닉네임**: `cupback-web` 입력
3. **"앱 등록"** 클릭

### 2-2. 설정 정보 복사
등록 후 나타나는 설정 코드를 복사하세요:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",           // 실제 값으로 변경
  authDomain: "cupback-app.firebaseapp.com",
  projectId: "cupback-app",
  storageBucket: "cupback-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## 3. Firestore 데이터베이스 설정

### 3-1. 데이터베이스 생성
1. 왼쪽 메뉴에서 **"Firestore Database"** 클릭
2. **"데이터베이스 만들기"** 클릭
3. **보안 규칙**: "테스트 모드에서 시작" 선택
4. **위치**: `asia-northeast3 (서울)` 선택
5. **"완료"** 클릭

### 3-2. 보안 규칙 설정 (선택사항)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // 테스트용 (나중에 수정 필요)
    }
  }
}
```

---

## 4. 코드 수정

### 4-1. Firebase SDK 추가
모든 HTML 파일의 `<head>` 섹션에 다음 코드를 추가:

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-firestore.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-auth.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-storage.js"></script>
```

### 4-2. 설정 파일 업데이트
`firebase-config.js` 파일을 열고 복사한 설정 정보로 업데이트:

```javascript
const firebaseConfig = {
  apiKey: "여기에_실제_API_KEY_입력",
  authDomain: "여기에_실제_AUTH_DOMAIN_입력",
  projectId: "여기에_실제_PROJECT_ID_입력",
  storageBucket: "여기에_실제_STORAGE_BUCKET_입력",
  messagingSenderId: "여기에_실제_MESSAGING_SENDER_ID_입력",
  appId: "여기에_실제_APP_ID_입력"
};
```

### 4-3. 스크립트 파일 교체
1. 기존 `script.js`를 백업
2. `script-firebase.js`를 `script.js`로 이름 변경
3. 모든 HTML 파일에서 Firebase 설정 파일 로드 추가:

```html
<script src="firebase-config.js"></script>
<script src="script.js"></script>
```

---

## 5. 배포

### 5-1. 로컬 테스트
1. 웹사이트 새로고침
2. 개발자 도구 (F12)에서 콘솔 확인
3. "Firebase 초기화 완료!" 메시지 확인

### 5-2. 온라인 배포
- **Vercel**: `vercel --prod` 명령어로 배포
- **Netlify**: 파일을 드래그 앤 드롭으로 배포
- **GitHub Pages**: GitHub 저장소에 푸시

---

## ✅ 완료 후 확인사항

### 데이터 동기화 확인
1. **다른 기기에서 접속**
2. **회원가입 후 로그인**
3. **컵 스캔 또는 게시글 작성**
4. **다른 기기에서 데이터 확인**

### 실시간 업데이트 확인
- 한 기기에서 데이터 변경 시
- 다른 기기에서 자동으로 업데이트되는지 확인

---

## 🚨 주의사항

### 보안
- 현재는 테스트 모드로 설정되어 모든 사용자가 데이터를 읽고 쓸 수 있음
- 실제 서비스에서는 적절한 보안 규칙 설정 필요

### 비용
- Firebase 무료 플랜: 월 1GB 저장, 50,000 읽기/쓰기
- 대부분의 소규모 프로젝트에서는 충분함

### 백업
- 중요한 데이터는 정기적으로 백업 권장
- Firebase Console에서 데이터 내보내기 가능

---

## 🔧 문제 해결

### "Firebase SDK가 로드되지 않았습니다"
- 인터넷 연결 확인
- Firebase SDK 스크립트 태그 확인
- 브라우저 캐시 삭제

### "Firebase 설정이 완료되지 않았습니다"
- `firebase-config.js` 파일의 설정 정보 확인
- Firebase Console에서 설정 정보 재확인

### 데이터가 동기화되지 않음
- Firestore 데이터베이스 생성 확인
- 보안 규칙 확인
- 네트워크 연결 확인

---

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. 브라우저 콘솔의 오류 메시지
2. Firebase Console의 로그
3. 네트워크 연결 상태

**Firebase 설정이 완료되면 모든 기기에서 데이터가 실시간으로 동기화됩니다! 🎉**
