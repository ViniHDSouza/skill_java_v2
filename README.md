# skill_java_v2

Coleção de **64 skills** para desenvolvimento backend **Java / Spring Boot** (serviços BFF em
arquitetura em camadas), prontas para instalar em qualquer agente de código — Claude Code, Cursor,
GitHub Copilot, Cline, Continue, Codex, OpenCode, Devin.

As regras do projeto e o índice completo das skills estão em **[AGENTS.md](AGENTS.md)**.

## Instalação

A instalação usa a CLI [`skills`](https://github.com/vercel-labs/skills) (`npx`, não precisa
instalar nada permanente). **Pré-requisito: Node.js** (18+).

> ℹ️ O nome do branch (`feature/instalador`) contém uma barra, então é preciso usar a forma de
> _git ref_ com `#` — `repo#branch` — e **não** a URL `.../tree/<branch>`.

### Instalar todas as skills

```bash
# escopo do projeto (grava em ./.claude/skills) — padrão
npx skills add "ViniHDSouza/skill_java_v2#feature/instalador" --skill '*'

# escopo global, para todos os seus projetos (grava em ~/.claude/skills)
npx skills add "ViniHDSouza/skill_java_v2#feature/instalador" --skill '*' -g
```

Sem `--skill`, a CLI abre um seletor interativo para você escolher quais instalar:

```bash
npx skills add "ViniHDSouza/skill_java_v2#feature/instalador"
```

### Instalar uma skill específica

```bash
npx skills add "ViniHDSouza/skill_java_v2#feature/instalador" --skill hexagonal-architecture
```

`--skill` pode ser repetido para instalar várias de uma vez — por exemplo, por área:

```bash
# Java + Spring Boot
npx skills add "ViniHDSouza/skill_java_v2#feature/instalador" \
  --skill java-fundamentals --skill java21-virtual-threads \
  --skill java-spring-boot --skill hexagonal-architecture --skill spring-boot-security-jwt

# Mensageria
npx skills add "ViniHDSouza/skill_java_v2#feature/instalador" \
  --skill kafka-production-patterns --skill rabbitmq-production

# Dados e cache (MongoDB / Redis)
npx skills add "ViniHDSouza/skill_java_v2#feature/instalador" \
  --skill mongodb-schema-design --skill mongodb-query-optimizer \
  --skill redis-core --skill redis-vector-search

# Cloud e infraestrutura
npx skills add "ViniHDSouza/skill_java_v2#feature/instalador" \
  --skill kubernetes-specialist --skill argocd-expert --skill java-docker \
  --skill azure-diagnostics

# Testes
npx skills add "ViniHDSouza/skill_java_v2#feature/instalador" \
  --skill java-testing --skill java-testing-advanced --skill tdd --skill testing-boss
```

### Ver o que existe antes de instalar

```bash
npx skills add "ViniHDSouza/skill_java_v2#feature/instalador" --list
```

### Opções úteis

| Flag | Efeito |
|------|--------|
| `-g`, `--global` | Instala em `~/.claude/skills` (todos os projetos) em vez do projeto atual. |
| `-a`, `--agent <agentes>` | Instala para agentes específicos (use `'*'` para todos). Por padrão detecta o agente em uso. |
| `-s`, `--skill <skills>` | Quais skills instalar (use `'*'` para todas). |
| `--copy` | Copia os arquivos em vez de criar symlinks. |
| `-l`, `--list` | Lista as skills do repositório sem instalar. |
| `-y`, `--yes` | Pula as confirmações. |
| `--all` | Atalho para `--skill '*' --agent '*' -y`. |

Gerenciamento depois de instalado: `npx skills list`, `npx skills update`, `npx skills remove`.

> ℹ️ **Por que "VS Code" e "GitHub Copilot" podem não aparecer no menu interativo?**
> O CLI `skills` **não tem um alvo "VS Code"** — o VS Code consome skills através do GitHub Copilot.
> E o **GitHub Copilot** é um agente *universal*: ele é instalado em `.agents/skills` e aparece na
> seção travada **"Universal (.agents/skills)"** do menu (ou só como item próprio se existir a pasta
> `~/.copilot` na sua máquina). Para garantir, use `-a github-copilot` (abaixo) ou `--agent '*'`.

### GitHub Copilot (CLI)

```bash
# escopo do projeto — grava em ./.agents/skills (lido pelo Copilot e demais agentes universais)
npx skills add "ViniHDSouza/skill_java_v2#feature/instalador" -a github-copilot --skill '*'

# escopo global — grava em ~/.copilot/skills
npx skills add "ViniHDSouza/skill_java_v2#feature/instalador" -a github-copilot --skill '*' -g
```

O Copilot também é incluído ao usar `--agent '*'` (todos os agentes).

### VS Code / GitHub Copilot (instruções do projeto)

O **VS Code não é um alvo do `npx skills`** (`-a vscode` retorna "Invalid agents"). No VS Code, as
skills são consumidas como *custom instructions* do GitHub Copilot. Este repositório já gera esses
artefatos:

- `.github/copilot-instructions.md` — instruções globais (base do [AGENTS.md](AGENTS.md)).
- `.github/instructions/<skill>.md` — uma instrução por skill (64 arquivos).
- `.vscode/settings.json` — liga esses arquivos ao Copilot Chat
  (`github.copilot.chat.codeGeneration/reviewSelection/testGeneration.instructions`).
- `.vscode/extensions.json` — extensões recomendadas.

Para usar em **outro projeto**, copie do repositório as pastas `.github/` e `.vscode/` (ou só os
arquivos das skills desejadas em `.github/instructions/`). Depois de mudar/adicionar skills,
regenere com:

```bash
node scripts/generate-agents.mjs   # AGENTS.md + .github/copilot-instructions.md
node scripts/sync-skills.mjs       # .github/instructions/, .cursor/rules/, .claude/, …
```

### Instalação manual (sem a CLI)

Cada skill é uma pasta com um `SKILL.md`. Basta copiar para o diretório de skills do seu agente:

```bash
# uma skill, no escopo global do Claude Code
cp -r skills/hexagonal-architecture ~/.claude/skills/hexagonal-architecture
```

## Skills disponíveis

São 64 skills cobrindo Java 21, Spring Boot 3.x, JPA/Hibernate, Kafka, RabbitMQ, MongoDB, Redis,
Kubernetes, ArgoCD, Azure, testes (JUnit/Mockito/Testcontainers/Playwright), arquitetura
(hexagonal, microsserviços, DDD), segurança e autoria de skills.

A lista completa, com a descrição de cada uma, está na tabela de **[AGENTS.md](AGENTS.md#skills-disponíveis)**.

---

> Quando este branch for integrado à `main` (branch padrão do repositório), o sufixo
> `#feature/instalador` pode ser omitido:
> `npx skills add ViniHDSouza/skill_java_v2 --skill '*'`.
