# Estrutura de pastas / arquitetura por skill

Análise de **todas as skills** da coleção (`skills/`) + a regra obrigatória em
`.skills/folder-structure`, classificando **qual estrutura de pastas ou arquitetura** cada
uma utiliza ou prescreve.

> Resumo executivo: a maioria das skills é **agnóstica de arquitetura** (foca em um domínio
> técnico — Redis, MongoDB, testes, build, cloud). Apenas um subconjunto **prescreve uma
> estrutura de pastas concreta**, e esses layouts **divergem entre si** (ver alerta abaixo).

---

## 0. Anti-deriva ao executar PRD/task (leia primeiro)

Para **não perder a arquitetura** ao executar um PRD ou uma task, siga esta ordem de precedência
**antes de escrever qualquer código**:

1. **Baseline real do projeto — `.estrutura-pastas-realizado.md`** (gerado pela skill
   `estrutura-pastas`). **Se existir e estiver preenchido, ele é a fonte de verdade** da
   estrutura realmente adotada: siga-o, mesmo que difira do padrão prescritivo.
2. **Se a baseline estiver ausente ou vazia**, use o **padrão prescritivo** da skill
   correspondente (`folder-structure` para BFF; `hexagonal-architecture` para Hexagonal) e
   **gere a baseline** rodando a skill `estrutura-pastas` para registrá-la.
3. Em qualquer caso, respeite as **Regras obrigatórias** e a seção **Arquitetura** de
   [`AGENTS.md`](../AGENTS.md) — replicadas para o Copilot em
   [`.github/copilot-instructions.md`](../.github/copilot-instructions.md).

> Resumo: **baseline real preenchida > skill prescritiva**. Nunca improvise um layout novo:
> ou segue o que o projeto já tem, ou segue a skill e registra o resultado na baseline.

---

## 1. Os 4 padrões concretos de arquitetura nas skills

| Padrão | O que define | Skills que o usam |
|--------|--------------|-------------------|
| **Camadas BFF (Layered)** `controller → service → client` | Pacotes `controller/service/client` + `config/exception/util/monitoring`; DTOs públicos vs. integração separados por mappers | `folder-structure` (**obrigatória**), `java-spring-boot`, `spring-boot-engineer` (variante com `repository`) |
| **Hexagonal (Ports & Adapters / Clean)** | `domain/{model,port/in,port/out,service}` + `application/usecase` + `adapter/{in/web,in/messaging,out/persistence,out/messaging}` | `hexagonal-architecture` |
| **Package-by-feature (DDD)** | `feature/<nome>/{domain, application, presentation, infrastructure}` | `spring-boot-crud-patterns` |
| **Distribuída / Microsserviços** (bounded contexts, EDA, Saga, Spring Cloud) | Decomposição em serviços; sem árvore única de pastas | `microservices-architect`, `java-microservices`, `java-architect`, `spring-boot-event-driven-patterns`, `spring-boot-saga-pattern` |

---

## 2. ⚠️ Tensão / conflito de padrões

A regra **obrigatória** do projeto — [`.skills/folder-structure/SKILL.md`](../.skills/folder-structure/SKILL.md)
e [`AGENTS.md`](../AGENTS.md) — é a **arquitetura em camadas BFF** (`controller → service → client`)
e **rejeita explicitamente** pacotes por feature e nomes genéricos (`helpers`, `commons`, `misc`).

Porém, três skills da própria coleção prescrevem layouts **diferentes** da estrutura BFF obrigatória:

| Skill | Layout que prescreve | Diverge da BFF porque… |
|-------|----------------------|------------------------|
| `spring-boot-crud-patterns` | `feature/<nome>/{domain,application,presentation,infrastructure}` | usa **package-by-feature** (a BFF é package-by-layer e proíbe agrupar por feature no topo) |
| `hexagonal-architecture` | `domain/`, `application/`, `adapter/in`, `adapter/out` | usa **ports & adapters** (não há camada `client`; o domínio é isolado de frameworks) |
| `spring-boot-engineer` / `java-spring-boot` | Controller / Service / **Repository** / Entity | é **MVC clássico com acesso a banco** (`@Repository`/JPA), sem a camada `client`/Feign da BFF |

**Implicação prática:** ao gerar código para este projeto, a estrutura **BFF em camadas** prevalece
(é a mandatória). As demais skills de arquitetura devem ser usadas só quando o contexto pedir
explicitamente outro estilo (ex.: criar um microsserviço hexagonal do zero, fora do perfil BFF).

---

## 3. Detalhamento por categoria

### A. Skills que PRESCREVEM uma estrutura de pastas concreta

