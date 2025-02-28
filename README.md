# AWS Lambda를 활용한 이미지 리사이징 서비스 구현
- S3 버킷은 생성하였다고 가정하고 아래 단계 진행합니다.

------

## 1. 프로젝트 설정 (AWS-Upload 폴더)
- 먼저 로컬 환경에서 다음과 같이 설정합니다.

### 1) aws-upload 폴더를 만든 후 package.json을 작성

### 2) 람다가 실행할 index.js 작성

------

## 2. Lightsail에서 빌드 및 S3로 배포
### 왜 Lightsail에서 빌드해야 하나요?
- Sharp 라이브러리는 OS별로 다른 바이너리를 사용합니다.
- Lambda는 Amazon Linux 환경에서 실행되므로, Linux 환경에서 빌드해야 호환성이 보장됩니다.

### Lightsail 인스턴스 접속 및 패키지 준비

------

## 3. Lambda 함수 설정

### 1) 함수 생성
- AWS Lambda 콘솔에서 함수 생성 클릭
- 함수 이름 입력 (예: image-resize)
- 런타임: Node.js 22.x 선택
- 아키텍처: x86_64 선택
- 함수 생성 버튼 클릭

### 2) S3에 업로드된 코드 배포
- 함수 페이지에서 코드 소스 섹션 확인
- 업로드 방법: Amazon S3 위치 선택
- S3 링크 입력: https://your-bucket-name.s3.ap-northeast-2.amazonaws.com/aws-upload.zip
- 저장 클릭
- 핸들러 설정을 index.handler로 지정 (index.js 파일의 handler 함수를 호출)

### 3) 트리거 설정
- 트리거 추가 클릭
- 트리거 구성에서 S3 선택
- 버킷: 이미지를 업로드할 S3 버킷 선택
- 이벤트 유형: 모든 객체 생성 이벤트 선택
- 접두사: original/ (original 폴더의 파일만 트리거)
- 확인 클릭

### 4) 권한 확인
- Lambda 함수가 S3에 접근할 수 있는 권한이 있는지 확인:
    - 함수 페이지에서 구성 탭 선택
    - 권한 섹션에서 실행 역할 클릭
    - 다음 정책이 연결되어 있는지 확인:
        - AmazonS3FullAccess 또는 적절한 S3 접근 권한

### 5) 환경 변수 (필요한 경우)
- 구성 탭 → 환경 변수 섹션
- 필요한 환경 변수 추가 (예: 리사이징 사이즈, 품질 설정 등)

------

## 4. NodeBird 프로젝트 수정 (이미지 URL 변환)

------

## 5. 전체 프로세스 요약 및 테스트