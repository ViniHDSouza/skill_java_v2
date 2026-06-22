# Heurísticas para inferir a camada de uma pasta

Use estas pistas para classificar cada pasta/pacote. Combine sufixos de classe, anotações e nome da
pasta. Registre sempre o **nome real** da pasta no projeto; o mapeamento abaixo é só para inferir o
papel arquitetural.

## Por nome de pasta

| Pasta (ou similar)                        | Camada      |
|-------------------------------------------|-------------|
| `controller`, `resource`, `web`, `api`, `rest` | controller  |
| `service`, `usecase`, `application`, `domain/service` | service     |
| `client`, `gateway`, `integration`, `feign`, `adapter` | client      |
| `config`, `configuration`, `setup`        | config      |
| `exception`, `error`, `handler`, `advice` | exception   |
| `util`, `utils`, `helper`, `support`, `common` | util        |
| `monitoring`, `health`, `actuator`, `observability` | monitoring  |
| `repository`, `dao`, `persistence`, `entity`, `model` | persistence |
| `dto`, `vo`, `payload`, `record`          | dto         |
| `mapper`, `converter`, `translator`       | mapper      |

> `util`/`common`/`helper` são aceitáveis como camada de apoio, mas pacotes **genéricos** usados como
> depósito de tudo (`helpers`, `commons`, `misc`) são **anti-padrão** — registre como desvio.

## Por sufixo de classe

| Sufixo                         | Camada provável |
|--------------------------------|-----------------|
| `*Controller`, `*Resource`     | controller      |
| `*ControllerSwagger`           | controller (contrato OpenAPI) |
| `*Service`, `*UseCase`         | service         |
| `*Client`, `*Gateway`          | client (wrapper/adapter) |
| `*FeignClient`                 | client (interface HTTP) |
| `*Request`, `*Response`        | controller/dto (contrato público) |
| `*RequestDTO`, `*ResponseDTO`  | client/dto (contrato externo) |
| `*Mapper`, `*Converter`        | mapper          |
| `*Repository`, `*Dao`          | persistence     |
| `*Handler`, `*Advice`          | exception       |
| `*Config`, `*Configuration`    | config          |
| `*Util`, `*Utils`              | util            |
| `*Validator`                   | util (ConstraintValidator) |
| `*HealthIndicator`             | monitoring      |
| `*Enum`                        | apoio (códigos/constantes) |

## Por anotação (Java/Spring)

| Anotação                                   | Camada      |
|--------------------------------------------|-------------|
| `@RestController`, `@Controller`, `@RequestMapping` | controller  |
| `@Service`                                 | service     |
| `@FeignClient`                             | client      |
| `@Repository`                              | persistence |
| `@Configuration`, `@Bean`                  | config      |
| `@RestControllerAdvice`, `@ExceptionHandler` | exception   |
| `@Component` + sufixo `*Client`            | client      |
| `@Component implements HealthIndicator`    | monitoring  |

## Direção de dependência (referência)

Direção permitida (apenas para dentro): `controller → service → client`.
Pastas de apoio (`config`, `exception`, `util`, `monitoring`) podem ser usadas por qualquer camada.

Marque como **violação** quando observar:
- regra de negócio em `*Controller` ou `*FeignClient`;
- `*Controller` chamando `*Client`/`*FeignClient` direto (pulando `service`);
- DTO externo (`*ResponseDTO`) retornado direto pelo controller;
- tipos Feign/HTTP vazando para o `service`;
- pacotes genéricos (`helpers`, `commons`, `misc`) no lugar das camadas.
