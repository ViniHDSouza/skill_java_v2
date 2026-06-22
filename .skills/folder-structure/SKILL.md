---
name: folder-structure

description: 'Backend folder/package structure for layered Spring Boot BFF services (controller, service, client, config, exception, util, monitoring). Use when creating new services or endpoints, maintaining existing services, deciding where a class belongs, enforcing naming conventions and layer dependency rules, or performing code review. Triggers on: new feature, new endpoint, new Feign/HTTP client, DTO/mapper placement, exception handling, code review, package reorganization.'

argument-hint: 'Describe the service/endpoint/class you want to create, maintain, or review'
---
# Backend Folder Structure (Layered BFF)

This skill documents the standard package structure shared by the BFF (Backend for Frontend) Spring Boot services in this ecosystem.

Use it to ****create**** new services/endpoints, ****maintain**** existing ones, and ****review**** code consistently.

Apply the naming and method discipline from [code-standards.md](../../rules/code-standards.md).

Examples use a neutral placeholder base package `com.example.bff` and a neutral `Order` domain. Replace them with the real base package of the target service (e.g. `com.<company>.<product>.bff.<service>`).

## When to Use

- Creating a new BFF service or adding a new endpoint to an existing one.
- Deciding which package/layer a class belongs to (controller, service, client, DTO, mapper, config, util).
- Adding a new external integration (Feign/HTTP client).
- Standardizing exception handling, validation, or health checks.
- Reviewing a pull request for structural and naming consistency.

## Architecture Overview

These services follow a ****layered architecture**** with strict one-way dependencies. A request flows inward and a response flows back out:

```text

HTTP -> controller -> service -> client -> external API

                                   ^

        (each layer maps to its own DTOs via mappers)

```

- ****controller**** — transport layer (HTTP in/out, validation, public API contract).
- ****service**** — business orchestration and rules.
- ****client**** — outbound integration (Feign clients wrapped by adapters).
- ****config / exception / util / monitoring**** — cross-cutting support.

Public API DTOs (`controller/dto`) and integration DTOs (`client/dto`) are ****kept separate**** and translated by mappers, so the public contract never leaks the external API shape.

## Directory Structure

```text

com.example.bff

├── controller/                     [Input layer — HTTP]

│   ├── OrderController.java

│   ├── OrderControllerSwagger.java     (OpenAPI contract interface)

│   ├── dto/

│   │   ├── request/OrderRequest.java   (public API input — record)

│   │   └── response/OrderResponse.java (public API output — record)

│   └── mapper/OrderMapper.java         (Request/Response <-> client DTOs)

├── service/                        [Business layer]

│   └── OrderService.java

├── client/                         [Output layer — integrations]

│   ├── OrderClient.java                (wrapper/adapter over Feign)

│   ├── OrderFeignClient.java           (Feign HTTP interface)

│   ├── dto/

│   │   ├── request/OrderRequestDTO.java   (external API input)

│   │   └── response/OrderResponseDTO.java (external API output)

│   └── mapper/OrderClientMapper.java

├── exception/                      [Error handling]

│   ├── handler/OrderExceptionHandler.java  (@RestControllerAdvice)

│   ├── handler/dto/response/ApiErrorResponse.java

│   ├── dto/FieldValidationError.java

│   └── enums/ErrorCodeEnum.java

├── config/                         [Spring configuration & wiring]

│   └── SwaggerConfig.java

├── util/                           [Cross-cutting helpers]

│   ├── DocumentValidationUtil.java

│   └── DocumentValidator.java           (jakarta ConstraintValidator)

├── monitoring/                     [Health & observability]

│   ├── DependenciesHealthIndicator.java

│   └── entity/DependencyHealth.java

└── Application.java                [@SpringBootApplication]

```

When a service grows, group by feature ****inside**** each layer (e.g. `controller/order/`, `service/order/`) — never mix responsibilities across layers.

## Layer Reference

### controller

Receives HTTP requests, validates input, delegates to a service, and returns HTTP responses.

Keep the public API contract here. ****No business rules, no integration code.****

- `*Controller` — REST endpoints. Inject services via constructor.
- `*ControllerSwagger` — interface holding OpenAPI annotations to keep the controller clean.
- `dto/request/*Request`, `dto/response/*Response` — public contract (prefer Java `record`).
- `mapper/*Mapper` — translate public DTOs to/from client DTOs.