| Skill | Arquitetura | Estrutura | Origem |
|-------|-------------|-----------|--------|
| `folder-structure` | **Camadas BFF** (mandatória) | `controller → service → client` + `config/exception/util/monitoring`; DTOs públicos vs. `client/dto` separados por mappers; pacote base `com.example.bff` | [`.skills/folder-structure/SKILL.md`](../.skills/folder-structure/SKILL.md) |
| `hexagonal-architecture` | **Hexagonal (Ports & Adapters)** | `domain/{model,port/in,port/out,service,exception}` + `application/usecase` + `adapter/{in/web,in/messaging,out/persistence,out/messaging}`; pacote `com.empresa.servico` | [`skills/hexagonal-architecture/SKILL.md`](../skills/hexagonal-architecture/SKILL.md) |
| `spring-boot-crud-patterns` | **Package-by-feature (DDD)** | `feature/<nome>/{domain, application, presentation, infrastructure}`; agregados + repositórios + adapters JPA por feature | [`skills/spring-boot-crud-patterns/SKILL.md`](../skills/spring-boot-crud-patterns/SKILL.md) |
| `spring-boot-engineer` | **Camadas técnicas (MVC)** | Entity / Repository / Service / Controller; injeção por construtor | [`skills/spring-boot-engineer/SKILL.md`](../skills/spring-boot-engineer/SKILL.md) |
| `java-spring-boot` | **MVC em camadas** | Controller / Service / Repository / Entity + `@RestControllerAdvice` | [`skills/java-spring-boot/SKILL.md`](../skills/java-spring-boot/SKILL.md) |

---

## 3.1. Análise aprofundada: Camadas BFF (Layered)

**Skill de origem:** [`.skills/folder-structure/SKILL.md`](../.skills/folder-structure/SKILL.md) ·
**Status:** padrão **obrigatório** deste projeto (ver [`AGENTS.md`](../AGENTS.md) → "Arquitetura" e "Regras obrigatórias").

Arquitetura em **camadas** para serviços **BFF (Backend for Frontend)**: o BFF não tem persistência
própria — ele **orquestra chamadas a APIs externas** (Feign) e adapta os contratos para o cliente.

**Pacotes e responsabilidades**

| Pacote | Responsabilidade | Não pode |
|--------|------------------|----------|
| `controller` | Transporte HTTP: validação (`@Valid`), contrato público da API, mapeia DTO público ↔ DTO de cliente | conter regra de negócio; chamar `*Client`/`*FeignClient` direto |
| `service` | Orquestração e regras de negócio; chama um ou mais `client` | conhecer tipos HTTP/Feign |
| `client` | Integração de saída: `*FeignClient` (interface HTTP) + `*Client` (wrapper/adapter) | depender de `service`/`controller` |
| `config` / `exception` / `util` / `monitoring` | Suporte transversal (wiring, `@RestControllerAdvice`, helpers/validators, health) | virar pacote genérico (`helpers`, `commons`, `misc`) |

**Direção de dependência (apenas para dentro):** `controller → service → client`. DTOs públicos
(`controller/dto`) e de integração (`client/dto`) ficam **separados** e são traduzidos por mappers —
o contrato público nunca vaza o formato da API externa.

**Evitar:** regra de negócio no `*Controller`/`*FeignClient`; controller chamando client direto;
retornar `*ResponseDTO` (de `client/dto`) ao chamador HTTP; `FeignException`/headers vazando para o
`service`; URLs hardcoded (externalize em `application-*.yml` sob `rest.*`).

> **Fonte de verdade / baseline.** Antes de criar endpoints/classes, consulte
> **`.estrutura-pastas-realizado.md`** (raiz). **Se existir e estiver preenchido**, ele descreve a
> estrutura BFF **real** deste serviço e **tem precedência** — siga os pacotes/sufixos lá registrados.
> **Se ausente/vazio**, siga `folder-structure` e **gere a baseline** com a skill `estrutura-pastas`.
> Regras obrigatórias e seção "Arquitetura": [`AGENTS.md`](../AGENTS.md) ·
> [`.github/copilot-instructions.md`](../.github/copilot-instructions.md).

## 3.2. Análise aprofundada: Hexagonal (Ports & Adapters / Clean)

**Skill de origem:** [`skills/hexagonal-architecture/SKILL.md`](../skills/hexagonal-architecture/SKILL.md) ·
**Status:** padrão **alternativo**, para microsserviços com **domínio isolado** (fora do perfil BFF).

Filosofia: **o domínio não conhece o mundo externo; o mundo externo se adapta ao domínio.** Spring,
JPA, Kafka existem **apenas nos adapters**, nunca no domínio.

**Pacotes e responsabilidades**

| Pacote | Responsabilidade | Não pode |
|--------|------------------|----------|
| `domain/model` | Entidades, Value Objects (records imutáveis), Aggregates | importar framework |
| `domain/port/in` | Portas de entrada (use cases) — interfaces | conter implementação |
| `domain/port/out` | Portas de saída (repositórios, publishers) — interfaces | conhecer tecnologia concreta |
| `domain/service` | Casos de uso: implementam portas IN, recebem portas OUT por construtor | importar `org.springframework`, `javax.persistence`, `org.apache.kafka` |
| `application/usecase` | Orquestração opcional sobre o domínio | — |
| `adapter/in/{web,messaging}` | Controllers REST, consumers — injetam **portas IN** | conhecer adapter OUT diretamente |
| `adapter/out/{persistence,messaging}` | Implementam **portas OUT** (JPA adapter, Kafka adapter), com mappers domain ↔ entity/dto | vazar entity/JPA para o domínio |

