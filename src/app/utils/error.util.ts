export function extractErrorMessage(err: any): string {
  if (!err) return 'เกิดข้อผิดพลาดบางอย่าง';

  // Network / Timeout Errors
  if (err.name === 'TimeoutError' || err.status === 0 || err.error instanceof ProgressEvent) {
    return 'เกิดข้อผิดพลาดกับการเชื่อมต่ออินเทอร์เน็ต';
  }

  // Handle specific HTTP Status Codes
  if (typeof err.status === 'number') {
    if (err.status === 404) {
      return 'ไม่พบข้อมูล หรือไม่พบผู้ใช้นี้';
    }
    if (err.status >= 500) {
      return 'ระบบขัดข้องชั่วคราว โปรดลองใหม่อีกครั้งในภายหลัง';
    }
  }

  // Extract raw message from the error object
  let rawMessage = '';
  if (typeof err?.error === 'string') {
    rawMessage = err.error;
  } else if (err?.error?.message) {
    rawMessage = err.error.message;
  } else if (err?.message) {
    rawMessage = err.message;
  }

  if (!rawMessage) return 'เกิดข้อผิดพลาด โปรดลองใหม่อีกครั้ง';

  const lowerMsg = String(rawMessage).toLowerCase();

  // Filter out sensitive backend/database errors
  if (
    lowerMsg.includes('sql') ||
    lowerMsg.includes('database') ||
    lowerMsg.includes('syntax') ||
    lowerMsg.includes('exception') ||
    lowerMsg.includes('connection')
  ) {
    return 'เกิดข้อผิดพลาดของระบบ โปรดติดต่อผู้ดูแล';
  }

  // Map common backend messages to Thai
  if (lowerMsg.includes('not found') || lowerMsg.includes('no user')) {
    return 'ไม่พบผู้ใช้นี้';
  }
  if (lowerMsg.includes('invalid') || lowerMsg.includes('wrong') || lowerMsg.includes('credential')) {
    return 'ข้อมูลไม่ถูกต้อง';
  }
  if (lowerMsg.includes('exist') || lowerMsg.includes('duplicate')) {
    return 'ข้อมูลนี้มีอยู่ในระบบแล้ว';
  }

  // Return the original message if it's safe (e.g., from a 400 validation error), otherwise generic
  if (err.status === 400 && typeof err?.error?.message === 'string') {
     return err.error.message;
  }

  return 'เกิดข้อผิดพลาด โปรดลองใหม่อีกครั้ง';
}
