# AWS Lambda를 활용한 이미지 리사이징 서비스 구현

- [1. 프로젝트 설정 (AWS-Upload 폴더)](#1-프로젝트-설정-aws-upload-폴더)
- [2. Lightsail에서 빌드 및 S3로 배포](#2-lightsail에서-빌드-및-s3로-배포)
- [3. Lambda 함수 설정](#3-lambda-함수-설정)
- [4. NodeBird 프로젝트 수정 (이미지 URL 변환)](#4-nodebird-프로젝트-수정-이미지-url-변환)

![Image](https://github.com/user-attachments/assets/1aa67334-3fe5-4ba5-bbca-8c55b9868760)
![Image](https://github.com/user-attachments/assets/1f7bb748-26c5-49cd-aa88-dd209016dcc1)

------

## 1. 프로젝트 설정 (AWS-Upload 폴더)
- S3 버킷은 생성하였다고 가정하고 아래 단계 진행
- 먼저 로컬 환경에서 다음과 같이 설정

### 1) aws-upload 폴더를 만든 후 package.json을 작성
<details>
<summary><i>package.json</i></summary>
```
{
  "name": "aws-upload",
  "version": "1.0.0",
  "description": "Lambda 이미지 리사이징",
  "main": "index.js",
  "author": "ZeroCho",
  "license": "ISC",
  "dependencies": {
    "@aws-sdk/client-s3": "^3.169.0",
    "sharp": "^0.30.7"
  }
}
```
</details>

### 2) 람다가 실행할 index.js 작성
<details>
<summary><i>index.js</i></summary>

```
const sharp = require("sharp");
const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client();

exports.handler = async (event, context, callback) => {
  console.log("이벤트:", JSON.stringify(event, null, 2));

  const Bucket = event.Records[0].s3.bucket.name; // nodebird-image-test
  const Key = decodeURIComponent(event.Records[0].s3.object.key); // original/고양이.png
  console.log("버킷:", Bucket);
  console.log("원본 키:", Key);

  const filename = Key.split("/").at(-1);
  const ext = Key.split(".").at(-1).toLowerCase();
  const requiredFormat = ext === "jpg" ? "jpeg" : ext;
  console.log("파일명:", filename, "확장자:", ext);

  // 대상 키를 original/ 에서 thumb/로 변경
  const thumbKey = Key.replace(/^original\//, "thumb/");
  console.log("대상 키:", thumbKey);

  try {
    // S3에서 원본 이미지 가져오기
    const getObject = await s3.send(new GetObjectCommand({ Bucket, Key }));
    const buffers = [];
    for await (const data of getObject.Body) {
      buffers.push(data);
    }
    const imageBuffer = Buffer.concat(buffers);
    console.log("원본 이미지 크기:", imageBuffer.length);

    // 이미지 리사이징
    const resizedImage = await sharp(imageBuffer)
      .resize(200, 200, { fit: "inside" })
      .toFormat(requiredFormat)
      .toBuffer();

    // 리사이징된 이미지를 S3에 업로드
    await s3.send(
      new PutObjectCommand({
        Bucket,
        Key: thumbKey, // thumb/고양이.png
        Body: resizedImage,
        ContentType: `image/${requiredFormat}`,
      })
    );

    console.log("리사이즈된 이미지 크기:", resizedImage.length);
    console.log("썸네일 생성 완료:", thumbKey);

    return callback(null, thumbKey);
  } catch (error) {
    console.error("오류 발생:", error);
    return callback(error);
  }
}
```

</details>

------

## 2. Lightsail에서 빌드 및 S3로 배포
### 왜 Lightsail에서 빌드해야 하나요?
- Sharp 라이브러리는 OS별로 다른 바이너리를 사용
- Lambda는 Amazon Linux 환경에서 실행되므로, Linux 환경에서 빌드해야 호환성이 보장됨

### Lightsail 인스턴스 SSH 접속 및 패키지 준비
#### 1) 깃허브 리포지터리를 clone
```
$ git clone https://github.com/저장소
$ (람다 함수 index.js 코드가 있는 폴더 위치로 이동)
$ npm i
```

#### 2) 폴더 아래의 모든 파일을 압축해 aws-upload.zip 파일 생성
```
$ zip -r aws-upload.zip ./*
$ ls
aws-upload.zip index.js node_modules package.json package-lock.json
```

#### 3) aws-cli를 설치
```
$ curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
$ unzip awscliv2.zip
$ sudo ./aws/install
$ aws configure
AWS Access Key ID [None]: [키 아이디]
AWS Secret Access Key [None]: [시크릿 액세스 키]
Default region name [None]: ap-northeast-2
Default output format [None]: json
```

#### 4) aws-cli를 사용해 aws-upload.zip을 업로드
- 코드를 수정할 때마다 이렇게 zip 파일을 만들어서 S3로 업로드하면 됨
- 만약 zip 파일명이 같으면 덮어 씌워짐
```
$ aws s3 cp "aws-upload.zip" s3://버킷명
```

<details>
<summary><i>SSH 화면 내용</i></summary>

![Image](https://github.com/user-attachments/assets/21deffb5-84d5-4626-9d93-68178a2e5209)

![Image](https://github.com/user-attachments/assets/2b254a7a-6d18-48d7-ac53-a7c7b35ddbf7)

</details>

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
    ![Image](https://github.com/user-attachments/assets/e559fbd0-5534-4e94-ba4a-bf3f6b39aa54)

### 3) 트리거 설정
- 트리거 추가 클릭
- 트리거 구성에서 S3 선택
- 버킷: 이미지를 업로드할 S3 버킷 선택
- 이벤트 유형: 모든 객체 생성 이벤트 선택
- 접두사: `original/` (original 폴더의 파일만 트리거)
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
- [NodeBird 프로젝트 위치](https://github.com/devellybutton/Node.js-for-beginners/blob/main/node_bird/controllers/post.js)
- `nodebird/controllers/posts/js`
    ```
    const { Post, Hashtag } = require('../models');

    exports.afterUploadImage = (req, res) => {
    console.log(req.file);
    const originalUrl = req.file.location;
    const url = originalUrl.replace(/\/original\//, '/thumb/');
    res.json({ url, originalUrl });
    };
    ...
    ```

------

## 5. 전체 프로세스 요약 및 테스트

### 전체 프로세스 다이어그램
![Image](https://github.com/user-attachments/assets/2169199f-dafc-4887-ba87-04867cc2cc4f)
- 만약 오류시 원본 이미지 렌더링 되도록 하는 로직 필요

### 람다 함수 오류 시
- AWS Cloudwatch > 로그 > 로그 그룹 > /aws/lambda/nodebird-test (본인 람다함수명)
- 로그 확인 가능
    ![Image](https://github.com/user-attachments/assets/6cf564f3-2900-4882-866a-0bf3ce39e051)