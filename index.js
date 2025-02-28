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