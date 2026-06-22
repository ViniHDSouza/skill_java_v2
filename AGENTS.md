# AGENTS.md

Coleção **reutilizável** de skills e regras para desenvolvimento de software, aplicável a **qualquer tipo de projeto**. O perfil principal é **backend Java / Spring Boot** (Maven) — serviços BFF (Backend for Frontend) em arquitetura em camadas —, mas boa parte das skills (specs, prompts, testes, arquitetura, DevOps, segurança, dados) é transversal e serve a outras linguagens e stacks.

Este é o ponto de entrada para agentes e contribuidores em qualquer projeto que adote estas skills. Aplique as regras ao **criar, manter, reorganizar ou revisar** código — as regras obrigatórias e os comandos abaixo valem para o perfil **Java / Spring Boot**; em outras stacks, use as skills transversais aplicáveis. **Não duplique aqui o conteúdo das skills/regras** — consulte os arquivos referenciados.

> **Base compartilhada.** Este arquivo é a fonte única de instruções, usada por Claude Code (via `CLAUDE.md`), Codex, OpenCode, GitHub Copilot (via `.github/copilot-instructions.md`) e VS Code. Regenere os pontos de entrada com `node scripts/generate-agents.mjs`.

## Stack (coberto pelas skills)

| Camada | Tecnologias | Skills |
|--------|-------------|--------|
| Linguagem | Java 21 (Virtual Threads, Records, Sealed Classes) | `java-fundamentals`, `java21-virtual-threads`, `java-concurrency` |
| Framework | Spring Boot 3.x | `java-spring-boot`, `spring-boot-*` |
| Build | Maven, Gradle | `java-maven`, `java-gradle` |
| Persistência | JPA / Hibernate | `java-jpa-hibernate` |
| Mensageria | Kafka, RabbitMQ | `kafka-production-patterns`, `rabbitmq-production` |
| Dados / Cache | MongoDB, Redis | `mongodb-*`, `redis-*` |
| Integração HTTP | Feign clients | `folder-structure`, `hexagonal-architecture` |
| Containers | Docker, Kubernetes, ArgoCD | `java-docker`, `kubernetes-specialist`, `argocd-expert` |
| Cloud | Azure | `azure-diagnostics`, `azure-messaging`, `azure-reliability` |
| Testes | JUnit 5, Mockito, Testcontainers, Playwright | `java-testing`, `java-testing-advanced`, `tdd`, `testing-boss`, `webapp-testing` |

## Build & Run

```bash
mvn clean install      # build completo (compila, testa e empacota)
mvn spring-boot:run    # executa a aplicação
```

## Arquitetura

- **Obrigatória:** arquitetura em camadas BFF (`controller → service → client`) — ver [.skills/folder-structure/SKILL.md](.skills/folder-structure/SKILL.md).
- **Baseline real (precedência):** antes de implementar qualquer PRD/task, consulte [.estrutura-pastas-realizado.md](.estrutura-pastas-realizado.md) (gerado pela skill `estrutura-pastas`). **Se existir e estiver preenchido, ele é a fonte de verdade da estrutura real e tem precedência sobre o padrão prescritivo.** Se ausente/vazio, siga o padrão prescritivo e gere a baseline com a skill `estrutura-pastas`.
- **Análise dos padrões:** ver [docs/skills-arquitetura.md](docs/skills-arquitetura.md) (Camadas BFF vs. Hexagonal e quando usar cada um).
- **Padrões disponíveis via skills:** Hexagonal (`hexagonal-architecture`), DDD e decomposição de microsserviços (`microservices-architect`), Event-Driven Architecture (`spring-boot-event-driven-patterns`), Saga (`spring-boot-saga-pattern`).

## Regras obrigatórias

Definidas em [.skills/folder-structure/SKILL.md](.skills/folder-structure/SKILL.md) e nas skills de qualidade:

