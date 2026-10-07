import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

/**
 * Cria o administrador inicial e alguns dados de exemplo.
 * Idempotente: pode rodar a cada deploy sem duplicar nada.
 * Em produção, defina ADMIN_EMAIL / ADMIN_PASSWORD com valores próprios.
 */
async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@ttp.local').toLowerCase();

  if (await prisma.user.findUnique({ where: { email } })) {
    console.log(`Admin ${email} já existe.`);
    return;
  }

  await prisma.user.create({
    data: {
      name: process.env.ADMIN_NAME ?? 'Administrador',
      email,
      passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD ?? 'Admin@123', 10),
      role: 'ADMIN',
    },
  });
  console.log(`Admin ${email} criado.`);
}

async function seedSampleData() {
  if ((await prisma.car.count()) > 0 || (await prisma.driver.count()) > 0) {
    console.log('Dados de exemplo ignorados: o banco já possui automóveis ou motoristas.');
    return;
  }

  await prisma.car.createMany({
    data: [
      { plate: 'ABC1D23', color: 'Prata', brand: 'Fiat' },
      { plate: 'BRA2E19', color: 'Preto', brand: 'Volkswagen' },
      { plate: 'XYZ9876', color: 'Branco', brand: 'Toyota' },
    ],
  });
  await prisma.driver.createMany({
    data: [{ name: 'Maria Souza' }, { name: 'João Pereira' }, { name: 'Ana Lima' }],
  });
  console.log('Dados de exemplo criados: 3 automóveis e 3 motoristas.');
}

async function main() {
  await seedAdmin();
  await seedSampleData();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
