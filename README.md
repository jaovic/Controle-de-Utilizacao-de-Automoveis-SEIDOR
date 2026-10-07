# TTP Frota: controle de utilização de automóveis

Sistema web para controlar o uso dos automóveis de uma empresa: cadastro de **automóveis** e **motoristas**, registro de **utilizações** (quem está com qual carro, desde quando e por quê), com **login próprio** (JWT + refresh token) e **perfis de acesso** (roles).

**Regras de negócio:** um automóvel só pode ser usado por um motorista por vez, e um motorista que já está com um automóvel não pode pegar outro ao mesmo tempo.

**Em produção:**
- Aplicação: https://controle-de-utilizacao-de-automovei.vercel.app
- API (Swagger): https://controle-de-utilizacao-de-automoveis-seidor-production.up.railway.app/docs

| Parte | Stack | Deploy |
| --- | --- | --- |
| `backend/` | Node 20, TypeScript, Express 5, Prisma, Zod, JWT, Jest | Railway (Dockerfile) |
| `frontend/` | Next.js 16 (App Router), React 19, Tailwind 4, TanStack Query | Vercel |
| Banco | PostgreSQL 16 | Supabase (produção) / Docker (local) |

---

## Rodar localmente (Docker)

Pré-requisito: Docker com Docker Compose.

```bash
git clone https://github.com/jaovic/Controle-de-Utilizacao-de-Automoveis-SEIDOR.git
cd Controle-de-Utilizacao-de-Automoveis-SEIDOR
docker compose up --build
```

| Serviço | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| API | http://localhost:3333 |
| Swagger | http://localhost:3333/docs |
| Postgres | `localhost:5432`, banco `ttp`, usuário e senha `postgres` |

Ao subir, a API aplica as migrations e cria:
- um **administrador** com e-mail `admin@ttp.local` e senha `Admin@123`;
- alguns automóveis e motoristas de exemplo.

Para parar, use `docker compose down`. Para apagar também o banco, use `docker compose down -v`.

### Sem Docker (desenvolvimento)

```bash
docker compose up -d db                      # só o Postgres

cd backend
cp .env.example .env
npm install
npx prisma migrate deploy && npm run seed
npm run dev                                  # http://localhost:3333

cd ../frontend
cp .env.example .env.local                   # BACKEND_URL=http://localhost:3333
npm install
npm run dev                                  # http://localhost:3000
```

### Testes

```bash
cd backend && npm test     # 77 testes (unitários + HTTP), sem precisar de banco
cd frontend && npm run lint && npm run build
```

---

## Funcionalidades

- **Automóveis:** cadastro (placa no padrão antigo ou Mercosul), edição, exclusão e listagem com filtro por cor e marca. O filtro busca por trecho do texto ("pra" encontra "Prata") e é aplicado enquanto se digita.
- **Motoristas:** cadastro, edição, exclusão e listagem com filtro por nome.
- **Utilizações:** iniciar (automóvel, motorista, motivo e início "agora" ou em outra data e hora), finalizar (término "agora" ou em outra data e hora, nunca antes do início nem no futuro) e listar com o nome do motorista e os dados do automóvel, filtrando por em andamento ou finalizadas.
- **Histórico preservado:** automóveis e motoristas com utilizações registradas não podem ser excluídos.

## Autenticação

- **Cadastro:** nome, e-mail e uma **senha forte** (mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial). A tela mostra um medidor de força e a API recusa senhas fracas. A conta nasce com role `USER` e o cadastro já abre a sessão.
- **Sessão:** access token JWT de 15 minutos mais refresh token de 7 dias, opaco, guardado como hash e **rotacionado a cada uso**. Se um refresh token já usado for reaproveitado, todas as sessões do usuário são revogadas. O front renova a sessão sozinho quando o access token expira.
- **Cookies:** a API define cookies `httpOnly` (`access_token`, `refresh_token`) e também devolve os tokens no corpo da resposta, para Swagger e Postman. As rotas aceitam `Authorization: Bearer` **ou** o cookie.
- **Rate limit em três camadas:** por IP em todas as rotas (100/min); mais rígido por IP no cadastro e no login (10/min); e **por usuário** nas rotas autenticadas (60/min), identificado pelo `sub` do token. Assim, colegas atrás do mesmo IP da empresa não se bloqueiam, e uma conta não escapa do limite trocando de IP.

### Roles

| Ação | USER | ADMIN |
| --- | :---: | :---: |
| Ver automóveis, motoristas e utilizações | ✅ | ✅ |
| Iniciar e finalizar utilizações | ✅ | ✅ |
| Cadastrar, editar e excluir automóveis e motoristas | ❌ | ✅ |
| Listar usuários, alterar role e excluir usuários | ❌ | ✅ |

O sistema sempre mantém ao menos um administrador, e ninguém altera a própria role.

### Por que funciona igual em localhost e em produção

O navegador **só conversa com o domínio do front**. O Next tem uma rota `/api/*` ([route.ts](frontend/src/app/api/[...path]/route.ts)) que repassa cada chamada para a API (`BACKEND_URL`) e devolve os cookies. Com isso:

