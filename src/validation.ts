/**
 * Input validation for task descriptions and other user inputs.
 */

/** Maximum task length in characters */
export const MAX_TASK_LENGTH = 50000;

/** Minimum task length in characters */
export const MIN_TASK_LENGTH = 3;

/**
 * Patterns that may indicate prompt injection attempts.
 * These generate warnings, not errors, since they could be legitimate.
 */
const SUSPICIOUS_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /\[SYSTEM:/gi, description: "Contains '[SYSTEM:' which may be a prompt injection attempt" },
  { pattern: /\[ADMIN:/gi, description: "Contains '[ADMIN:' which may be a prompt injection attempt" },
  { pattern: /ignore previous instructions/gi, description: "Contains 'ignore previous instructions'" },
  { pattern: /disregard (all )?(prior|previous)/gi, description: "Contains instruction override pattern" },
  { pattern: /<\|im_start\|>/gi, description: "Contains chat template markers" },
  { pattern: /<\|im_end\|>/gi, description: "Contains chat template markers" },
];

/**
 * Patterns that are invalid and will cause rejection.
 */
const INVALID_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /\x00/, description: "Contains null byte" },
  { pattern: /[\x01-\x08\x0B\x0C\x0E-\x1F]/, description: "Contains control characters" },
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Validate a task description.
 * Returns { valid: true } if the task is acceptable.
 * Returns { valid: false, error: "..." } if the task should be rejected.
 * May include warnings for suspicious but allowed patterns.
 */
export function validateTask(task: string): ValidationResult {
  const warnings: string[] = [];

  // Check for empty/whitespace-only
  if (!task || task.trim().length === 0) {
    return { valid: false, error: "Task cannot be empty" };
  }

  // Check minimum length
  if (task.trim().length < MIN_TASK_LENGTH) {
    return { valid: false, error: `Task too short (minimum ${MIN_TASK_LENGTH} characters)` };
  }

  // Check maximum length
  if (task.length > MAX_TASK_LENGTH) {
    return {
      valid: false,
      error: `Task too long (${task.length} characters, maximum ${MAX_TASK_LENGTH})`,
    };
  }

  // Check for invalid patterns (reject)
  for (const { pattern, description } of INVALID_PATTERNS) {
    if (pattern.test(task)) {
      return { valid: false, error: description };
    }
  }

  // Check for suspicious patterns (warn)
  for (const { pattern, description } of SUSPICIOUS_PATTERNS) {
    if (pattern.test(task)) {
      warnings.push(description);
    }
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate test code input.
 */
export function validateTestCode(testCode: string): ValidationResult {
  // Check for empty
  if (!testCode || testCode.trim().length === 0) {
    return { valid: false, error: "Test code cannot be empty" };
  }

  // Check maximum length (test code can be larger than task)
  const MAX_TEST_CODE_LENGTH = 100000;
  if (testCode.length > MAX_TEST_CODE_LENGTH) {
    return {
      valid: false,
      error: `Test code too long (${testCode.length} characters, maximum ${MAX_TEST_CODE_LENGTH})`,
    };
  }

  // Check for invalid patterns
  for (const { pattern, description } of INVALID_PATTERNS) {
    if (pattern.test(testCode)) {
      return { valid: false, error: description };
    }
  }

  return { valid: true };
}
