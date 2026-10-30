export enum UploadHeaders {
  ORIGINAL_NAME = 'x-file-name',
  TYPE = 'x-file-type',
  CONTENT_LENGTH = 'content-length',
  TOKEN = 'x-token',
  PURPOSE = 'x-upload-purpose'
}

// profile images are not message attachments, so the UPLOAD_FILES role permission
// does not gate them. everything else is uploaded to be attached to a message
export enum UploadPurpose {
  MESSAGE = 'message',
  PROFILE_IMAGE = 'profile-image'
}
