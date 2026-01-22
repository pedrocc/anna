# Adicionando Nova Técnica de Brainstorming

Guia para adicionar uma nova técnica ao módulo de brainstorming da Anna.

## Arquitetura

O sistema usa uma **fonte única de verdade** (`TECHNIQUE_IDS`) que propaga para:

```
TECHNIQUE_IDS (shared schema)
    ├── BrainstormTechniqueSchema (validação Zod)
    ├── BrainstormTechnique type (TypeScript)
    ├── brainstormTechniqueEnum (PostgreSQL via Drizzle)
    ├── TECHNIQUES record (metadados UI)
    └── TECHNIQUE_PROMPTS (prompts LLM)
```

## Arquivos a Modificar

| # | Arquivo | O que adicionar |
|---|---------|-----------------|
| 1 | `packages/shared/src/schemas/brainstorm.schema.ts` | ID no array `TECHNIQUE_IDS` |
| 2 | `packages/shared/src/constants/techniques.ts` | Metadados no record `TECHNIQUES` |
| 3 | `apps/api/src/lib/brainstorm-prompts.ts` | Prompt em `TECHNIQUE_PROMPTS` + nome em `buildDocumentPrompt` |
| 4 | Migration PostgreSQL (gerada) | Enum atualizado via `bun db:generate` |

## Passo a Passo

### 1. Adicionar ID ao Schema Compartilhado

**Arquivo:** `packages/shared/src/schemas/brainstorm.schema.ts`

Adicione o novo ID ao array `TECHNIQUE_IDS`:

```typescript
export const TECHNIQUE_IDS = [
  'scamper',
  'what_if',
  'six_hats',
  'five_whys',
  'mind_mapping',
  'analogical',
  'first_principles',
  'yes_and',
  'future_self',
  'reversal',
  'nova_tecnica',  // <-- adicionar aqui
] as const
```

O tipo `BrainstormTechnique` e o schema Zod são derivados automaticamente deste array.

### 2. Adicionar Metadados da Técnica

**Arquivo:** `packages/shared/src/constants/techniques.ts`

Adicione entrada no record `TECHNIQUES`:

```typescript
nova_tecnica: {
  id: 'nova_tecnica',
  name: 'Nome da Técnica',
  description: 'Descrição curta da técnica em português',
  icon: 'IconName',  // Nome do ícone Lucide React
  estimatedMinutes: 15,
},
```

**Campos:**
- `id`: Deve corresponder exatamente ao valor em `TECHNIQUE_IDS`
- `name`: Nome de exibição na UI (pt-BR)
- `description`: Texto descritivo para seleção de técnica (pt-BR)
- `icon`: Nome de componente do [Lucide React](https://lucide.dev/icons/)
- `estimatedMinutes`: Duração estimada da aplicação da técnica

### 3. Adicionar Prompt da Técnica

**Arquivo:** `apps/api/src/lib/brainstorm-prompts.ts`

#### 3a. Adicionar ao `TECHNIQUE_PROMPTS`:

```typescript
nova_tecnica: `Texto introdutório da técnica em português brasileiro.

- Instruções ou lentes para explorar
- Perguntas provocativas

Qual aspecto você gostaria de explorar primeiro?`,
```

**Diretrizes do prompt:**
- Escrito em português brasileiro
- Explica brevemente a metodologia
- Lista passos ou lentes para explorar
- Termina com uma pergunta aberta para iniciar interação
- Sem acentos nos prompts internos (padrão existente)

#### 3b. Adicionar ao mapa `names` em `buildDocumentPrompt`:

Dentro da função `buildDocumentPrompt`, adicione ao record `names`:

```typescript
const names: Record<string, string> = {
  // ... existentes ...
  nova_tecnica: 'Nome da Técnica',
}
```

### 4. Gerar e Aplicar Migration

```bash
bun db:generate
bun db:migrate
```

Isso atualiza o enum `brainstorm_technique` no PostgreSQL automaticamente, pois `brainstormTechniqueEnum` é derivado de `TECHNIQUE_IDS`:

```typescript
// packages/db/src/schema/brainstorm.ts (não precisa editar)
export const brainstormTechniqueEnum = pgEnum('brainstorm_technique', TECHNIQUE_IDS)
```

### 5. Verificar

```bash
# Testes de sincronia enum ↔ TECHNIQUE_IDS
bun test packages/db/src/schema/brainstorm.test.ts

# Typecheck (garante que TECHNIQUES tem todas as chaves)
bun typecheck

# Lint
bun lint
```

## Checklist

- [ ] ID adicionado em `TECHNIQUE_IDS` (`brainstorm.schema.ts`)
- [ ] Metadados adicionados em `TECHNIQUES` (`techniques.ts`)
- [ ] Prompt adicionado em `TECHNIQUE_PROMPTS` (`brainstorm-prompts.ts`)
- [ ] Nome adicionado no `names` de `buildDocumentPrompt` (`brainstorm-prompts.ts`)
- [ ] Migration gerada e aplicada (`bun db:generate && bun db:migrate`)
- [ ] `bun test` passa
- [ ] `bun typecheck` passa
- [ ] `bun lint` passa

## Validações Automáticas

O sistema possui proteções que detectam inconsistências:

1. **TypeScript**: `TECHNIQUES` é tipado como `Record<BrainstormTechnique, TechniqueInfo>` - erro de compilação se faltar uma chave
2. **TypeScript**: `TECHNIQUE_PROMPTS` é tipado como `Record<BrainstormTechnique, string>` - erro de compilação se faltar um prompt
3. **Teste unitário**: `brainstorm.test.ts` valida que o enum do banco corresponde a `TECHNIQUE_IDS`
4. **Zod**: `BrainstormTechniqueSchema` rejeita valores que não estejam em `TECHNIQUE_IDS`
