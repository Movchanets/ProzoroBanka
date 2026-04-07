# ProzoroBanka

ProzoroBanka це full-stack платформа для прозорих зборів коштів для волонтерських ініціатив та організацій. Репозиторій містить:

- `Backend/`: ASP.NET Core Web API на .NET 10 з шарами `API`, `Application`, `Domain`, `Infrastructure`
- `Frontend/`: клієнтський застосунок на React 19 + Vite
- `Infra/`: Terraform-конфігурацію для інфраструктури та деплою в Azure

Система включає публічні сторінки зборів і організацій, керування командами та інвайтами, адмінські сценарії, завантаження файлів, OCR-інтеграції, Monobank-related логіку та сторінки прозорості.

## Архітектура

### Backend

- ASP.NET Core API з JWT-автентифікацією
- Entity Framework Core + PostgreSQL
- ASP.NET Identity для користувачів і ролей
- Application layer у стилі command/query handlers
- Локальні та хмарні провайдери файлового сховища
- Опціональний Redis для кешу й output cache
- Автоматичне застосування міграцій при старті
- Автоматичний seed ролей та admin-користувача при старті

### Frontend

- React 19 + TypeScript + Vite
- React Router
- TanStack Query для серверного стану
- Zustand для auth/workspace state
- Tailwind CSS v4 та Radix UI
- Playwright E2E тести, prerender і генерація sitemap

### Infrastructure

Terraform у `Infra/` керує Azure-ресурсами для хостингу:

- Azure Resource Group
- Azure Container Apps Environment
- Azure Container App для backend API
- Azure Static Web App для frontend
- Azure Blob Storage для завантажених файлів
- Опціональний Azure Document Intelligence ресурс для OCR

Важливо: PostgreSQL і Redis Terraform у цьому репозиторії не створює. Їхні connection strings передаються ззовні через secrets/variables під час деплою.

## Передумови

Для локальної розробки без Docker:

- .NET SDK `10.0.x`
- Node.js `22.x`
- npm
- PostgreSQL `17+` або сумісна локальна інсталяція
- Docker Desktop, якщо хочете швидко підняти БД через Compose

Для найшвидшого повного локального запуску:

- Docker Desktop з `docker compose`

## Локальний запуск

Найзручніше використовувати один із двох сценаріїв.

### Варіант 1: повний стек через Docker Compose

Це найшвидший спосіб підняти backend, frontend, PostgreSQL і Redis разом.

```powershell
docker compose up --build
```

Сервіси:

- Frontend: `http://localhost:3000`
- API: `http://localhost:5000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Що робить Compose:

- запускає PostgreSQL з базою `prozoro_banka_dev`
- запускає Redis
- збирає та запускає backend у режимі `Development`
- збирає та запускає frontend з уже заданим API URL

Backend-контейнер автоматично застосовує EF Core міграції при старті та виконує seed ролей і admin-користувача.

Локальний admin за development-конфігом:

- email: `admin@example.com`
- password: `Qwerty-1`

Щоб зупинити та прибрати контейнери:

```powershell
docker compose down
```

Щоб також видалити volumes з даними:

```powershell
docker compose down -v
```

### Варіант 2: локальний backend + локальний frontend, тільки БД у Docker

Це рекомендований режим для щоденної розробки, коли потрібен hot reload і достатньо лише локальної бази.

Запуск тільки PostgreSQL:

```powershell
docker compose up -d postgres
```

Redis опціональний. Якщо він теж потрібен:

```powershell
docker compose up -d postgres redis
```

#### Backend

API-проєкт знаходиться в `Backend/src/ProzoroBanka.API`.

З кореня репозиторію:

```powershell
dotnet restore Backend/ProzoroBanka.slnx
dotnet run --project Backend/src/ProzoroBanka.API
```

Локальні URL backend за `launchSettings.json`:

- `http://localhost:5188`
- `https://localhost:7038`

OpenAPI/Scalar у development доступний за адресою:

- `http://localhost:5188/scalar`

Backend сам застосовує міграції при старті.

