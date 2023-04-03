import axios from 'axios';
async function s3Upload(file: File, presignedUrl: string) {
  //we use axios to upload the image with the presignedUrl
  try {
    const result = await axios.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
    });
    return result;
  } catch (error) {
    console.log(error);
  }
}

export default s3Upload;
