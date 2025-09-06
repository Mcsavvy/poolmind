// Extend global types for Mongoose in Next.js
declare global {
  namespace NodeJS {
    interface Global {
      mongoose: {
        conn: typeof import('mongoose') | null;
        promise: Promise<typeof import('mongoose')> | null;
      };
    }
  }
}

export {};
