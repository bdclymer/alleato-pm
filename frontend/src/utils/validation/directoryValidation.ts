import { createClient } from "@/lib/supabase/client";

interface ValidationResult {
  error?: string;
  isValid: boolean;
}

/**
 * Validation utilities for directory-related forms
 */
export const directoryValidation = {
  /**
   * Validate email address format
   */
  validateEmail: (email: string): ValidationResult => {
    if (!email) {
      return { error: "Email is required", isValid: false };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { error: "Please enter a valid email address", isValid: false };
    }

    return { isValid: true };
  },

  /**
   * Validate phone number format
   */
  validatePhone: (phone: string): ValidationResult => {
    if (!phone) {
      return { isValid: true }; // Phone is optional
    }

    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, "");

    if (digitsOnly.length < 10) {
      return {
        error: "Phone number must be at least 10 digits",
        isValid: false,
      };
    }

    if (digitsOnly.length > 15) {
      return { error: "Phone number is too long", isValid: false };
    }

    return { isValid: true };
  },

  /**
   * Validate company name
   */
  validateCompanyName: (name: string): ValidationResult => {
    if (!name || name.trim().length === 0) {
      return { error: "Company name is required", isValid: false };
    }

    if (name.trim().length < 2) {
      return {
        error: "Company name must be at least 2 characters",
        isValid: false,
      };
    }

    if (name.length > 100) {
      return {
        error: "Company name must be less than 100 characters",
        isValid: false,
      };
    }

    return { isValid: true };
  },

  /**
   * Validate user name (first and last)
   */
  validateUserName: (firstName: string, lastName: string): ValidationResult => {
    if (!firstName || firstName.trim().length === 0) {
      return { error: "First name is required", isValid: false };
    }

    if (!lastName || lastName.trim().length === 0) {
      return { error: "Last name is required", isValid: false };
    }

    if (firstName.length > 50) {
      return {
        error: "First name must be less than 50 characters",
        isValid: false,
      };
    }

    if (lastName.length > 50) {
      return {
        error: "Last name must be less than 50 characters",
        isValid: false,
      };
    }

    return { isValid: true };
  },

  /**
   * Validate license number format
   */
  validateLicenseNumber: (licenseNumber: string): ValidationResult => {
    if (!licenseNumber || licenseNumber.trim().length === 0) {
      return { error: "License number is required", isValid: false };
    }

    if (licenseNumber.length < 3) {
      return {
        error: "License number must be at least 3 characters",
        isValid: false,
      };
    }

    if (licenseNumber.length > 50) {
      return {
        error: "License number must be less than 50 characters",
        isValid: false,
      };
    }

    return { isValid: true };
  },

  /**
   * Validate expiration date (must be in the future)
   */
  validateExpirationDate: (date: string): ValidationResult => {
    if (!date) {
      return { error: "Expiration date is required", isValid: false };
    }

    const expirationDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(expirationDate.getTime())) {
      return { error: "Invalid date format", isValid: false };
    }

    if (expirationDate < today) {
      return { error: "Expiration date must be in the future", isValid: false };
    }

    return { isValid: true };
  },

  /**
   * Validate date range
   */
  validateDateRange: (startDate: string, endDate: string): ValidationResult => {
    if (!startDate || !endDate) {
      return { error: "Both start and end dates are required", isValid: false };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { error: "Invalid date format", isValid: false };
    }

    if (start > end) {
      return { error: "Start date must be before end date", isValid: false };
    }

    return { isValid: true };
  },

  /**
   * Validate required field
   */
  validateRequiredField: (
    value: string,
    fieldName: string,
  ): ValidationResult => {
    if (!value || value.trim().length === 0) {
      return { error: `${fieldName} is required`, isValid: false };
    }

    return { isValid: true };
  },

  /**
   * Validate unique email (async)
   */
  validateUniqueEmail: async (
    email: string,
    projectId: string,
  ): Promise<ValidationResult> => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("people")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      return { error: "Failed to validate email", isValid: false };
    }

    if (data) {
      return { error: "This email is already in use", isValid: false };
    }

    return { isValid: true };
  },

  /**
   * Validate unique company name (async)
   */
  validateUniqueCompanyName: async (
    name: string,
    projectId: string,
  ): Promise<ValidationResult> => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("companies")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (error) {
      return { error: "Failed to validate company name", isValid: false };
    }

    if (data) {
      return {
        error: "A company with this name already exists",
        isValid: false,
      };
    }

    return { isValid: true };
  },

  /**
   * Validate URL format
   */
  validateUrl: (url: string): ValidationResult => {
    if (!url) {
      return { isValid: true }; // URL is optional
    }

    try {
      new URL(url);
      return { isValid: true };
    } catch {
      return { error: "Please enter a valid URL", isValid: false };
    }
  },

  /**
   * Validate job title
   */
  validateJobTitle: (jobTitle: string): ValidationResult => {
    if (!jobTitle) {
      return { isValid: true }; // Job title is optional
    }

    if (jobTitle.length > 100) {
      return {
        error: "Job title must be less than 100 characters",
        isValid: false,
      };
    }

    return { isValid: true };
  },
};

/**
 * Helper function to validate multiple fields at once
 */
export function validateFields(
  validations: Array<{
    validate: () => ValidationResult | Promise<ValidationResult>;
    field: string;
  }>,
): Promise<Record<string, string>> {
  return Promise.all(
    validations.map(async ({ validate, field }) => {
      const result = await validate();
      return { field, error: result.error };
    }),
  ).then((results) => {
    return results.reduce(
      (acc, { field, error }) => {
        if (error) {
          acc[field] = error;
        }
        return acc;
      },
      {} as Record<string, string>,
    );
  });
}