```java

package com.example.bff.controller;

 

@RestController

@RequestMapping("/orders")

@RequiredArgsConstructor

public class OrderController implements OrderControllerSwagger {

 

    private final OrderService orderService;

 

    @PostMapping

    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody OrderRequest request) {

        OrderResponse response = orderService.createOrder(request);

        return ResponseEntity.ok(response);

    }

}

```

### service

Holds business rules and orchestrates calls to one or more clients.

****No HTTP annotations, no Feign types.**** It returns/accepts domain-meaningful data, not transport details.

```java

package com.example.bff.service;

 

@Service

@RequiredArgsConstructor

public class OrderService {

 

    private final OrderClient orderClient;

    private final OrderMapper orderMapper;

 

    public OrderResponse createOrder(OrderRequest request) {

        OrderRequestDTO clientRequest = orderMapper.toClientRequest(request);

        OrderResponseDTO clientResponse = orderClient.createOrder(clientRequest);

        return orderMapper.toResponse(clientResponse);

    }

}

```

### client

Owns all outbound integration. A `*FeignClient` interface declares the HTTP call; a `*Client` wrapper adapts it (error handling, optionals, mapping).

This is the only layer that knows about external endpoints, headers, and external DTO shapes.

```java

package com.example.bff.client;

 

@FeignClient(name = "order-service", url = "${rest.order-service.url}")

public interface OrderFeignClient {

 

    @PostMapping("${rest.order-service.path}")

    OrderResponseDTO postOrder(

        @RequestHeader("Authorization") String authorization,

        @RequestBody OrderRequestDTO request);

}

```

```java

package com.example.bff.client;

 

@Component

@RequiredArgsConstructor

public class OrderClient {

 

    private final OrderFeignClient orderFeignClient;

 

    public OrderResponseDTO createOrder(OrderRequestDTO request) {

        return orderFeignClient.postOrder(buildAuthorization(), request);

    }

}

```

### exception

Centralized error handling via `@RestControllerAdvice`. Use `@Order` when multiple handlers exist (specific first, generic fallback last).

Error codes/messages live in an enum; error payloads live in `handler/dto/response`.

```java

package com.example.bff.exception.enums;

 

@Getter

@RequiredArgsConstructor

public enum ErrorCodeEnum {

 

    INTERNAL_ERROR("BFF-001", "Internal server error"),

    VALIDATION_ERROR("BFF-003", "Request validation error"),

    EXTERNAL_SERVICE_ERROR("BFF-004", "Error communicating with external service");

 

    private final String code;

    private final String message;

}

```

```java

package com.example.bff.exception.handler;

 

@RestControllerAdvice

@Order(Ordered.LOWEST_PRECEDENCE)

public class OrderExceptionHandler {

 

    @ExceptionHandler(FeignException.class)

    public ResponseEntity<ApiErrorResponse> handleFeign(FeignException exception) {

        ApiErrorResponse body = ApiErrorResponse.from(ErrorCodeEnum.EXTERNAL_SERVICE_ERROR);

        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(body);

    }

}

```

### config

`@Configuration` classes and `@Bean` definitions: Swagger/OpenAPI, health endpoints, custom serializers, conditional features.

Keep wiring here so other layers stay free of framework plumbing.

### util

Stateless helpers and custom validators only. `*Util` for static helpers, `*Validator` for jakarta `ConstraintValidator`, `*Constants` for constants.

No business orchestration and no integration calls.

### monitoring

Custom Spring Boot Actuator `HealthIndicator`s and their supporting entities for dependency health checks.

## Naming Conventions

| Suffix | Layer | Purpose |

|--------|-------|---------|

| `*Controller` | controller | REST endpoint class |

| `*ControllerSwagger` | controller | OpenAPI contract interface |

| `*Request` / `*Response` | controller/dto | Public API contract (records) |

| `*Mapper` | controller/mapper, client/mapper | DTO translation |

| `*Service` | service | Business orchestration |

| `*Client` | client | Wrapper/adapter over a Feign client |

| `*FeignClient` | client | Feign HTTP interface |

| `*RequestDTO` / `*ResponseDTO` | client/dto | External integration contract |

| `*Handler` | exception/handler | `@RestControllerAdvice` |

| `*ErrorResponse` / `Api*Response` | exception/handler/dto | Standard error payloads |

| `*Enum` | exception/enums | Error codes/messages |

| `*Config` | config | Spring configuration |

| `*Util` | util | Static helpers |

| `*Validator` | util | `ConstraintValidator` |

