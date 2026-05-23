const isClaudeEnv = typeof window !== 'undefined' && window.storage;

export const store = {
  async get(key) {
    if (isClaudeEnv) return window.storage.get(key);
    const v = localStorage.getItem(key);
    return v ? { value: v } : null;
  },
  async set(key, value) {
    if (isClaudeEnv) return window.storage.set(key, value);
    localStorage.setItem(key, value);
    return { value };
  }
};