1. Respeitar a direção das dependências `controller → service → client` (apenas para dentro; nunca pular camadas).
2. **Nenhuma** regra de negócio em `*Controller`; o controller nunca chama `*Client`/`*FeignClient` diretamente.
3. DTOs públicos (`controller/dto`) e de integração (`client/dto`) ficam separados e são traduzidos por mappers.
4. Injeção por construtor (`@RequiredArgsConstructor`), nunca por campo.
5. Métodos com ≤ 30 linhas, ≤ 3 parâmetros, ≤ 2 níveis de aninhamento e sem `switch/case`.
6. Nomes em inglês, claros e reveladores de intenção; classes em PascalCase, métodos começando por verbo.
7. URLs/paths externalizados em `application-*.yml` (`rest.*`), nunca hardcoded.
8. Erros tratados de forma centralizada via `@RestControllerAdvice`; sem pacotes genéricos (`helpers`, `commons`, `misc`).
9. Resolver a **causa raiz** — sem gambiarras (`no-workarounds`) e verificar antes de concluir (`verification-before-completion`).
10. Todo código novo acompanha testes (unitários e de integração).

## Fluxo de trabalho (spec-driven)

Sequência: **PRD → Tech Spec → Tarefas → Implementação → (Bugfix) → QA → Review.** Os artefatos ficam em `tasks/prd-[nome-da-feature]/`.

| Etapa | Guia | O que faz |
|-------|------|-----------|
| 1. PRD | [create_prd.md](create_prd.md) | Levanta requisitos (O QUÊ / POR QUÊ) → `prd.md` |
| 2. Tech Spec | [create_techspec.md](create_techspec.md) | Decisões de arquitetura (COMO) → `techspec.md` |
| 3. Tarefas | [create_tasks.md](create_tasks.md) | Quebra em entregas com testes → `tasks.md` + `[n]_task.md` |
| 4. Implementar | [execute_task.md](execute_task.md) | Implementa a tarefa, carrega as skills e revisa via `@task-reviewer` |
| 5. Bugfix | [execute_bugfix.md](execute_bugfix.md) | Corrige bugs de `bugs.md` com testes de regressão |
| 6. QA | [execute_qa.md](execute_qa.md) | E2E + acessibilidade (WCAG 2.2) via Playwright MCP → relatório |
| 7. Review | [execute_review.md](execute_review.md) | Code review por `git diff` e conformidade → `codereview.md` |

## Skills disponíveis

Cada skill vive em `skills/<nome>/SKILL.md`. A fonte de verdade é `.agents/skills/`, distribuída para `.claude/`, `.codex/`, `.cursor/`, `.github/`, `.opencode/` e `.devin/` pelo script `scripts/sync-skills.mjs`.