#### Мінімальна backend-конфігурація

Мінімально потрібна лише PostgreSQL. Redis можна вимкнути.

Рекомендований набір PowerShell overrides для чистого локального запуску без Redis:

```powershell
$env:ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=prozoro_banka_dev;Username=postgres;Password=123456"
$env:Redis__Enabled="false"
$env:Storage__Provider="Local"
$env:Ocr__Provider="fallback"
dotnet run --project Backend/src/ProzoroBanka.API
```

Примітки:

- при `Redis__Enabled=false` застосунок використовує in-memory cache
- `Storage__Provider=Local` зберігає файли в `wwwroot/uploads`
- `Ocr__Provider=fallback` дозволяє не налаштовувати хмарний OCR локально

Інтеграції, які можна не налаштовувати локально:

- Google OAuth
- Cloudflare Turnstile
- SMTP credentials
- Azure/Mistral OCR credentials
- Redis connection string

Не комітьте реальні секрети в `appsettings.*`. Краще використовуйте environment variables або local user secrets.

#### Frontend

Frontend знаходиться в `Frontend/`.

```powershell
Set-Location Frontend
$env:VITE_API_URL="http://localhost:5188"
npm ci
npm run dev
```

Dev-сервер буде доступний тут:

- `http://localhost:5173`

Корисні frontend env vars:

- `VITE_API_URL`: базовий URL backend API
- `VITE_SITE_URL`: canonical site URL для sitemap/SEO build
- `VITE_TURNSTILE_SITE_KEY`: опціональний Turnstile site key
- `VITE_GOOGLE_CLIENT_ID`: опціональний Google client id
- `VITE_GA_MEASUREMENT_ID`: опціональний Google Analytics id

### Рекомендований локальний workflow

Для більшості задач:

1. Підняти PostgreSQL через Docker.
2. Запустити backend локально з `Backend/src/ProzoroBanka.API`.
3. Запустити frontend локально з `Frontend/`.
4. Вмикати Redis лише тоді, коли тестуєте кешування або output cache.

Такий режим дає швидкий цикл розробки і при цьому достатньо близький до продакшен-середовища.

## Тестування

### Backend

```powershell
dotnet test Backend/ProzoroBanka.slnx
```

### Frontend lint/build

```powershell
Set-Location Frontend
npm ci
npm run lint
npm run build
```

### Playwright E2E

```powershell
Set-Location Frontend
npx playwright install
npm run test:e2e
```

Для повного контейнеризованого тестового стенду також є скрипт:

- `scripts/start-test-containers.sh`

## Deploy

Деплой побудований через GitHub Actions у `.github/workflows/`.

### CI

`ci.yml` запускає:

- restore/build/test для backend
- install/lint/build для frontend
- `terraform fmt` і `terraform validate`
- Playwright E2E тести

### Основний deploy pipeline

`deploy.yml` це головний workflow для деплою в Azure.

Сценарій верхнього рівня:

1. Збирається backend Docker image з `Backend/Dockerfile`.
2. Image пушиться в GitHub Container Registry (`ghcr.io`).
3. Workflow логіниться в Azure.
4. У `Infra/` виконується `terraform init/plan/apply`.
5. Створюються або оновлюються Azure-ресурси.
6. З Terraform outputs читаються `api_base_url`, `static_web_app_name` та інші потрібні значення.
7. Frontend збирається з production URL-ами та SEO env vars.
8. Генерується sitemap і виконується prerender сторінок.
9. Вміст `Frontend/dist` деплоїться в Azure Static Web Apps.

Тригери:

- `push` у `main`
- ручний `workflow_dispatch`
- успішний CI workflow у налаштованому сценарії

### Frontend-only rebuild

`frontend-rebuild.yml` призначений для перебілду й передеплою тільки frontend, коли backend та інфраструктура вже існують.

Конфіг може братися з:

- GitHub secrets/variables
- Terraform remote state outputs

## Infra

Корінь Terraform-конфігурації: `Infra/`.

Основні файли:

