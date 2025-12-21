
interface Window {
  // Use optional property to match other declarations in the environment and avoid modifier mismatch errors
  aistudio?: {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  };
  webkitAudioContext: typeof AudioContext;
}

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}

// Removed 'declare var process' to fix 'Cannot redeclare block-scoped variable' error, 
// as 'process' is already defined in the global scope by @types/node or the environment.