| Skill | Descrição | Arquivo |
|-------|-----------|---------|
| `architectural-analysis` | Deep architectural audit focused on finding dead code, duplicated functionality, architectural anti-patterns, type confusion, and code smells. | [skills/architectural-analysis/SKILL.md](skills/architectural-analysis/SKILL.md) |
| `argocd-expert` | Expert-level ArgoCD GitOps deployment, application management, sync strategies, and production operations | [skills/argocd-expert/SKILL.md](skills/argocd-expert/SKILL.md) |
| `azure-diagnostics` | Debug Azure production issues on Azure using AppLens, Azure Monitor, resource health, and safe triage. | [skills/azure-diagnostics/SKILL.md](skills/azure-diagnostics/SKILL.md) |
| `azure-messaging` | Troubleshoot and resolve issues with Azure Messaging SDKs for Event Hubs and Service Bus. | [skills/azure-messaging/SKILL.md](skills/azure-messaging/SKILL.md) |
| `azure-reliability` | Assess and improve the reliability posture of PaaS Applications (Azure Functions and Azure App Service). | [skills/azure-reliability/SKILL.md](skills/azure-reliability/SKILL.md) |
| `chaos-engineer` | Designs chaos experiments, creates failure injection frameworks, and facilitates game day exercises for distributed systems — producing runbooks, experiment… | [skills/chaos-engineer/SKILL.md](skills/chaos-engineer/SKILL.md) |
| `creating-spec` | Create comprehensive technical specs for SDK gaps, feature modules, or system centralization efforts. | [skills/creating-spec/SKILL.md](skills/creating-spec/SKILL.md) |
| `devops-engineer` | Creates Dockerfiles, configures CI/CD pipelines, writes Kubernetes manifests, and generates Terraform/Pulumi infrastructure templates. | [skills/devops-engineer/SKILL.md](skills/devops-engineer/SKILL.md) |
| `estrutura-pastas` | Mapeia e documenta a estrutura real de pastas/pacotes do backend do projeto atual e a responsabilidade de cada pasta, gerando o arquivo… | [skills/estrutura-pastas/SKILL.md](skills/estrutura-pastas/SKILL.md) |
| `git-rebase` | Intelligently handle git rebase operations and resolve merge conflicts while preserving features and maintaining code quality. | [skills/git-rebase/SKILL.md](skills/git-rebase/SKILL.md) |
| `hexagonal-architecture` | Apply Hexagonal Architecture (Ports & Adapters) in Java 17/21 Spring Boot microservices. | [skills/hexagonal-architecture/SKILL.md](skills/hexagonal-architecture/SKILL.md) |
| `html-to-md` | Converts HTML and HTM files to clean, well-structured Markdown (.md). | [skills/html-to-md/SKILL.md](skills/html-to-md/SKILL.md) |
| `improve-codebase-architecture` | Scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick. | [skills/improve-codebase-architecture/SKILL.md](skills/improve-codebase-architecture/SKILL.md) |
| `iris-development` | Iris is Redis's umbrella for AI-focused products. | [skills/iris-development/SKILL.md](skills/iris-development/SKILL.md) |
| `java-architect` | Use when building, configuring, or debugging enterprise Java applications with Spring Boot 3.x, microservices, or reactive programming. | [skills/java-architect/SKILL.md](skills/java-architect/SKILL.md) |
| `java-concurrency` | Master Java concurrency - threads, executors, locks, CompletableFuture, virtual threads | [skills/java-concurrency/SKILL.md](skills/java-concurrency/SKILL.md) |
| `java-docker` | Containerize Java applications - Dockerfile optimization, JVM settings, security | [skills/java-docker/SKILL.md](skills/java-docker/SKILL.md) |
| `java-fundamentals` | Master core Java programming - syntax, OOP, collections, streams, and exception handling | [skills/java-fundamentals/SKILL.md](skills/java-fundamentals/SKILL.md) |
| `java-gradle` | Master Gradle - Kotlin DSL, task configuration, build optimization, caching | [skills/java-gradle/SKILL.md](skills/java-gradle/SKILL.md) |
| `java-jpa-hibernate` | Master JPA/Hibernate - entity design, queries, transactions, performance optimization | [skills/java-jpa-hibernate/SKILL.md](skills/java-jpa-hibernate/SKILL.md) |
| `java-maven` | Master Apache Maven - POM configuration, plugins, lifecycle, dependency management | [skills/java-maven/SKILL.md](skills/java-maven/SKILL.md) |
| `java-microservices` | Build microservices - Spring Cloud, service mesh, event-driven, resilience patterns | [skills/java-microservices/SKILL.md](skills/java-microservices/SKILL.md) |
| `java-performance` | JVM performance tuning - GC optimization, profiling, memory analysis, benchmarking | [skills/java-performance/SKILL.md](skills/java-performance/SKILL.md) |
| `java-spring-boot` | Build production Spring Boot applications - REST APIs, Security, Data, Actuator | [skills/java-spring-boot/SKILL.md](skills/java-spring-boot/SKILL.md) |
| `java-testing` | Test Java applications - JUnit 5, Mockito, integration testing, TDD patterns | [skills/java-testing/SKILL.md](skills/java-testing/SKILL.md) |
| `java-testing-advanced` | Advanced testing - Testcontainers, contract testing, mutation testing, property-based | [skills/java-testing-advanced/SKILL.md](skills/java-testing-advanced/SKILL.md) |
| `java21-virtual-threads` | Apply Java 21 LTS modern features in Spring Boot 3.x applications, with focus on Virtual Threads (Project Loom), Records, Sealed Classes, Pattern Matching… | [skills/java21-virtual-threads/SKILL.md](skills/java21-virtual-threads/SKILL.md) |
| `kafka-production-patterns` | Implement production-grade Apache Kafka patterns in Java/Spring Boot microservices. | [skills/kafka-production-patterns/SKILL.md](skills/kafka-production-patterns/SKILL.md) |
| `kubernetes-specialist` | Use when deploying or managing Kubernetes workloads. | [skills/kubernetes-specialist/SKILL.md](skills/kubernetes-specialist/SKILL.md) |
| `microservices-architect` | Designs distributed system architectures, decomposes monoliths into bounded-context services, recommends communication patterns, and produces service boundary… | [skills/microservices-architect/SKILL.md](skills/microservices-architect/SKILL.md) |
| `microservices-review` | Automated checklist review for Java/Spring Boot microservices covering Resilience, Security, Performance, Observability, and Tests. | [skills/microservices-review/SKILL.md](skills/microservices-review/SKILL.md) |
| `mongodb-atlas-stream-processing` | Manages MongoDB Atlas Stream Processing (ASP) workflows. | [skills/mongodb-atlas-stream-processing/SKILL.md](skills/mongodb-atlas-stream-processing/SKILL.md) |
| `mongodb-connection` | Optimize MongoDB client connection configuration (pools, timeouts, patterns) for any supported driver language. | [skills/mongodb-connection/SKILL.md](skills/mongodb-connection/SKILL.md) |
| `mongodb-mcp-setup` | Guide users through configuring key MongoDB MCP server options. | [skills/mongodb-mcp-setup/SKILL.md](skills/mongodb-mcp-setup/SKILL.md) |
| `mongodb-natural-language-querying` | Generate read-only MongoDB queries (find) or aggregation pipelines using natural language, with collection schema context and sample documents. | [skills/mongodb-natural-language-querying/SKILL.md](skills/mongodb-natural-language-querying/SKILL.md) |
| `mongodb-query-optimizer` | Help with MongoDB query optimization and indexing. | [skills/mongodb-query-optimizer/SKILL.md](skills/mongodb-query-optimizer/SKILL.md) |
| `mongodb-schema-design` | MongoDB schema design patterns and anti-patterns. | [skills/mongodb-schema-design/SKILL.md](skills/mongodb-schema-design/SKILL.md) |
| `mongodb-search-and-ai` | Guides MongoDB users through implementing and optimizing Atlas Search (full-text), Vector Search (semantic), and Hybrid Search solutions. | [skills/mongodb-search-and-ai/SKILL.md](skills/mongodb-search-and-ai/SKILL.md) |
| `no-workarounds` | Enforce root-cause fixes over workarounds, hacks, and symptom patches in all software engineering tasks. | [skills/no-workarounds/SKILL.md](skills/no-workarounds/SKILL.md) |
| `rabbitmq-production` | Implement production-grade RabbitMQ patterns in Java/Spring Boot microservices using Spring AMQP. | [skills/rabbitmq-production/SKILL.md](skills/rabbitmq-production/SKILL.md) |
| `redis-clustering` | Redis Cluster and replication guidance covering hash tags for multi-key operations, avoiding CROSSSLOT errors, and reading from replicas to scale read-heavy… | [skills/redis-clustering/SKILL.md](skills/redis-clustering/SKILL.md) |
| `redis-connections` | Redis client and connection guidance covering connection pooling, multiplexing, pipelining, client-side caching with RESP3, avoiding slow commands (KEYS… | [skills/redis-connections/SKILL.md](skills/redis-connections/SKILL.md) |
| `redis-core` | Core Redis modeling guidance — choose the right data structure (String, Hash, List, Set, Sorted Set, JSON, Stream, Vector Set) and use consistent… | [skills/redis-core/SKILL.md](skills/redis-core/SKILL.md) |
| `redis-observability` | Redis observability guidance — which metrics to monitor (memory, connections, hit ratio, ops/sec, rejected connections), which built-in commands to reach for… | [skills/redis-observability/SKILL.md](skills/redis-observability/SKILL.md) |
| `redis-query-engine` | Redis Query Engine (RQE) guidance covering FT.CREATE schema design, field type selection (TEXT, TAG, NUMERIC, GEO, GEOSHAPE, VECTOR), DIALECT 2 query syntax… | [skills/redis-query-engine/SKILL.md](skills/redis-query-engine/SKILL.md) |
| `redis-security` | Redis security guidance covering authentication (requirepass and ACL users), TLS, ACL-based least-privilege access control, restricting network exposure via… | [skills/redis-security/SKILL.md](skills/redis-security/SKILL.md) |
| `redis-semantic-cache` | Redis LangCache guidance for semantic caching of LLM responses on Redis Cloud — calling search/set via the SDK or REST API, tuning the similarity threshold… | [skills/redis-semantic-cache/SKILL.md](skills/redis-semantic-cache/SKILL.md) |
| `redis-vector-search` | Redis vector search guidance covering HNSW vs FLAT algorithm choice, vector index configuration (dims, distance metric, datatype), filtered hybrid search… | [skills/redis-vector-search/SKILL.md](skills/redis-vector-search/SKILL.md) |
| `refactoring-analysis` | Analyzes codebases to identify refactoring opportunities based on Martin Fowler's catalog of code smells and refactoring techniques. | [skills/refactoring-analysis/SKILL.md](skills/refactoring-analysis/SKILL.md) |
| `secure-code-guardian` | Use when implementing authentication/authorization, securing user input, or preventing OWASP Top 10 vulnerabilities — including custom security implementations… | [skills/secure-code-guardian/SKILL.md](skills/secure-code-guardian/SKILL.md) |
| `skill-best-practices` | Authors and structures professional-grade agent skills following the agentskills.io spec. | [skills/skill-best-practices/SKILL.md](skills/skill-best-practices/SKILL.md) |
| `skill-creator` | Create new skills, modify and improve existing skills, and measure skill performance. | [skills/skill-creator/SKILL.md](skills/skill-creator/SKILL.md) |
| `spring-boot-crud-patterns` | Provides and generates complete CRUD workflows for Spring Boot 3 services. | [skills/spring-boot-crud-patterns/SKILL.md](skills/spring-boot-crud-patterns/SKILL.md) |
| `spring-boot-engineer` | Generates Spring Boot 3.x configurations, creates REST controllers, implements Spring Security 6 authentication flows, sets up Spring Data JPA repositories… | [skills/spring-boot-engineer/SKILL.md](skills/spring-boot-engineer/SKILL.md) |
| `spring-boot-event-driven-patterns` | Provides Event-Driven Architecture (EDA) patterns for Spring Boot — creates domain events, configures ApplicationEvent and @TransactionalEventListener, sets up… | [skills/spring-boot-event-driven-patterns/SKILL.md](skills/spring-boot-event-driven-patterns/SKILL.md) |
| `spring-boot-saga-pattern` | Provides distributed transaction patterns using the Saga Pattern for Spring Boot microservices. | [skills/spring-boot-saga-pattern/SKILL.md](skills/spring-boot-saga-pattern/SKILL.md) |
| `spring-boot-security-jwt` | Provides JWT authentication and authorization patterns for Spring Boot 3.5.x covering token generation with JJWT, Bearer/cookie authentication, database/OAuth2… | [skills/spring-boot-security-jwt/SKILL.md](skills/spring-boot-security-jwt/SKILL.md) |
| `systematic-debugging` | Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes | [skills/systematic-debugging/SKILL.md](skills/systematic-debugging/SKILL.md) |
| `tdd` | Test-driven development. | [skills/tdd/SKILL.md](skills/tdd/SKILL.md) |
| `test-driven-development` | Use when implementing any feature or bugfix, before writing implementation code | [skills/test-driven-development/SKILL.md](skills/test-driven-development/SKILL.md) |
| `testing-boss` | Comprehensive testing doctrine for software and AI systems — covers positive patterns, anti-patterns, gates for coding agents writing tests, CI discipline, and… | [skills/testing-boss/SKILL.md](skills/testing-boss/SKILL.md) |
| `to-issues` | Break a plan, spec, or PRD into independently-grabbable issues on the project issue tracker using tracer-bullet vertical slices. | [skills/to-issues/SKILL.md](skills/to-issues/SKILL.md) |
| `to-prd` | Turn the current conversation into a PRD and publish it to the project issue tracker — no interview, just synthesis of what you've already discussed. | [skills/to-prd/SKILL.md](skills/to-prd/SKILL.md) |
| `to-prompt` | Transform code, issues, or context into a detailed prompt/context for another LLM to fix or implement. | [skills/to-prompt/SKILL.md](skills/to-prompt/SKILL.md) |
| `unit-test-caching` | Provides patterns for unit testing Spring Cache annotations (@Cacheable, @CachePut, @CacheEvict). | [skills/unit-test-caching/SKILL.md](skills/unit-test-caching/SKILL.md) |
| `verification-before-completion` | Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output… | [skills/verification-before-completion/SKILL.md](skills/verification-before-completion/SKILL.md) |
| `webapp-testing` | Toolkit for interacting with and testing local web applications using Playwright. | [skills/webapp-testing/SKILL.md](skills/webapp-testing/SKILL.md) |

## Testes

```bash
mvn test      # testes unitários
mvn verify    # testes de integração
```

- Cada tarefa entrega seus próprios testes unitários e de integração (`create_tasks.md`).
- Bugs corrigidos exigem testes de regressão que falham sem a correção (`execute_bugfix.md`).
- QA executa E2E, acessibilidade e verificações visuais via Playwright MCP (`execute_qa.md`).
- O review só aprova com todos os testes passando e conformidade com as regras (`execute_review.md`).
- Skills de apoio: `java-testing`, `java-testing-advanced`, `tdd`, `test-driven-development`, `testing-boss`, `unit-test-caching`, `webapp-testing`, `microservices-review`, `secure-code-guardian`.

## Cobertura

Meta mínima: **80%** (medida com JaCoCo).

```bash
mvn verify              # roda os testes e gera o relatório de cobertura
# relatório em: target/site/jacoco/index.html
```

## Estilo de código

```bash
mvn checkstyle:check    # valida o estilo de código
```

- Seguir o **Spring Java Format**; imports absolutos (não relativos).
- Javadoc nas APIs públicas.
- Convenções de nomenclatura conforme as **Regras obrigatórias** acima.

## Qualidade e segurança

```bash
mvn sonar:sonar              # análise estática / quality gate (SonarQube)
mvn dependency-check:check   # varredura de vulnerabilidades (OWASP Dependency-Check)
```

- OWASP Top 10, validação de entrada e nenhum segredo hardcoded (use variáveis de ambiente / cofre).
- Skills de apoio: `secure-code-guardian`, `microservices-review`.

## Pull Request

Checklist obrigatório antes de abrir o PR:

- [ ] Testes passando (`mvn verify`).
- [ ] Cobertura ≥ 80%.
- [ ] Sonar sem bugs/code smells críticos.
- [ ] Sem vulnerabilidades High/Critical.
- [ ] Documentação atualizada.
- [ ] Commits no padrão **Conventional Commits**.

## Estrutura do repositório

```text
skill_java_v2/
├── .skills/folder-structure/   # regra obrigatória de estrutura (camadas BFF)
├── skills/                     # 67 skills — fonte legível (SKILL.md + scripts/assets)
├── .agents/skills/             # fonte de verdade das skills
├── .claude/ .codex/ .devin/ .opencode/   # skills por ferramenta (cópia integral)
├── .cursor/rules/              # skills como regras .mdc
├── .github/instructions/       # skills como instruções .md (Copilot)
├── .vscode/                    # settings + extensões recomendadas
├── create_*.md / execute_*.md  # fluxo de trabalho (PRD, techspec, tasks, bugfix, QA, review)
├── scripts/sync-skills.mjs     # sincroniza as skills entre as pastas
└── AGENTS.md                   # este arquivo
```

## Sincronizar skills

```bash
node scripts/sync-skills.mjs            # aplica as alterações
node scripts/sync-skills.mjs --dry-run  # pré-visualiza sem escrever
```