- os cookies de sessão pertencem ao domínio do front (`localhost:3000` ou `*.vercel.app`), sem CORS e sem cookies de terceiros, que os navegadores bloqueiam entre Vercel e Railway;
- `BACKEND_URL` é lida em tempo de execução, então a mesma build roda no Docker (`http://api:3333`) e na Vercel (URL do Railway).

O [`proxy.ts`](frontend/src/proxy.ts) do Next redireciona quem não tem sessão para `/login` e barra `/admin` para quem não é ADMIN. Quem garante as permissões de fato é a API.

---

## Deploy (Supabase + Railway + Vercel)

### 1. Supabase (banco)
Crie o projeto (sem a Data API, já que só a nossa API acessa o banco). Em **Connect → ORM → Prisma**, copie as duas strings de conexão:
- **Transaction pooler** (porta 6543): use como `DATABASE_URL`, terminando em `?pgbouncer=true&connection_limit=1`;
- **Session pooler** (porta 5432): use como `DIRECT_URL`, que é a conexão usada pelas migrations.

Se a senha do banco tiver caracteres especiais, codifique-os na URL (ex.: `@` vira `%40`).

### 2. Railway (API)
**New Project → Deploy from GitHub repo**. Em **Settings → Root Directory**, use `backend`; o Railway detecta o Dockerfile. Configure estas variáveis:

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` / `DIRECT_URL` | as do Supabase |
| `JWT_SECRET` | aleatório, gerado com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `COOKIE_SECURE` | `true` |
| `TRUST_PROXY` | `2` (proxy do Railway + função da Vercel) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | admin inicial (troque a senha padrão; evite `#`, que o editor de variáveis pode tratar como comentário) |
| `SEED` | `true` (cria o admin se ele não existir; é idempotente) |

Gere um domínio público em **Settings → Networking**. Ao iniciar, o container roda `prisma migrate deploy` e o seed.

### 3. Vercel (front)
**Add New → Project**, importe o repositório e defina **Root Directory** = `frontend`. Variável:

| Variável | Valor |
| --- | --- |
| `BACKEND_URL` | `https://<seu-servico>.up.railway.app` |

Na Vercel, mudanças de variável só valem a partir do próximo deploy (**Deployments → ⋯ → Redeploy**).

### Variáveis da API (referência)

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `DATABASE_URL` / `DIRECT_URL` | obrigatória | Conexões com o Postgres (aplicação / migrations) |
| `JWT_SECRET` | obrigatória | Mínimo de 32 caracteres |
| `ACCESS_TOKEN_TTL_MINUTES` | `15` | Validade do access token |
| `REFRESH_TOKEN_TTL_DAYS` | `7` | Validade do refresh token |
| `COOKIE_SECURE` | `false` | `true` em HTTPS |
| `RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_MAX` | `100` / `10` | Requisições por IP por minuto (geral / cadastro e login) |
| `USER_RATE_LIMIT_MAX` | `60` | Requisições por usuário autenticado por minuto |
| `TRUST_PROXY` | `0` | Proxies à frente da API |
| `SEED` | - | `true` para criar o admin e os dados de exemplo ao iniciar o container |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | `admin@ttp.local` / `Admin@123` / `Administrador` | Admin criado pelo seed |

O arquivo completo, com comentários, é o [backend/.env.example](backend/.env.example).

---

## API, Swagger e Postman

- **Swagger:** `/docs` na API. Faça login em `POST /api/auth/login`, copie o `accessToken` e use **Authorize**.
- **Postman:** importe a pasta [`postman/`](postman), com os environments **TTP - Local** e **TTP - Produção**. Rodando a coleção inteira, ela faz login do admin, cadastra um usuário, renova a sessão, testa as permissões, o CRUD e as regras de negócio e limpa os dados que criou. Por causa do rate limit do cadastro e do login, espere 1 minuto entre duas execuções completas.

Endpoints principais: `/api/auth/*` (register, login, refresh, logout, me), `/api/users` (admin), `/api/cars`, `/api/drivers` e `/api/usages`. Os erros seguem `{ "error": { "message", "code", "details" } }`.

---

## Estrutura

```
backend/
  prisma/              schema, migrations (inclui índices únicos parciais da regra de negócio), seed
  src/modules/
    auth/              cadastro, login, tokens, refresh
    users/             gestão de usuários (admin)
    cars/ drivers/ usages/
  src/shared/          erros, middlewares (auth, roles, validação, rate limit)
frontend/
  src/app/(auth)/      login e cadastro
  src/app/(app)/       utilizações, automóveis, motoristas, usuários, perfil
  src/app/api/         proxy same-origin para a API
  src/proxy.ts         proteção das rotas
docker-compose.yml     db + api + web
```

**Decisões principais:**
- **Regra de negócio no service e no banco:** índices únicos parciais `WHERE ended_at IS NULL` garantem a regra mesmo com requisições simultâneas.
- **Camadas com injeção de dependência:** os services dependem de interfaces de repositório, o que permite testá-los sem banco.
- **Segredos nunca em texto puro:** senhas com bcrypt e refresh tokens com SHA-256.
