# TTP Frota: controle de utilização de automóveis

Sistema web para controlar o uso dos automóveis de uma empresa: cadastro de **automóveis** e **motoristas**, registro de **utilizações** (quem está com qual carro, desde quando e por quê), com **login próprio**, **verificação do telefone por SMS**, **2FA opcional** e **perfis de acesso (roles)**.

**Regras de negócio:** um automóvel só pode ser usado por um motorista por vez, e um motorista que já está com um automóvel não pode pegar outro ao mesmo tempo.

**Em produção:**
- Aplicação: https://controle-de-utilizacao-de-automovei.vercel.app
- API (Swagger): https://controle-de-utilizacao-de-automoveis-seidor-production.up.railway.app/docs

| Parte | Stack | Deploy |
| --- | --- | --- |
| `backend/` | Node 20, TypeScript, Express 5, Prisma, Zod, JWT, Twilio, Jest | Railway (Dockerfile) |
| `frontend/` | Next.js 16 (App Router), React 19, Tailwind 4, TanStack Query | Vercel |
| Banco | PostgreSQL 16 | Supabase (produção) / Docker (local) |

---

## Rodar localmente (Docker)

Pré-requisito: Docker com Docker Compose.

```bash
git clone <url-do-repositorio> ttp-completo
cd ttp-completo
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

**SMS em ambiente local:** o compose usa `SMS_PROVIDER=console`. Nenhum SMS é enviado: o código aparece **na própria tela** (aviso amarelo) e no log da API (`docker compose logs -f api`). Assim dá para testar cadastro e 2FA sem conta na Twilio.

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
cd backend && npm test     # 95 testes (unitários + HTTP), sem precisar de banco
cd frontend && npm run lint && npm run build
```

---

## Autenticação

```
Cadastro ──► SMS com código ──► Verificar telefone ──► Login ──► (2FA ativo?) ──► SMS ──► Código ──► Sessão
                                 (obrigatório 1x)                     └── não ──────────────────────► Sessão
```

- **Cadastro:** nome, e-mail, celular no formato internacional (`+5511999998888`) e uma senha forte (mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial; a tela mostra um medidor de força). A conta nasce com role `USER`.
- **Verificação do telefone:** obrigatória **uma única vez**, antes do primeiro login. Enquanto ela não for feita, o login responde `403 PHONE_NOT_VERIFIED`, o front leva o usuário para a tela de verificação e um novo código é enviado.
- **2FA no login (opcional):** em **Meu perfil**, o usuário ativa a verificação em duas etapas, confirmando com a senha. A partir daí, todo login pede também um código por SMS.
- **Códigos:** 6 dígitos, válidos por 5 minutos, no máximo 5 tentativas e 30 segundos entre reenvios. No banco fica apenas o hash, nas colunas `two_factor_code*` da tabela `users`.
- **Sessão:** access token JWT de 15 minutos mais refresh token de 7 dias, opaco, guardado como hash e **rotacionado a cada uso**. Se um refresh token já usado for reaproveitado, todas as sessões do usuário são revogadas.
- **Cookies:** a API define cookies `httpOnly` (`access_token`, `refresh_token`) e também devolve os tokens no corpo da resposta, para Swagger e Postman. As rotas aceitam `Authorization: Bearer` **ou** o cookie.
- **Rate limit em três camadas:** por IP em todas as rotas (100/min); mais rígido por IP no login, cadastro e códigos (10/min); e **por usuário** nas rotas autenticadas (60/min), identificado pelo `sub` do token. Assim, colegas atrás do mesmo IP da empresa não se bloqueiam, e uma conta não escapa do limite trocando de IP. A chave é o usuário, e não a string do token, porque o token muda a cada refresh e zeraria o contador.

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
Crie o projeto e, em **Connect**, copie as duas strings de conexão:
- **Transaction pooler** (porta 6543): use como `DATABASE_URL` e acrescente `?pgbouncer=true`;
- **Session pooler / conexão direta** (porta 5432): use como `DIRECT_URL`, que é a conexão usada pelas migrations.