| `*HealthIndicator` | monitoring | Custom health check |

Classes use PascalCase. Methods start with a verb (see [code-standards.md](../../rules/code-standards.md)).

## Where Does This Class Go?

| I need to... | Put it in | Suffix |

|--------------|-----------|--------|

| Expose a new HTTP endpoint | `controller` | `*Controller` |

| Define the public request/response body | `controller/dto/request` or `response` | `*Request` / `*Response` |

| Add business logic / orchestration | `service` | `*Service` |

| Call an external API | `client` (+ `*FeignClient`) | `*Client` / `*FeignClient` |

| Define the external API body | `client/dto/request` or `response` | `*RequestDTO` / `*ResponseDTO` |

| Convert between DTOs | nearest `mapper` package | `*Mapper` |

| Handle an exception globally | `exception/handler` | `*Handler` |

| Add an error code/message | `exception/enums` | `*Enum` |

| Register a bean / framework config | `config` | `*Config` |

| Add a reusable static helper | `util` | `*Util` |

| Add a bean-validation rule | `util` | `*Validator` |

| Add a dependency health check | `monitoring` | `*HealthIndicator` |

## Dependency Rules

Allowed direction (inward only): `controller -> service -> client`.

Support packages (`config`, `exception`, `util`, `monitoring`) may be used by any layer.

- `controller` may depend on `service`, never on `client` directly.
- `service` may depend on `client`, never on `controller`.
- `client` must not depend on `service` or `controller`.
- Public DTOs (`controller/dto`) must not be sent to external APIs; map to `client/dto` first.
- External DTOs (`client/dto`) must not be returned to HTTP callers; map to `controller/dto` first.

### Anti-patterns to Reject

- Business rules inside a `*Controller` or `*FeignClient`.
- A `*Controller` calling a `*FeignClient`/`*Client` directly (skipping `service`).
- Returning `client/dto` (`*ResponseDTO`) straight from a controller.
- Feign/HTTP types (`FeignException`, headers) leaking into `service`.
- Try/catch for integration errors scattered across layers instead of centralized `@RestControllerAdvice`.
- "God" services mixing multiple unrelated use cases (split by feature instead).
- Generic packages like `helpers`, `commons`, `misc` instead of the layers above.

## Creating a New Endpoint (Step by Step)

1. ****Contract**** — add `OrderRequest` / `OrderResponse` records in `controller/dto`.
2. ****External contract**** — add `OrderRequestDTO` / `OrderResponseDTO` in `client/dto` matching the external API.
3. ****Integration**** — add `OrderFeignClient` (HTTP interface) and `OrderClient` (wrapper) in `client`.
4. ****Business**** — add `OrderService` orchestrating the client; inject the client and mapper.
5. ****Mapping**** — add mappers to translate public <-> external DTOs.
6. ****Controller**** — add `OrderController` (+ `OrderControllerSwagger`) that validates input and calls the service.
7. ****Errors**** — add any new code to `ErrorCodeEnum`; rely on the existing `@RestControllerAdvice`.
8. ****Config**** — externalize URLs/paths in `application-*.yml` under `rest.*`; add beans in `config` if needed.

## Code Review Checklist

****Structure & placement****

- [ ] Each class is in the correct layer/package with the right suffix.
- [ ] Dependency direction respected (`controller -> service -> client`); no skips.
- [ ] Public and external DTOs are separate and translated via mappers.

****Per layer****

- [ ] Controller: no business logic; input validated (`@Valid`); returns public DTOs only.
- [ ] Service: no HTTP/Feign types; orchestration only; method starts with a verb.
- [ ] Client: owns all external endpoints/headers; no business rules.
- [ ] Exceptions: handled centrally via `@RestControllerAdvice`; codes in `ErrorCodeEnum`.
- [ ] Util: stateless; no integration/business calls.

 ****Conventions (also enforce [code-standards.md](** ../../rules/code-standards.md**))****

- [ ] English names; clear, intention-revealing identifiers.
- [ ] Methods <= 30 lines, <= 3 parameters, <= 2 nesting levels, no `switch/case`.
- [ ] Constructor injection (`@RequiredArgsConstructor`) over field injection.
- [ ] URLs/paths externalized in `application-*.yml`, not hardcoded.

## Enforcement

This structure is mandatory. As reinforced in [AGENTS.md](../../../AGENTS.md), all agents and contributors must apply it when creating, maintaining, reorganizing, or reviewing backend modules in these services.
