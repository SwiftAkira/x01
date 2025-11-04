/**
 * Form Validation Utilities
 */

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * Requirements: 8+ chars, mixed case, numbers
 */
export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain lowercase letters' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain uppercase letters' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain numbers' };
  }

  return { valid: true };
};

/**
 * Validate username format
 * Requirements: 3-20 chars, alphanumeric + underscore
 */
export const validateUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

/**
 * Validate party code format
 * Requirements: exactly 6 digits
 */
export const validatePartyCode = (code: string): boolean => {
  const codeRegex = /^\d{6}$/;
  return codeRegex.test(code);
};

/**
 * Format party code with spacing for readability
 * Example: 123456 -> 123 456
 */
export const formatPartyCode = (code: string): string => {
  const cleaned = code.replace(/\D/g, '');
  if (cleaned.length <= 3) return cleaned;
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)}`;
};
