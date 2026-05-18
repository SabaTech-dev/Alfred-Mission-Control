/**
 * Middleware to prevent "blank tool name" errors
 * Validates tool names before execution
 */
export function validateToolCall(toolName: string, args: any): { valid: boolean; error?: string } {
  // Check for blank or null tool names
  if (!toolName || typeof toolName !== 'string' || toolName.trim() === '') {
    return { 
      valid: false, 
      error: 'Tool name cannot be blank or null' 
    };
  }
  
  // Check for dangerous characters that might cause injection
  const dangerousChars = [';', '|', '&', '$', '`', '>', '<'];
  if (dangerousChars.some(char => toolName.includes(char))) {
    return {
      valid: false,
      error: 'Tool name contains invalid characters'
    };
  }
  
  return { valid: true };
}

export function safeToolCall(toolName: string, args: any, toolExecutor: Function) {
  const validation = validateToolCall(toolName, args);
  if (!validation.valid) {
    console.warn(`[tool-validation] Blocked invalid tool call: ${validation.error}`);
    return Promise.reject(new Error(`Invalid tool call: ${validation.error}`));
  }
  
  return toolExecutor(toolName, args);
}
