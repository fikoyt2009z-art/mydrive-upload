window.APP_CONFIG = {
  // Замените на публичный Site Key из консоли Cloudflare Turnstile
  TURNSTILE_SITE_KEY: "0x4AAAAAAAXXXXXXXXXXXXXX",
  
  // Максимальный размер файла: 1 ГБ в байтах
  MAX_FILE_SIZE_BYTES: 1024 * 1024 * 1024,
  
  // Размер чанка для Resumable Upload (8 МБ)
  CHUNK_SIZE_BYTES: 8 * 1024 * 1024,
  
  // Разрешенные MIME-типы
  ALLOWED_MIME_TYPES: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/heic",
    "image/heif",
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
    "video/3gpp",
    "video/x-matroska"
  ]
};
