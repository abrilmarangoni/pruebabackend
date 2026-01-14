# Contactship-Mini

Microservicio backend para gestión de leads construido con NestJS y TypeScript.

## Stack Tecnológico

- **NestJS** - Framework backend
- **TypeScript** - Lenguaje de programación
- **PostgreSQL (Supabase)** - Base de datos
- **Redis** - Cache y colas de trabajo
- **Bull** - Procesamiento de colas asíncrono
- **OpenAI** - Integración IA para resúmenes

## Requisitos Previos

- Node.js 18+
- npm o yarn
- Cuenta de Supabase (PostgreSQL)
- Redis (local o cloud como Upstash)
- API Key de OpenAI

## Instalación

### 1. Clonar e instalar dependencias

```bash
cd contactship-mini
npm install
```

### 2. Configurar variables de entorno

Crear archivo `.env` en la raíz del proyecto:

```env
# Database - Supabase PostgreSQL
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Redis
REDIS_URL=rediss://default:password@host.upstash.io:6379

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# API Security
API_KEY=your-secure-api-key-here

# App
PORT=3000
NODE_ENV=development
```

### 3. Configurar Supabase

La tabla `leads` se creará automáticamente al iniciar la app (synchronize: true en desarrollo).

Si prefieres crearla manualmente:

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "firstName" VARCHAR(100) NOT NULL,
  "lastName" VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  company VARCHAR(100),
  city VARCHAR(100),
  country VARCHAR(100),
  summary TEXT,
  "nextAction" TEXT,
  source VARCHAR(50) DEFAULT 'manual',
  "externalId" VARCHAR(255),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_leads_email ON leads(email);
```

### 4. Iniciar Redis (local con Docker)

```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

O usa un servicio cloud como [Upstash](https://upstash.com/) (tienen tier gratuito).

### 5. Ejecutar la aplicación

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod
```

## API Endpoints

Todos los endpoints requieren autenticación mediante API Key en el header:

```
x-api-key: your-api-key
```

### Leads

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/create-lead` | Crea un lead manualmente |
| GET | `/leads` | Lista todos los leads |
| GET | `/leads/:id` | Obtiene un lead por ID (con cache Redis) |
| POST | `/leads/:id/summarize` | Genera resumen con IA |

### Sincronización

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/sync/trigger` | Dispara sincronización manual |
| POST | `/sync/trigger?count=5` | Sincroniza N leads |

## Ejemplos de Uso

### Crear un lead

```bash
curl -X POST http://localhost:3000/create-lead \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan@example.com",
    "phone": "+54 11 1234-5678",
    "company": "Acme Corp",
    "city": "Buenos Aires",
    "country": "Argentina"
  }'
```

### Listar leads

```bash
curl http://localhost:3000/leads \
  -H "x-api-key: your-api-key"
```

### Obtener lead por ID

```bash
curl http://localhost:3000/leads/{id} \
  -H "x-api-key: your-api-key"
```

### Generar resumen con IA

```bash
curl -X POST http://localhost:3000/leads/{id}/summarize \
  -H "x-api-key: your-api-key"
```

### Sincronizar leads externos

```bash
curl -X POST "http://localhost:3000/sync/trigger?count=10" \
  -H "x-api-key: your-api-key"
```

## Arquitectura

```
src/
├── ai/                    # Módulo de integración con OpenAI
│   ├── ai.module.ts
│   └── ai.service.ts
├── auth/                  # Módulo de autenticación
│   ├── auth.module.ts
│   └── guards/
│       └── api-key.guard.ts
├── common/                # Utilidades compartidas
│   └── filters/
│       └── http-exception.filter.ts
├── leads/                 # Módulo principal de leads
│   ├── dto/
│   │   └── create-lead.dto.ts
│   ├── entities/
│   │   └── lead.entity.ts
│   ├── leads.controller.ts
│   ├── leads.module.ts
│   └── leads.service.ts
├── sync/                  # Módulo de sincronización
│   ├── sync.controller.ts
│   ├── sync.module.ts
│   ├── sync.processor.ts
│   └── sync.service.ts
├── app.module.ts
└── main.ts
```

## Características Implementadas

- CRUD de leads con validación de DTOs
- Cache Redis con TTL para detalle de leads
- Autenticación por API Key
- Colas de trabajo con Bull para procesos asíncronos
- CRON job para sincronización periódica (cada hora)
- Deduplicación por email y externalId
- Integración con OpenAI para resúmenes
- Manejo centralizado de errores
- Logs detallados

## Sincronización Automática

El sistema sincroniza leads desde [RandomUser API](https://randomuser.me) de forma automática:

- **Frecuencia**: Cada hora (configurable en `sync.service.ts`)
- **Cantidad**: 10 leads por ejecución
- **Deduplicación**: Por email y UUID externo

## Integración IA

El endpoint `/leads/:id/summarize` utiliza GPT-3.5-turbo para generar:

```json
{
  "summary": "Resumen del lead",
  "next_action": "Próxima acción recomendada"
}
```

Ambos campos se persisten en la base de datos asociados al lead.

## Licencia

MIT