**Direção de dependência:** `Adapter IN → Domain ← Adapter OUT` (e `Application → Domain`). Cruzar
fronteiras **sempre** via interfaces (portas). Controllers injetam **portas IN**, não serviços
concretos.

**Evitar:** `@Component` no domínio (configure via `@Bean`/`@Configuration` no adapter); adapter IN
conhecendo adapter OUT; testes de domínio com `@SpringBootTest` (devem ser puros, sem Spring).

> **Fonte de verdade / baseline.** Se este serviço adota Hexagonal, **`.estrutura-pastas-realizado.md`**
> (quando preenchido) **tem precedência** e registra os pacotes `domain/`/`application/`/`adapter/`
> realmente usados — siga-os. **Se ausente/vazio**, siga `hexagonal-architecture` e **gere a baseline**
> com a skill `estrutura-pastas`. Verifique também a seção "Arquitetura" de [`AGENTS.md`](../AGENTS.md) /
> [`.github/copilot-instructions.md`](../.github/copilot-instructions.md): por padrão o projeto é **BFF**;
> use Hexagonal apenas quando o contexto pedir explicitamente domínio isolado.

---

### B. Skills que ASSUMEM uma arquitetura, sem desenhar árvore de pastas

| Skill | Arquitetura |
|-------|-------------|
| `spring-boot-event-driven-patterns` | EDA + agregados DDD + transactional outbox (eventos de domínio, Kafka) |
| `spring-boot-saga-pattern` | Saga (coreografia/orquestração) sobre microsserviços; saga state + compensações |
| `microservices-architect` | DDD / bounded contexts; decomposição de monolito; sem schema compartilhado |
| `java-microservices` | Spring Cloud (Eureka/Consul, Gateway, LoadBalancer, circuit breaker) |
| `java-architect` | Spring Boot 3.x microsserviços + layered + WebFlux (reactive) |

### C. Skills que ANALISAM / AUDITAM arquitetura (não impõem layout)

| Skill | Papel |
|-------|-------|
| `estrutura-pastas` | **Descritiva**: mapeia a estrutura real do projeto e a confronta com `folder-structure`; gera `.estrutura-pastas-realizado.md` |
| `architectural-analysis` | Auditoria: dead code, duplicação, anti-padrões, type confusion |
| `refactoring-analysis` | Code smells e técnicas de refatoração (catálogo Fowler) |
| `improve-codebase-architecture` | Oportunidades de "aprofundamento" arquitetural |
| `microservices-review` | Checklist de prontidão para produção (resiliência/segurança/observabilidade/testes) |

### D. Skills AGNÓSTICAS de arquitetura/pasta (domínio técnico específico)

- **Java core / build:** `java-fundamentals`, `java-concurrency`, `java-performance`, `java21-virtual-threads`, `java-jpa-hibernate`, `java-maven`, `java-gradle`, `java-docker`.
- **Testes:** `java-testing`, `java-testing-advanced`, `tdd`, `test-driven-development`, `testing-boss`, `unit-test-caching`, `webapp-testing`.
- **Mensageria:** `kafka-production-patterns`, `rabbitmq-production`.
- **Redis:** `redis-core`, `redis-clustering`, `redis-connections`, `redis-observability`, `redis-query-engine`, `redis-security`, `redis-semantic-cache`, `redis-vector-search`, `iris-development` — modelagem de dados/chaves, não de pastas.
- **MongoDB:** `mongodb-schema-design`, `mongodb-natural-language-querying`, `mongodb-query-optimizer`, `mongodb-connection`, `mongodb-search-and-ai`, `mongodb-atlas-stream-processing`, `mongodb-mcp-setup` — schema/queries.
- **Segurança:** `secure-code-guardian`, `spring-boot-security-jwt`.
- **DevOps / Cloud / Infra:** `devops-engineer`, `argocd-expert`, `kubernetes-specialist`, `chaos-engineer`, `azure-diagnostics`, `azure-messaging`, `azure-reliability`.
- **Fluxo / meta:** `creating-spec`, `to-prd`, `to-issues`, `to-prompt`, `skill-creator`, `skill-best-practices`, `git-rebase`, `no-workarounds`, `systematic-debugging`, `verification-before-completion`, `html-to-md`, `agents/task-reviewer`.

---

## 4. Como escolher a arquitetura neste projeto

1. **Padrão deste repositório (default):** camadas **BFF** (`controller → service → client`) — `folder-structure`. É a única **obrigatória** segundo o `AGENTS.md`.
2. **Microsserviço novo do zero, com domínio isolado:** considere `hexagonal-architecture`.
3. **Serviço com persistência própria orientado a CRUD/DDD:** `spring-boot-crud-patterns` (package-by-feature).
4. **Cenários distribuídos:** `microservices-architect`, `spring-boot-event-driven-patterns`, `spring-boot-saga-pattern`, `java-microservices`.
5. **Para mapear/auditar o que já existe:** `estrutura-pastas`, `architectural-analysis`, `refactoring-analysis`, `microservices-review`.