- `providers.tf`: конфігурація Terraform та AzureRM provider
- `rg.tf`: resource group
- `env.tf`: Azure Container Apps environment
- `apps.tf`: backend container app і прокидування secrets/env vars
- `static_web_app.tf`: frontend hosting
- `storage.tf`: blob storage для завантажень
- `ocr.tf`: опціональний Azure OCR ресурс
- `variables.tf`: deploy-time змінні
- `outputs.tf`: значення для CI/CD і ручних операцій

### Що створює інфраструктура

- runtime для backend у Azure Container Apps
- хостинг frontend у Azure Static Web Apps
- Azure Blob Storage для завантажених файлів
- опціональні custom domains для frontend і API
- Azure-managed certificate flow після DNS валідації

### Що має бути передано ззовні

- PostgreSQL connection string
- Redis connection string, якщо Redis увімкнений
- JWT secrets
- encryption key
- SMTP credentials
- Google OAuth credentials
- Turnstile secret
- OCR credentials, якщо Terraform не створює Azure OCR ресурс
- GHCR pull credentials для Azure Container Apps

### Terraform state

Terraform використовує Azure Storage backend. Приклади backend-конфігів:

- `Infra/environments/dev/backend.hcl.example`
- `Infra/environments/prod/backend.hcl.example`

Приклади environment-specific змінних:

- `Infra/environments/dev/terraform.tfvars.example`
- `Infra/terraform.tfvars.example`

## Продакшен-топологія

У продакшені потік виглядає так:

- користувачі відкривають frontend з Azure Static Web Apps
- frontend звертається до backend API в Azure Container Apps
- backend використовує PostgreSQL як основну БД
- backend опціонально використовує Redis для кешу та output cache
- backend зберігає файли в Azure Blob Storage
- backend може використовувати Azure Document Intelligence або Mistral для OCR

## Корисні шляхи

- `Backend/ProzoroBanka.slnx`
- `Backend/src/ProzoroBanka.API`
- `Frontend/package.json`
- `docker-compose.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `Infra/`


# ProzoroBanka


-ProzoroBanka is a full-stack platform for transparent fundraising by volunteer initiatives and organizations. The repository contains
-

-- `Backend/`: ASP.NET Core Web API on .NET 10 with Clean Architecture layers (`API`, `Application`, `Domain`, `Infrastructure`)
-- `Frontend/`: React 19 + Vite client application
-- `Infra/`: Terraform for Azure infrastructure and deployment wiring
-

-The application supports public campaign pages, organization profiles, invitations and team management, admin flows, file uploads, OCR integration, Monobank-related flows, and public transparency pages
-

-## Architecture
-

-### Backend
-

-- ASP.NET Core API with JWT authentication
-- Entity Framework Core + PostgreSQL
-- ASP.NET Identity for users and roles
-- MediatR-style application layer structure with commands/queries
-- Local or cloud file storage providers
-- Optional Redis for caching and output cache
-- Automatic database migration on startup
-- Automatic seed of roles and admin user on startup
-

-### Frontend
-

-- React 19 + TypeScript + Vite
-- React Router
-- TanStack Query for server state
-- Zustand for auth/workspace state
-- Tailwind CSS v4 and Radix UI primitives
-- Playwright E2E tests and prerender/sitemap scripts
-

-### Infrastructure
-

-Terraform in `Infra/` manages Azure resources for hosting
-

-- Azure Resource Group
-- Azure Container Apps Environment
-- Azure Container App for the backend API
-- Azure Static Web App for the frontend
-- Azure Blob Storage for uploaded files
-- Optional Azure Document Intelligence resource for OCR
-

-Important: PostgreSQL and Redis are not provisioned by Terraform in this repo. Their connection strings are injected as secrets/variables during deploy
-

-## Prerequisites
-

-For local development without Docker
-

-- .NET SDK `10.0.x`
-- Node.js `22.x`
-- npm
-- PostgreSQL `17+` or a compatible local instance
-- Docker Desktop if you want to start the database quickly through Compose
-

-For the quickest full local stack
-

-- Docker Desktop with `docker compose`
-

-## Local Development
-

-There are two practical ways to run the project locally
-

-### Option 1: Full stack with Docker Compose
-

-This is the fastest way to get backend, frontend, PostgreSQL, and Redis running together
-

-```powershell
-docker compose up --build
-```
-

-Services
-

-- Frontend: `http://localhost:3000`
-- API: `http://localhost:5000`
-- PostgreSQL: `localhost:5432`
-- Redis: `localhost:6379`
-

