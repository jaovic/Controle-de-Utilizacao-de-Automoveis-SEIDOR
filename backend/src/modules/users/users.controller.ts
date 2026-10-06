import type { Request, Response } from 'express';
import { getAuth } from '../../shared/middlewares/auth';
import type { IdParam } from '../../shared/schemas';
import type { UsersService } from './users.service';
import type { UpdateRoleInput } from './users.schemas';

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  list = async (_req: Request, res: Response) => {
    res.json(await this.usersService.list());
  };

  updateRole = async (req: Request, res: Response) => {
    const { id } = res.locals.params as IdParam;
    res.json(await this.usersService.updateRole(getAuth(res).userId, id, req.body as UpdateRoleInput));
  };

  delete = async (_req: Request, res: Response) => {
    const { id } = res.locals.params as IdParam;
    await this.usersService.delete(getAuth(res).userId, id);
    res.status(204).send();
  };
}
