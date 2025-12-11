// Mock for supabaseClient
export const supabase = {
  auth: {
    getUser: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })),
};