import { registerSchema } from '../../src/modules/auth/auth.schemas';

const base = { name: 'Maria', email: 'maria@ttp.local' };
const passwordErrors = (password: string) => {
  const result = registerSchema.safeParse({ ...base, password });
  return result.success ? [] : (result.error.flatten().fieldErrors.password ?? []);
};

describe('registerSchema: senha forte', () => {
  it('aceita senha com maiúscula, minúscula, número e caractere especial', () => {
    expect(passwordErrors('Senha@123')).toEqual([]);
  });

  it.each([
    ['curta', 'Ab1@', /8 caracteres/],
    ['sem maiúscula', 'senha@123', /maiúscula/],
    ['sem minúscula', 'SENHA@123', /minúscula/],
    ['sem número', 'Senha@abc', /número/],
    ['sem caractere especial', 'Senha1234', /especial/],
  ])('rejeita senha %s', (_case, password, message) => {
    expect(passwordErrors(password).join(' ')).toMatch(message);
  });
});
