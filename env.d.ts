
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

interface Window {
  aistudio?: AIStudio;
}

// Fix: Use namespace augmentation for NodeJS.ProcessEnv instead of declaring 'process' as a variable.
// This avoids conflicts with existing global 'process' declarations in Node.js or Vite environments.
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY?: string;
  }
}
