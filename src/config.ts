export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 
    (import.meta.env.PROD 
      ? 'https://commitspace.com/api' 
      : 'http://localhost:3000'),
} as const;
