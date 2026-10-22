import { validateEnv } from './env.schema';

const validEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
};

describe('validateEnv', () => {
  it('rejects a missing DATABASE_URL and names the variable', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects an empty DATABASE_URL', () => {
    expect(() => validateEnv({ DATABASE_URL: '' })).toThrow(/DATABASE_URL/);
  });

  it('rejects a non-numeric PORT', () => {
    expect(() => validateEnv({ ...validEnv, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('reports every invalid variable at once', () => {
    expect(() => validateEnv({ PORT: 'abc', LOG_LEVEL: 'loud' })).toThrow(
      /(?=[\s\S]*DATABASE_URL)(?=[\s\S]*PORT)(?=[\s\S]*LOG_LEVEL)/,
    );
  });

  it('coerces PORT to a number', () => {
    expect(validateEnv({ ...validEnv, PORT: '5000' }).PORT).toBe(5000);
  });

  it('applies defaults when optional variables are missing', () => {
    expect(validateEnv(validEnv)).toEqual({
      ...validEnv,
      PORT: 4000,
      NODE_ENV: 'development',
      LOG_LEVEL: 'info',
    });
  });
});
