/// <reference types="vite/client" />

declare global {
  // Define AIStudio interface to resolve conflict with subsequent property declarations
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
    webkitAudioContext: typeof AudioContext;
  }

  namespace NodeJS {
    interface ProcessEnv {
      API_KEY: string;
    }
  }

  // Removed var process redeclaration as it conflicts with existing Node.js types
}

export { };
