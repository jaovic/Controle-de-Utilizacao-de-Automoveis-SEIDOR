import { UsersService } from '../../src/modules/users/users.service';
import { makeUser, mockUsersRepository } from '../helpers/factories';

describe('UsersService', () => {
  let users: ReturnType<typeof mockUsersRepository>;
  let service: UsersService;
  const actor = makeUser({ role: 'ADMIN' });

  beforeEach(() => {
    users = mockUsersRepository();
    service = new UsersService(users);
  });

  it('lista usuários sem expor dados sensíveis', async () => {
    users.list.mockResolvedValue([makeUser()]);

    const [user] = await service.list();

    expect(user).not.toHaveProperty('passwordHash');
    expect(user).not.toHaveProperty('twoFactorCode');
  });

  it('promove um usuário a ADMIN', async () => {
    const target = makeUser();
    users.findById.mockResolvedValue(target);
    users.update.mockResolvedValue({ ...target, role: 'ADMIN' });

    const result = await service.updateRole(actor.id, target.id, { role: 'ADMIN' });

    expect(result.role).toBe('ADMIN');
  });

  it('não permite alterar a própria role', async () => {
    await expect(service.updateRole(actor.id, actor.id, { role: 'USER' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('não permite rebaixar o último administrador', async () => {
    const target = makeUser({ role: 'ADMIN' });
    users.findById.mockResolvedValue(target);
    users.countByRole.mockResolvedValue(1);

    await expect(service.updateRole(actor.id, target.id, { role: 'USER' })).rejects.toMatchObject({ statusCode: 409 });
    expect(users.update).not.toHaveBeenCalled();
  });

  it('exclui um usuário comum', async () => {
    const target = makeUser();
    users.findById.mockResolvedValue(target);

    await service.delete(actor.id, target.id);

    expect(users.delete).toHaveBeenCalledWith(target.id);
  });

  it('não permite excluir a própria conta', async () => {
    await expect(service.delete(actor.id, actor.id)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('retorna 404 para usuário inexistente', async () => {
    users.findById.mockResolvedValue(null);

    await expect(service.delete(actor.id, 'outro')).rejects.toMatchObject({ statusCode: 404 });
  });
});