### 2. Railway (API)
**New Project → Deploy from GitHub repo**. Em **Settings → Root Directory**, use `backend`; o Railway detecta o Dockerfile. Configure estas variáveis:

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` / `DIRECT_URL` | as do Supabase |
| `JWT_SECRET` | aleatório, gerado com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `COOKIE_SECURE` | `true` |
| `TRUST_PROXY` | `2` (proxy do Railway + função da Vercel) |
| `SMS_PROVIDER` | `twilio` |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | do console da Twilio |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_PHONE` / `ADMIN_NAME` | admin inicial (troque a senha padrão) |
| `SEED` | `true` (cria o admin; é idempotente) |

Gere um domínio público em **Settings → Networking**. Ao iniciar, o container roda `prisma migrate deploy` e o seed.

> Com conta Twilio **trial**, só é possível enviar SMS para números verificados no console da Twilio.
> Para que qualquer pessoa consiga testar, defina `SMS_DEMO_FALLBACK=true`: o sistema tenta o SMS e, se a
> Twilio recusar por limitação da conta (número não verificado ou país não habilitado), mostra o código na tela
> com um aviso de "modo demonstração". Números verificados continuam recebendo o SMS normalmente. Em produção
> real (conta paga), deixe `false`.

### 3. Vercel (front)
**Add New → Project**, importe o repositório e defina **Root Directory** = `frontend`. Variável:

| Variável | Valor |
| --- | --- |
| `BACKEND_URL` | `https://<seu-servico>.up.railway.app` |

### Variáveis da API (referência)

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `JWT_SECRET` | obrigatória | Mínimo de 32 caracteres |
| `ACCESS_TOKEN_TTL_MINUTES` | `15` | Validade do access token |
| `REFRESH_TOKEN_TTL_DAYS` | `7` | Validade do refresh token |
| `COOKIE_SECURE` | `false` | `true` em HTTPS |
| `SMS_PROVIDER` | `console` | `console` ou `twilio` |
| `SMS_DEMO_FALLBACK` | `false` | Com `twilio`: mostra o código na tela quando a conta não consegue enviar para o número |
| `RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_MAX` | `100` / `10` | Requisições por IP por minuto (geral / login) |
| `USER_RATE_LIMIT_MAX` | `60` | Requisições por usuário autenticado por minuto |
| `TRUST_PROXY` | `0` | Proxies à frente da API |

O arquivo completo, com comentários, é o [backend/.env.example](backend/.env.example).

---

## API, Swagger e Postman

- **Swagger:** `/docs` na API. Faça login em `POST /api/auth/login`, copie o `accessToken` e use **Authorize**.
- **Postman:** importe [`postman/`](postman). Rodando a coleção inteira, ela faz login do admin, cadastra e verifica um usuário, testa 2FA, permissões, CRUD, regras de negócio e limpa os dados que criou. Os códigos SMS vêm do campo `devCode` (só em modo local). Por causa do rate limit das rotas de login, espere 1 minuto entre duas execuções completas.

Endpoints principais: `/api/auth/*` (register, verify-phone, resend-code, login, login/verify, refresh, logout, me, me/two-factor), `/api/users` (admin), `/api/cars`, `/api/drivers` e `/api/usages`. Os erros seguem `{ "error": { "message", "code", "details" } }`.

---

## Estrutura

```
backend/
  prisma/              schema, migrations (inclui índices únicos parciais da regra de negócio), seed
  src/modules/
    auth/              cadastro, login, 2FA, tokens, refresh
    users/             gestão de usuários (admin)
    cars/ drivers/ usages/
  src/infra/sms/       SmsProvider: Twilio ou console
  src/shared/          erros, middlewares (auth, roles, validação, rate limit)
frontend/
  src/app/(auth)/      login, cadastro, verificação de telefone, 2FA
  src/app/(app)/       utilizações, automóveis, motoristas, usuários, perfil
  src/app/api/         proxy same-origin para a API
  src/proxy.ts         proteção das rotas
docker-compose.yml     db + api + web
```

**Decisões principais:**
- **Regra de negócio no service e no banco:** índices únicos parciais `WHERE ended_at IS NULL` garantem a regra mesmo com requisições simultâneas.
- **Camadas com injeção de dependência:** os services dependem de interfaces (repositórios, SMS), o que permite testá-los sem banco nem Twilio.
- **Segredos nunca em texto puro:** senhas com bcrypt; códigos SMS e refresh tokens com SHA-256.
