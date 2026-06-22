#!/usr/bin/env node
/**
 * generate-agents.mjs
 * Gera um AGENTS.md conciso: documento-guia que referencia a regra obrigatória
 * folder-structure, o fluxo de trabalho (create/execute) e indexa as skills
 * (apontando para os arquivos, sem inline).
 * Fonte das descrições das skills: skills/<nome>/SKILL.md (verbatim, só truncado).
 * Usage: node scripts/generate-agents.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');

// --- Frontmatter / description extraction ---

function splitFrontmatter(content) {
  const norm = content.replace(/\r\n/g, '\n');
  if (!norm.startsWith('---\n')) return { fm: '', body: norm };
  const end = norm.indexOf('\n---\n', 4);
  if (end === -1) return { fm: '', body: norm };
  return { fm: norm.slice(4, end), body: norm.slice(end + 5) };
}

function extractDescription(fm) {
  const block = fm.match(/^description:\s*[>|][^\n]*\n((?:[ \t]+.*\n?)+)/m);
  if (block) {
    return block[1].split('\n').map(l => l.trim()).filter(Boolean).join(' ');
  }
  const inline = fm.match(/^description:\s*(.+)$/m);
  if (!inline) return '';
  let v = inline[1].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v.trim();
}

function shortDesc(desc) {
  let d = desc.replace(/\s+/g, ' ').trim();
  const dot = d.indexOf('. ');
  if (dot !== -1 && dot < 200) d = d.slice(0, dot + 1);
  if (d.length > 160) {
    const cut = d.slice(0, 160);
    const sp = cut.lastIndexOf(' ');
    d = (sp > 80 ? cut.slice(0, sp) : cut).replace(/[.,;:]+$/, '') + '…';
  }
  return d.replace(/\|/g, '\\|');
}

function descOf(skillMdPath) {
  const raw = fs.readFileSync(skillMdPath, 'utf8');
  return shortDesc(extractDescription(splitFrontmatter(raw).fm));
}

// --- Coleta de skills ---

const skills = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name)
  .filter(name => fs.existsSync(path.join(SKILLS_DIR, name, 'SKILL.md')))
  .sort((a, b) => a.localeCompare(b));

const skillRows = skills.map(name =>
  '| `' + name + '` | ' + descOf(path.join(SKILLS_DIR, name, 'SKILL.md')) +
  ' | [skills/' + name + '/SKILL.md](skills/' + name + '/SKILL.md) |');

// --- Montagem do documento (linhas em aspas duplas: backticks são literais) ---

const L = [
  "# AGENTS.md",
  "",
  "Coleção **reutilizável** de skills e regras para desenvolvimento de software, aplicável a **qualquer tipo de projeto**. O perfil principal é **backend Java / Spring Boot** (Maven) — serviços BFF (Backend for Frontend) em arquitetura em camadas —, mas boa parte das skills (specs, prompts, testes, arquitetura, DevOps, segurança, dados) é transversal e serve a outras linguagens e stacks.",
  "",
  "Este é o ponto de entrada para agentes e contribuidores em qualquer projeto que adote estas skills. Aplique as regras ao **criar, manter, reorganizar ou revisar** código — as regras obrigatórias e os comandos abaixo valem para o perfil **Java / Spring Boot**; em outras stacks, use as skills transversais aplicáveis. **Não duplique aqui o conteúdo das skills/regras** — consulte os arquivos referenciados.",
  "",
  "> **Base compartilhada.** Este arquivo é a fonte única de instruções, usada por Claude Code (via `CLAUDE.md`), Codex, OpenCode, GitHub Copilot (via `.github/copilot-instructions.md`) e VS Code. Regenere os pontos de entrada com `node scripts/generate-agents.mjs`.",
  "",
  "## Stack (coberto pelas skills)",
  "",
  "| Camada | Tecnologias | Skills |",
  "|--------|-------------|--------|",
  "| Linguagem | Java 21 (Virtual Threads, Records, Sealed Classes) | `java-fundamentals`, `java21-virtual-threads`, `java-concurrency` |",
  "| Framework | Spring Boot 3.x | `java-spring-boot`, `spring-boot-*` |",
  "| Build | Maven, Gradle | `java-maven`, `java-gradle` |",
  "| Persistência | JPA / Hibernate | `java-jpa-hibernate` |",
  "| Mensageria | Kafka, RabbitMQ | `kafka-production-patterns`, `rabbitmq-production` |",
  "| Dados / Cache | MongoDB, Redis | `mongodb-*`, `redis-*` |",
  "| Integração HTTP | Feign clients | `folder-structure`, `hexagonal-architecture` |",
  "| Containers | Docker, Kubernetes, ArgoCD | `java-docker`, `kubernetes-specialist`, `argocd-expert` |",
  "| Cloud | Azure | `azure-diagnostics`, `azure-messaging`, `azure-reliability` |",
  "| Testes | JUnit 5, Mockito, Testcontainers, Playwright | `java-testing`, `java-testing-advanced`, `tdd`, `testing-boss`, `webapp-testing` |",
  "",
  "## Build & Run",
  "",
  "```bash",
  "mvn clean install      # build completo (compila, testa e empacota)",
  "mvn spring-boot:run    # executa a aplicação",
  "```",
  "",
  "## Arquitetura",
  "",
  "- **Obrigatória:** arquitetura em camadas BFF (`controller → service → client`) — ver [.skills/folder-structure/SKILL.md](.skills/folder-structure/SKILL.md).",
  "- **Padrões disponíveis via skills:** Hexagonal (`hexagonal-architecture`), DDD e decomposição de microsserviços (`microservices-architect`), Event-Driven Architecture (`spring-boot-event-driven-patterns`), Saga (`spring-boot-saga-pattern`).",
  "",
  "## Regras obrigatórias",
  "",
  "Definidas em [.skills/folder-structure/SKILL.md](.skills/folder-structure/SKILL.md) e nas skills de qualidade:",
  "",
  "1. Respeitar a direção das dependências `controller → service → client` (apenas para dentro; nunca pular camadas).",
  "2. **Nenhuma** regra de negócio em `*Controller`; o controller nunca chama `*Client`/`*FeignClient` diretamente.",
  "3. DTOs públicos (`controller/dto`) e de integração (`client/dto`) ficam separados e são traduzidos por mappers.",
  "4. Injeção por construtor (`@RequiredArgsConstructor`), nunca por campo.",
  "5. Métodos com ≤ 30 linhas, ≤ 3 parâmetros, ≤ 2 níveis de aninhamento e sem `switch/case`.",
  "6. Nomes em inglês, claros e reveladores de intenção; classes em PascalCase, métodos começando por verbo.",
  "7. URLs/paths externalizados em `application-*.yml` (`rest.*`), nunca hardcoded.",
  "8. Erros tratados de forma centralizada via `@RestControllerAdvice`; sem pacotes genéricos (`helpers`, `commons`, `misc`).",
  "9. Resolver a **causa raiz** — sem gambiarras (`no-workarounds`) e verificar antes de concluir (`verification-before-completion`).",
  "10. Todo código novo acompanha testes (unitários e de integração).",
  "",
  "## Fluxo de trabalho (spec-driven)",
  "",
  "Sequência: **PRD → Tech Spec → Tarefas → Implementação → (Bugfix) → QA → Review.** Os artefatos ficam em `tasks/prd-[nome-da-feature]/`.",
  "",
  "| Etapa | Guia | O que faz |",
  "|-------|------|-----------|",
  "| 1. PRD | [create_prd.md](create_prd.md) | Levanta requisitos (O QUÊ / POR QUÊ) → `prd.md` |",
  "| 2. Tech Spec | [create_techspec.md](create_techspec.md) | Decisões de arquitetura (COMO) → `techspec.md` |",
  "| 3. Tarefas | [create_tasks.md](create_tasks.md) | Quebra em entregas com testes → `tasks.md` + `[n]_task.md` |",
  "| 4. Implementar | [execute_task.md](execute_task.md) | Implementa a tarefa, carrega as skills e revisa via `@task-reviewer` |",
  "| 5. Bugfix | [execute_bugfix.md](execute_bugfix.md) | Corrige bugs de `bugs.md` com testes de regressão |",
  "| 6. QA | [execute_qa.md](execute_qa.md) | E2E + acessibilidade (WCAG 2.2) via Playwright MCP → relatório |",
  "| 7. Review | [execute_review.md](execute_review.md) | Code review por `git diff` e conformidade → `codereview.md` |",
  "",
  "## Skills disponíveis",
  "",
  "Cada skill vive em `skills/<nome>/SKILL.md`. A fonte de verdade é `.agents/skills/`, distribuída para `.claude/`, `.codex/`, `.cursor/`, `.github/`, `.opencode/` e `.devin/` pelo script `scripts/sync-skills.mjs`.",
  "",
  "| Skill | Descrição | Arquivo |",
  "|-------|-----------|---------|",
  ...skillRows,
  "",
  "## Testes",
  "",
  "```bash",
  "mvn test      # testes unitários",
  "mvn verify    # testes de integração",
  "```",
  "",
  "- Cada tarefa entrega seus próprios testes unitários e de integração (`create_tasks.md`).",
  "- Bugs corrigidos exigem testes de regressão que falham sem a correção (`execute_bugfix.md`).",
  "- QA executa E2E, acessibilidade e verificações visuais via Playwright MCP (`execute_qa.md`).",
  "- O review só aprova com todos os testes passando e conformidade com as regras (`execute_review.md`).",
  "- Skills de apoio: `java-testing`, `java-testing-advanced`, `tdd`, `test-driven-development`, `testing-boss`, `unit-test-caching`, `webapp-testing`, `microservices-review`, `secure-code-guardian`.",
  "",
  "## Cobertura",
  "",
  "Meta mínima: **80%** (medida com JaCoCo).",
  "",
  "```bash",
  "mvn verify              # roda os testes e gera o relatório de cobertura",
  "# relatório em: target/site/jacoco/index.html",
  "```",
  "",
  "## Estilo de código",
  "",
  "```bash",
  "mvn checkstyle:check    # valida o estilo de código",
  "```",
  "",
  "- Seguir o **Spring Java Format**; imports absolutos (não relativos).",
  "- Javadoc nas APIs públicas.",
  "- Convenções de nomenclatura conforme as **Regras obrigatórias** acima.",
  "",
  "## Qualidade e segurança",
  "",
  "```bash",
  "mvn sonar:sonar              # análise estática / quality gate (SonarQube)",
  "mvn dependency-check:check   # varredura de vulnerabilidades (OWASP Dependency-Check)",
  "```",
  "",
  "- OWASP Top 10, validação de entrada e nenhum segredo hardcoded (use variáveis de ambiente / cofre).",
  "- Skills de apoio: `secure-code-guardian`, `microservices-review`.",
  "",
  "## Pull Request",
  "",
  "Checklist obrigatório antes de abrir o PR:",
  "",
  "- [ ] Testes passando (`mvn verify`).",
  "- [ ] Cobertura ≥ 80%.",
  "- [ ] Sonar sem bugs/code smells críticos.",
  "- [ ] Sem vulnerabilidades High/Critical.",
  "- [ ] Documentação atualizada.",
  "- [ ] Commits no padrão **Conventional Commits**.",
  "",
  "## Estrutura do repositório",
  "",
  "```text",
  "skill_java_v2/",
  "├── .skills/folder-structure/   # regra obrigatória de estrutura (camadas BFF)",
  "├── skills/                     # " + skills.length + " skills — fonte legível (SKILL.md + scripts/assets)",
  "├── .agents/skills/             # fonte de verdade das skills",
  "├── .claude/ .codex/ .devin/ .opencode/   # skills por ferramenta (cópia integral)",
  "├── .cursor/rules/              # skills como regras .mdc",
  "├── .github/instructions/       # skills como instruções .md (Copilot)",
  "├── .vscode/                    # settings + extensões recomendadas",
  "├── create_*.md / execute_*.md  # fluxo de trabalho (PRD, techspec, tasks, bugfix, QA, review)",
  "├── scripts/sync-skills.mjs     # sincroniza as skills entre as pastas",
  "└── AGENTS.md                   # este arquivo",
  "```",
  "",
  "## Sincronizar skills",
  "",
  "```bash",
  "node scripts/sync-skills.mjs            # aplica as alterações",
  "node scripts/sync-skills.mjs --dry-run  # pré-visualiza sem escrever",
  "```",
  "",
];

const base = L.join('\n');

// Ponteiro: arquivo curto que referencia/importa a base (tática do CLAUDE.md).
// Evita duplicar conteúdo — a fonte única é o AGENTS.md.
function pointer(title) {
  return [
    '# ' + title,
    '',
    'Instruções deste projeto: ver [AGENTS.md](AGENTS.md) — base única compartilhada por todas as ferramentas.',
    '',
    '@AGENTS.md',
    '',
  ].join('\n');
}

// 1. AGENTS.md (raiz) — base canônica (Codex + OpenCode leem nativamente)
fs.writeFileSync(path.join(ROOT, 'AGENTS.md'), base, 'utf8');

// 2. Pontos de entrada por ferramenta — todos ponteiros para a base (DRY)
const pointers = {
  'CLAUDE.md': 'CLAUDE.md',                 // Claude Code
  '.clinerules': 'Cline Rules',             // Cline
  '.continuerules': 'Continue Rules',       // Continue
  '.cursorrules': 'Cursor Rules',           // Cursor (legado; rules modulares em .cursor/rules/)
};
for (const [file, title] of Object.entries(pointers)) {
  fs.writeFileSync(path.join(ROOT, file), pointer(title), 'utf8');
}

// 3. .github/copilot-instructions.md — Copilot/VS Code NÃO seguem import nem ponteiro:
//    o conteúdo é injetado literalmente no contexto, então recebe cópia integral da base.
const copilot = base +
  '\n\n---\n\n' +
  'Para arquivos de instrução modulares por skill, ver `.github/instructions/`.\n';
fs.mkdirSync(path.join(ROOT, '.github'), { recursive: true });
fs.writeFileSync(path.join(ROOT, '.github', 'copilot-instructions.md'), copilot, 'utf8');

console.log('Gerados a partir da base (' + skills.length + ' skills):');
console.log('  base:      AGENTS.md');
console.log('  ponteiros: ' + Object.keys(pointers).join(', '));
console.log('  cópia:     .github/copilot-instructions.md (Copilot exige conteúdo inline)');
