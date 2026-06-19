# Skill Backend

Repositorio centralizado de **48 skills** para AI coding assistants, focado em desenvolvimento Java/Spring Boot. As skills funcionam em **9 plataformas** simultaneamente: Claude Code, ChatGPT Codex, GitHub Copilot, Cursor, Cline, Continue, Devin, OpenCode e Agents.

## Pre-requisitos

- [Node.js](https://nodejs.org/) v18+ (inclui npm/npx)
- Git
- Bash (Git Bash no Windows)

## Inicio rapido

```bash
# Clonar o repositorio
git clone https://github.com/ViniHDSouza/skill_java_v2.git
cd skill_java_v2

# Restaurar todas as skills a partir do skills-lock.json
npx skills experimental_install

# Sincronizar para todas as plataformas (Codex, Copilot, Cursor, Cline, Continue)
bash scripts/sync-skills.sh
```

---

## Instalando TODAS as skills deste repositorio

Se voce quer instalar todas as 48 skills de uma vez em um novo projeto, ha 3 formas:

### Opcao 1: Restaurar do lock file (recomendado)

Se voce clonou este repositorio, todas as skills ja estao definidas no `skills-lock.json`. Basta restaurar:

```bash
npx skills experimental_install
bash scripts/sync-skills.sh
```

### Opcao 2: Instalar todas de cada fonte GitHub

Instale todas as skills de cada repositorio fonte usando `--skill '*'`:

```bash
# Java core (11 skills)
npx skills add pluginagentmarketplace/custom-plugin-java --skill '*'

# Testing, architecture, devops (9 skills)
npx skills add pedronauck/skills --skill '*'

# Spring Boot patterns (5 skills)
npx skills add giuseppe-trisciuoglio/developer-kit --skill '*'

# Architect, security, microservices (5 skills)
npx skills add jeffallan/claude-skills --skill '*'

# TDD, architecture, issues, PRD (4 skills)
npx skills add mattpocock/skills --skill '*'

# Azure (3 skills)
npx skills add microsoft/azure-skills --skill '*'

# Debugging, TDD, verification (3 skills)
npx skills add obra/superpowers --skill '*'

# Skill creator, webapp testing (2 skills)
npx skills add anthropics/skills --skill '*'

# Find skills (1 skill)
npx skills add vercel-labs/skills --skill find-skills

# Sincronizar para todas as plataformas
bash scripts/sync-skills.sh
```

### Opcao 3: Instalar este repositorio como fonte

Qualquer pessoa pode instalar todas as skills deste repositorio diretamente:

```bash
npx skills add https://github.com/ViniHDSouza/skill_java_v2 --skill '*'
```

---

## Instalando skills individuais

### Adicionar uma skill de um repositorio GitHub

```bash
npx skills add <owner/repo> --skill <nome-da-skill>
```

**Exemplos:**

```bash
# Instalar uma skill especifica
npx skills add https://github.com/vercel-labs/skills --skill find-skills

# Usando shorthand (owner/repo)
npx skills add pedronauck/skills --skill testing-boss

# Instalar TODAS as skills de um repositorio
npx skills add pluginagentmarketplace/custom-plugin-java --skill '*'

# Instalar para agentes especificos
npx skills add vercel-labs/skills --skill find-skills --agent claude-code cursor

# Instalar globalmente (nivel de usuario, disponivel em todos os projetos)
npx skills add vercel-labs/skills --skill find-skills -g
```

### O que acontece ao instalar

1. O CLI baixa o `SKILL.md` do repositorio GitHub
2. Instala os arquivos reais em `.agents/skills/<nome>/`
3. Cria symlinks em `.claude/skills/`, `.devin/skills/` e `skills/`
4. Atualiza `skills-lock.json` com o hash de integridade

### Sincronizar para todas as plataformas

Apos instalar uma skill, execute o sync para distribuir para as plataformas extras:

```bash
bash scripts/sync-skills.sh
```

Isso copia para `.codex/skills/` e regenera os arquivos nativos de cada plataforma (AGENTS.md, .cursorrules, copilot-instructions, etc.).

---

## Comandos do CLI

### `npx skills add` — Instalar skills

```bash
npx skills add <source> [opcoes]
```

| Opcao | Descricao |
|---|---|
| `--skill <nome>` ou `-s <nome>` | Nome(s) da skill a instalar. Use `'*'` para todas |
| `--agent <nome>` ou `-a <nome>` | Agente(s) alvo. Use `'*'` para todos |
| `--global` ou `-g` | Instalar globalmente (nivel de usuario) |

**Fontes aceitas:**

```bash
# GitHub shorthand
npx skills add owner/repo

# URL completa
npx skills add https://github.com/owner/repo

# Multiplas skills
npx skills add owner/repo --skill skill1 skill2 skill3
```

### `npx skills list` — Listar skills instaladas

```bash
# Skills do projeto
npx skills list

# Skills globais
npx skills list -g

# Filtrar por agente
npx skills list --agent claude-code

# Saida em JSON
npx skills list --json
```

### `npx skills remove` — Remover skills

```bash
# Remocao interativa (escolher da lista)
npx skills remove

# Remover por nome
npx skills remove find-skills

# Remover skill global
npx skills remove --global find-skills
```

### `npx skills find` — Buscar skills

```bash
# Busca interativa (fzf-style)
npx skills find

# Buscar por palavra-chave
npx skills find typescript
npx skills find spring-boot
npx skills find testing
```

### `npx skills update` — Atualizar skills

```bash
# Atualizar todas
npx skills update

# Atualizar uma skill especifica
npx skills update testing-boss

# Atualizar apenas globais
npx skills update -g

# Atualizar apenas do projeto
npx skills update -p
```

### `npx skills init` — Criar uma nova skill

```bash
# Criar uma skill em um novo diretorio
npx skills init minha-skill

# Criar SKILL.md no diretorio atual
npx skills init
```

### `npx skills experimental_install` — Restaurar do lock file

```bash
# Reinstalar todas as skills a partir do skills-lock.json
npx skills experimental_install
```

### `npx skills use` — Usar sem instalar

```bash
# Gerar prompt para usar uma skill sem instalar
npx skills use vercel-labs/skills@find-skills | claude
```

---

## Sincronizacao e regeneracao

### `bash scripts/sync-skills.sh`

Distribui skills de `.agents/skills/` (fonte primaria) para todas as plataformas:

```bash
# Sync completo + regenerar todos os configs
bash scripts/sync-skills.sh

# Apenas copiar, sem regenerar
bash scripts/sync-skills.sh --skip-regenerate

# Sincronizar apenas para uma plataforma
bash scripts/sync-skills.sh --platform codex
```

### `bash scripts/regenerate-configs.sh`

Regenera os arquivos nativos de cada plataforma a partir das skills em `.agents/skills/`:

```bash
# Regenerar tudo
bash scripts/regenerate-configs.sh

# Regenerar apenas para uma plataforma
bash scripts/regenerate-configs.sh --platform copilot
bash scripts/regenerate-configs.sh --platform cursor
bash scripts/regenerate-configs.sh --platform cline
```

---

## Fluxo de trabalho completo

```
1. Instalar a skill
   npx skills add <repo> --skill <nome>

2. Sincronizar para todas as plataformas
   bash scripts/sync-skills.sh

3. Verificar
   npx skills list

4. Commitar
   git add -A && git commit -m "Add skill: <nome>"
```

---

## Estrutura do projeto

```
skill_backend/
├── .agents/skills/          # Fonte primaria (48 skills, arquivos reais)
├── .claude/skills/          # Claude Code (symlinks do CLI)
├── .codex/skills/           # ChatGPT Codex (copias via sync)
├── .devin/skills/           # Devin (symlinks do CLI)
├── .opencode/skills/        # OpenCode (5 skills customizadas)
│
├── .github/
│   ├── copilot-instructions.md   # GitHub Copilot (consolidado)
│   └── instructions/             # GitHub Copilot (modular, 48 arquivos)
│
├── .cursor/rules/           # Cursor (48 arquivos .mdc)
├── .vscode/
│   ├── settings.json        # Config Copilot para VS Code
│   └── extensions.json      # Extensoes recomendadas
│
├── skills/                  # Referencia (symlinks para .agents/)
├── scripts/
│   ├── sync-skills.sh       # Sincronizar skills entre plataformas
│   └── regenerate-configs.sh # Regenerar arquivos nativos
│
├── AGENTS.md                # ChatGPT Codex (concatenado, auto-gerado)
├── .cursorrules             # Cursor legacy (concatenado, auto-gerado)
├── .clinerules              # Cline (concatenado, auto-gerado)
├── .continuerules           # Continue (concatenado, auto-gerado)
├── .skills.json             # Config do projeto para o CLI
├── skills-lock.json         # Lock file (hashes de integridade)
├── package.json             # Dependencia do CLI + npm scripts
└── README.md
```

### Arquivos auto-gerados (nao editar manualmente)

Estes arquivos sao regenerados pelo script `regenerate-configs.sh`:

- `AGENTS.md` — Todas as skills concatenadas para o Codex
- `.github/copilot-instructions.md` — Todas as skills para o Copilot
- `.github/instructions/*.md` — Uma por skill, com frontmatter `applyWhen`
- `.cursor/rules/*.mdc` — Uma por skill, com frontmatter Cursor
- `.cursorrules` — Fallback legacy para Cursor
- `.clinerules` — Todas as skills para o Cline
- `.continuerules` — Todas as skills para o Continue

---

## Plataformas suportadas

| Plataforma | Diretorio/Arquivo | Formato |
|---|---|---|
| Claude Code | `.claude/skills/*/SKILL.md` | SASMP 1.3.0 |
| ChatGPT Codex | `.codex/skills/` + `AGENTS.md` | SKILL.md + Markdown |
| GitHub Copilot | `.github/instructions/*.md` | Markdown com `applyWhen` |
| Cursor | `.cursor/rules/*.mdc` | MDC com frontmatter |
| Cline | `.clinerules` | Markdown consolidado |
| Continue | `.continuerules` | Markdown consolidado |
| Devin | `.devin/skills/*/SKILL.md` | SASMP 1.3.0 |
| OpenCode | `.opencode/skills/*/SKILL.md` | SASMP 1.3.0 |
| Agents | `.agents/skills/*/SKILL.md` | SASMP 1.3.0 (fonte primaria) |

---

## Skills instaladas

### Java/Spring Boot (22 skills)

| Skill | Descricao |
|---|---|
| `java-fundamentals` | Core Java — syntax, OOP, collections, streams, exceptions |
| `java-spring-boot` | Spring Boot 3.x — REST APIs, Security, Data, Actuator |
| `java-concurrency` | Threads, executors, locks, CompletableFuture, virtual threads |
| `java-docker` | Containerizacao Java — Dockerfile, JVM settings, security |
| `java-gradle` | Gradle Kotlin DSL, tasks, build optimization, caching |
| `java-maven` | Maven POM, plugins, lifecycle, dependency management |
| `java-jpa-hibernate` | Entity design, queries, transactions, performance |
| `java-performance` | JVM tuning — GC, profiling, memory analysis, benchmarks |
| `java-testing` | JUnit 5, Mockito, Spring Test, Testcontainers |
| `java-testing-advanced` | Contract testing, mutation testing, property-based |
| `java-microservices` | Spring Cloud, service mesh, event-driven, resilience |
| `java-architect` | Enterprise Java architecture, Spring Boot 3.x, microservices |
| `java21-virtual-threads` | Java 21 LTS — Virtual Threads, Records, Pattern Matching |
| `spring-boot-crud-patterns` | CRUD patterns com Spring Boot |
| `spring-boot-engineer` | Spring Boot engineering best practices |
| `spring-boot-event-driven-patterns` | Event-driven patterns com Spring |
| `spring-boot-saga-pattern` | Saga pattern para microservices |
| `spring-boot-security-jwt` | Spring Security com JWT |
| `hexagonal-architecture` | Ports & Adapters em Java 17/21 + Spring Boot |
| `kafka-production-patterns` | Apache Kafka production-grade em Java/Spring |
| `rabbitmq-production` | RabbitMQ production configurations |
| `microservices-review` | Code review para microservices |

### Testing & Quality (7 skills)

| Skill | Descricao |
|---|---|
| `tdd` | Test-Driven Development |
| `test-driven-development` | TDD workflow completo |
| `testing-boss` | Doutrina completa de testing — patterns, anti-patterns, AI evals |
| `webapp-testing` | Testing de web applications |
| `unit-test-caching` | Testes unitarios com caching |
| `verification-before-completion` | Verificar antes de marcar como concluido |
| `refactoring-analysis` | Analise de refactoring |

### Architecture & DevOps (9 skills)

| Skill | Descricao |
|---|---|
| `architectural-analysis` | Auditoria arquitetural — dead code, anti-patterns |
| `improve-codebase-architecture` | Scan e melhoria de arquitetura |
| `microservices-architect` | Arquitetura de microservices |
| `argocd-expert` | ArgoCD GitOps deployment |
| `kubernetes-specialist` | Kubernetes specialist |
| `devops-engineer` | Dockerfiles, CI/CD, K8s manifests, Terraform |
| `chaos-engineer` | Chaos experiments, failure injection |
| `azure-diagnostics` | Debug Azure production issues |
| `azure-messaging` | Azure Event Hubs e Service Bus |
| `azure-reliability` | Reliability para Azure PaaS |

### Code Quality & Utilities (6 skills)

| Skill | Descricao |
|---|---|
| `secure-code-guardian` | OWASP Top 10, authentication, input validation |
| `no-workarounds` | Root-cause fixes, nada de workarounds |
| `systematic-debugging` | Debugging sistematico |
| `git-rebase` | Git rebase e resolucao de merge conflicts |
| `skill-creator` | Criar e otimizar skills |
| `skill-best-practices` | Authoring de skills no padrao agentskills.io |

### Discovery (1 skill)

| Skill | Descricao |
|---|---|
| `find-skills` | Descobrir e instalar novas skills |

---

## Fontes de skills

As skills sao sourced de multiplos repositorios GitHub:

| Repositorio | Skills |
|---|---|
| `pluginagentmarketplace/custom-plugin-java` | 11 skills Java core |
| `pedronauck/skills` | 9 skills (testing, architecture, devops) |
| `giuseppe-trisciuoglio/developer-kit` | 5 skills Spring Boot patterns |
| `jeffallan/claude-skills` | 5 skills (architect, security, microservices) |
| `mattpocock/skills` | 4 skills (tdd, architecture, issues, prd) |
| `microsoft/azure-skills` | 3 skills Azure |
| `obra/superpowers` | 3 skills (debugging, TDD, verification) |
| `anthropics/skills` | 2 skills (skill-creator, webapp-testing) |
| `vercel-labs/skills` | 1 skill (find-skills) |

---

## npm scripts

```bash
# Atalhos via npm run
npm run skills:add -- <repo> --skill <nome>
npm run skills:list
npm run skills:update
npm run skills:sync          # bash scripts/sync-skills.sh
npm run skills:regenerate    # bash scripts/regenerate-configs.sh
```

---

## Formato SKILL.md

Cada skill segue o padrao **SASMP 1.3.0** (agentskills.io):

```markdown
---
name: java-spring-boot
description: Build production Spring Boot applications
sasmp_version: "1.3.0"
version: "3.0.0"
bonded_agent: 03-java-spring
bond_type: PRIMARY_BOND
allowed-tools: Read, Write, Bash, Glob, Grep
parameters:
  spring_version:
    type: string
    default: "3.2"
---

# Java Spring Boot Skill

[conteudo da skill...]
```

### Estrutura de uma skill

```
skill-name/
├── SKILL.md              # Definicao principal (obrigatorio)
├── assets/
│   ├── config.yaml       # Configuracao
│   └── schema.json       # JSON Schema de validacao
├── references/
│   ├── GUIDE.md          # Guia detalhado
│   └── PATTERNS.md       # Padroes e exemplos
└── scripts/
    └── validate.py       # Script de validacao
```

---

## Referências

- [skills.sh](https://skills.sh/) — Marketplace de skills
- [agentskills.io](https://agentskills.io/) — Especificacao SASMP
- [vercel-labs/skills](https://github.com/vercel-labs/skills) — CLI open-source
- [Vercel Agent Skills Docs](https://vercel.com/docs/agent-resources/skills)
