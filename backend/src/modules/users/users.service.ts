import { AppError, ConflictError, NotFoundError } from '../../shared/errors/AppError';
import { toPublicUser } from './users.presenter';
import type { UsersRepository } from './users.repository';
import type { UpdateRoleInput } from './users.schemas';

/** Gestão de usuários, disponível apenas para ADMIN. */
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async list() {
    const users = await this.usersRepository.list();
    return users.map(toPublicUser);
  }

  async updateRole(actorId: string, id: string, { role }: UpdateRoleInput) {
    if (actorId === id) throw new AppError('Você não pode alterar a sua própria role');

    const user = await this.getOrFail(id);
    if (user.role === role) return toPublicUser(user);

    if (user.role === 'ADMIN' && (await this.usersRepository.countByRole('ADMIN')) <= 1) {
      throw new ConflictError('O sistema precisa ter ao menos um administrador');
    }

    return toPublicUser(await this.usersRepository.update(id, { role }));
  }

  async delete(actorId: string, id: string) {
    if (actorId === id) throw new AppError('Você não pode excluir a sua própria conta por aqui');

    const user = await this.getOrFail(id);
    if (user.role === 'ADMIN' && (await this.usersRepository.countByRole('ADMIN')) <= 1) {
      throw new ConflictError('O sistema precisa ter ao menos um administrador');
    }

    await this.usersRepository.delete(id);
  }

  private async getOrFail(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundError('Usuário não encontrado');
    return user;
  }
}