-What Compose does
-

-- starts PostgreSQL with database `prozoro_banka_dev`
-- starts Redis
-- builds and runs the backend in `Development`
-- builds and runs the frontend with the API URL baked in
-

-The backend container auto-applies EF Core migrations on startup and seeds roles and an admin user
-

-Default local admin seed from development config
-

-- email: `admin@example.com`
-- password: `Qwerty-1`
-

-If you want to stop and remove containers
-

-```powershell
-docker compose down
-```
-

-If you also want to remove persisted database volumes
-

-```powershell
-docker compose down -v
-```
-

-### Option 2: Local backend + local frontend, only DB in Docker
-

-This is the best mode for day-to-day development when you want hot reload in both apps and only need the database container
-

-Start PostgreSQL only
-

-```powershell
-docker compose up -d postgres
-```
-

-Redis is optional. If you want it too
-

-```powershell
-docker compose up -d postgres redis
-```
-

-#### Backend
-

-The API project is `Backend/src/ProzoroBanka.API`
-

-From the repo root
-

-```powershell
-dotnet restore Backend/ProzoroBanka.slnx
-dotnet run --project Backend/src/ProzoroBanka.API
-```
-

-Default local backend URLs from `launchSettings.json`
-

-- `http://localhost:5188`
-- `https://localhost:7038`
-

-OpenAPI/Scalar is available in development at
-

-- `http://localhost:5188/scalar`
-

-The backend applies migrations automatically on startup
-

-#### Backend config for minimum setup
-

-Minimum required dependency is PostgreSQL. Redis can be disabled
-

-Recommended PowerShell overrides for a clean local setup without Redis
-

-```powershell
-$env:ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=prozoro_banka_dev;Username=postgres;Password=123456"
-$env:Redis__Enabled="false"
-$env:Storage__Provider="Local"
-$env:Ocr__Provider="fallback"
-dotnet run --project Backend/src/ProzoroBanka.API
-```
-

-Notes
-

-- with `Redis__Enabled=false`, the app falls back to in-memory cache
-- `Storage__Provider=Local` stores uploads under `wwwroot/uploads`
-- `Ocr__Provider=fallback` avoids requiring cloud OCR credentials for local work
-

-Optional integrations that can stay unset locally
-

-- Google OAuth
-- Cloudflare Turnstile
-- SMTP credentials
-- Azure/Mistral OCR credentials
-- Redis connection string
-

-Do not commit real secrets into `appsettings.*` files. Prefer environment variables or local user secrets
-

-#### Frontend
-

-The frontend lives in `Frontend/`
-

-```powershell
-Set-Location Frontend
-$env:VITE_API_URL="http://localhost:5188"
-npm ci
-npm run dev
-```
-

-The dev server runs at
-

-- `http://localhost:5173`
-

-Useful frontend env vars
-

-- `VITE_API_URL`: backend base URL
-- `VITE_SITE_URL`: canonical site URL for sitemap/SEO builds
-- `VITE_TURNSTILE_SITE_KEY`: optional Turnstile site key
-- `VITE_GOOGLE_CLIENT_ID`: optional Google auth client id
-- `VITE_GA_MEASUREMENT_ID`: optional Google Analytics id
-

-### Recommended local workflow
-

-For most development tasks
-

-1. Start PostgreSQL with Docker.
-2. Run backend locally from `Backend/src/ProzoroBanka.API`.
-3. Run frontend locally from `Frontend/`.
-4. Enable Redis only if you are working on caching behavior
-

-This keeps feedback loops fast while still matching production dependencies closely enough for normal feature work
-

-## Testing
-

