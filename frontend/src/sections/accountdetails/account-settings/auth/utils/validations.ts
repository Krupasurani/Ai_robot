// Define the authentication method type
export type AuthMethodType = 'password' | 'otp' | 'google' | 'microsoft' | 'azureAd' | 'samlSso' | 'oauth';

// Define the structure for an authentication method
export interface AuthMethod {
  type: string;
  enabled: boolean;
}

/**
 * Validates that only one authentication method is selected
 * @param {AuthMethod[]} enabledMethods - Array of enabled authentication methods
 * @returns {boolean} - True if validation passes, false otherwise
 */
export const validateSingleMethodSelection = (enabledMethods: AuthMethod[]): boolean =>
  enabledMethods.filter((method) => method.enabled).length === 1;

/**
 * Validates that OTP authentication can only be enabled if SMTP is configured
 * @param {AuthMethod[]} enabledMethods - Array of enabled authentication methods
 * @param {boolean} smtpConfigured - Whether SMTP is configured
 * @returns {boolean} - True if validation passes, false otherwise
 */
export const validateOtpConfiguration = (
  enabledMethods: AuthMethod[],
  smtpConfigured: boolean
): boolean => {
  // Check if OTP is enabled
  const isOtpEnabled = enabledMethods.some((method) => method.type === 'otp' && method.enabled);

  // If OTP is enabled, SMTP must be configured
  if (isOtpEnabled && !smtpConfigured) {
    return false;
  }

  return true;
};
