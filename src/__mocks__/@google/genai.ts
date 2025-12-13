export const GoogleGenAI = jest.fn().mockImplementation(() => ({
  getGenerativeModel: jest.fn(),
}));

export const Type = {
  TEXT: 'text',
};