-### Backend
-

-```powershell
-dotnet test Backend/ProzoroBanka.slnx
-```
-

-### Frontend lint/build
-

-```powershell
-Set-Location Frontend
-npm ci
-npm run lint
-npm run build
-```
-

-### Playwright E2E
-

-```powershell
-Set-Location Frontend
-npx playwright install
-npm run test:e2e
-```
-

-There is also a helper script for bringing up the full containerized stack for tests
-

-- `scripts/start-test-containers.sh`
-

-## Deploy
-

-Deployment is driven by GitHub Actions in `.github/workflows/`
-

-### CI
-

-`ci.yml` runs
-

-- backend restore/build/test
-- frontend install/lint/build
-- Terraform formatting and validation
-- Playwright E2E tests
-

-### Main deploy pipeline
-

-`deploy.yml` is the main Azure deployment workflow
-

-High-level flow
-

-1. Build backend Docker image from `Backend/Dockerfile`.
-2. Push the image to GitHub Container Registry (`ghcr.io`).
-3. Log in to Azure.
-4. Run `terraform init/plan/apply` from `Infra/`.
-5. Provision or update Azure resources.
-6. Read Terraform outputs such as the API base URL and Static Web App name.
-7. Build the frontend with production URLs and SEO env vars.
-8. Generate sitemap and prerender static pages.
-9. Deploy `Frontend/dist` to Azure Static Web Apps
-

-Triggers
-

-- push to `main`
-- manual `workflow_dispatch`
-- a successful CI workflow run in the configured path
-

-### Frontend-only rebuild
-

-`frontend-rebuild.yml` exists for rebuilding and redeploying only the frontend when backend infrastructure is already in place
-

-It can resolve config either from
-

-- GitHub secrets/variables
-- Terraform remote state outputs
-

-## Infra
-

-Terraform root is `Infra/`
-

-Main files
-

-- `providers.tf`: Terraform and AzureRM provider configuration
-- `rg.tf`: resource group
-- `env.tf`: Azure Container Apps environment
-- `apps.tf`: backend container app and its secrets/env wiring
-- `static_web_app.tf`: frontend hosting
-- `storage.tf`: blob storage for uploads
-- `ocr.tf`: optional Azure OCR resource
-- `variables.tf`: deploy-time configuration
-- `outputs.tf`: values consumed by CI/CD and manual operations
-

-### What infrastructure is created
-

-- backend runtime on Azure Container Apps
-- frontend hosting on Azure Static Web Apps
-- blob storage for uploaded files
-- optional custom domains for frontend and API
-- optional managed certificate flow handled by Azure after DNS validation
-

-### What must be provided from outside
-

-- PostgreSQL connection string
-- Redis connection string, if enabled
-- JWT secrets
-- encryption key
-- SMTP credentials
-- Google OAuth credentials
-- Turnstile secret
-- OCR credentials, unless Terraform creates the Azure OCR resource
-- GHCR pull credentials for Azure Container Apps
-

-### Terraform state
-

-Terraform uses an Azure Storage backend. Example backend configs exist here
-

-- `Infra/environments/dev/backend.hcl.example`
-- `Infra/environments/prod/backend.hcl.example`
-

-Environment examples also exist for Terraform variables
-

-- `Infra/environments/dev/terraform.tfvars.example`
-- `Infra/terraform.tfvars.example`
-

-## Production topology
-

-The production topology is effectively
-

-- users open the frontend from Azure Static Web Apps
-- frontend calls the backend API on Azure Container Apps
-- backend uses PostgreSQL for primary data
-- backend optionally uses Redis for cache/output cache
-- backend stores uploaded files in Azure Blob Storage
-- backend may use Azure Document Intelligence or Mistral for OCR
-

-## Useful paths
-

-- `Backend/ProzoroBanka.slnx`
-- `Backend/src/ProzoroBanka.API`
-- `Frontend/package.json`
-- `docker-compose.yml`
-- `.github/workflows/ci.yml`
-- `.github/workflows/deploy.yml`
-- `Infra/`
