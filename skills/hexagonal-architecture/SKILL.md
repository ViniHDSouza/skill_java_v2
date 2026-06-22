---
name: hexagonal-architecture
description: >
  Apply Hexagonal Architecture (Ports & Adapters) in Java 17/21 Spring Boot microservices.
  Use this skill when creating a new microservice from scratch, refactoring a layered architecture
  to hexagonal, implementing domain-driven design with clean separation of concerns, defining
  ports and adapters, building use cases, or when the user mentions "hexagonal", "ports and adapters",
  "clean architecture", "domain isolation", "adapter pattern", "inbound/outbound ports",
  "application service", "domain model", or wants to avoid coupling between domain and infrastructure.
  Always use this skill for any Java microservice architecture discussion.
---

# Hexagonal Architecture — Java 17/21 + Spring Boot


## Filosofia Central

> **O domínio não conhece o mundo externo. O mundo externo se adapta ao domínio.**

A arquitetura hexagonal isola completamente o núcleo de negócio (domínio + casos de uso) de frameworks, bancos de dados, mensageria e interfaces externas. O Spring Boot existe apenas na camada de adaptadores — nunca no domínio.

## Estrutura de Pacotes

```
com.empresa.servico/
├── domain/                          # Núcleo — zero dependências externas
│   ├── model/                       # Entidades, Value Objects, Aggregates
│   │   ├── Order.java
│   │   ├── OrderId.java             # Value Object
│   │   └── OrderStatus.java         # Enum de domínio
│   ├── port/
│   │   ├── in/                      # Portas de ENTRADA (driven by external)
│   │   │   ├── CreateOrderUseCase.java
│   │   │   └── GetOrderUseCase.java
│   │   └── out/                     # Portas de SAÍDA (driving external)
│   │       ├── OrderRepository.java
│   │       └── OrderEventPublisher.java
│   ├── service/                     # Casos de uso — implementam portas IN
│   │   └── OrderService.java
│   └── exception/                   # Exceções de domínio
│       ├── OrderNotFoundException.java
│       └── InvalidOrderException.java
│
├── application/                     # Orquestra o domínio (opcional)
│   └── usecase/
│       └── CreateOrderUseCaseImpl.java
│
└── adapter/
    ├── in/                          # Adaptadores de ENTRADA
    │   ├── web/                     # REST Controllers
    │   │   ├── OrderController.java
    │   │   └── dto/
    │   │       ├── CreateOrderRequest.java
    │   │       └── OrderResponse.java
    │   └── messaging/               # Consumers (Kafka/RabbitMQ)
    │       └── OrderEventConsumer.java
    └── out/                         # Adaptadores de SAÍDA
        ├── persistence/             # JPA / banco de dados
        │   ├── OrderJpaAdapter.java
        │   ├── entity/
        │   │   └── OrderEntity.java
        │   ├── repository/
        │   │   └── OrderJpaRepository.java
        │   └── mapper/
        │       └── OrderMapper.java
        └── messaging/               # Producers (Kafka/RabbitMQ)
            └── OrderKafkaAdapter.java
```

## Regras Fundamentais

### 1. Direção das Dependências
```
Adapter IN → Domain ← Adapter OUT
              ↑
         Application
```
- **NUNCA** o domínio importa classes Spring, JPA, Kafka, ou qualquer framework
- **NUNCA** um adapter IN conhece um adapter OUT diretamente
- **SEMPRE** use interfaces (portas) para cruzar fronteiras

### 2. Portas de Entrada (Inbound Ports)
```java
// domain/port/in/CreateOrderUseCase.java
public interface CreateOrderUseCase {
    Order execute(CreateOrderCommand command);
}

// Comando como Value Object imutável
public record CreateOrderCommand(
    CustomerId customerId,
    List<OrderItem> items
) {}
```

### 3. Portas de Saída (Outbound Ports)
```java
// domain/port/out/OrderRepository.java
public interface OrderRepository {
    Order save(Order order);
    Optional<Order> findById(OrderId id);
    List<Order> findByCustomerId(CustomerId customerId);
}

// domain/port/out/OrderEventPublisher.java
public interface OrderEventPublisher {
    void publish(OrderCreatedEvent event);
}
```

### 4. Serviço de Domínio (implementa porta IN, usa portas OUT)
```java
// domain/service/OrderService.java
@Service
@RequiredArgsConstructor
public class OrderService implements CreateOrderUseCase, GetOrderUseCase {

    private final OrderRepository orderRepository;       // porta OUT
    private final OrderEventPublisher eventPublisher;    // porta OUT

    @Override
    @Transactional
    public Order execute(CreateOrderCommand command) {
        // Lógica de negócio pura — zero Spring, zero JPA
        Order order = Order.create(command.customerId(), command.items());
        Order saved = orderRepository.save(order);
        eventPublisher.publish(new OrderCreatedEvent(saved.getId()));
        return saved;
    }
}
```

### 5. Adapter de Entrada (Controller)
```java
// adapter/in/web/OrderController.java
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final CreateOrderUseCase createOrderUseCase;  // injeta porta, não serviço

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(@Valid @RequestBody CreateOrderRequest request) {
        CreateOrderCommand command = new CreateOrderCommand(
            new CustomerId(request.customerId()),
            request.items().stream().map(this::toItem).toList()
        );
        Order order = createOrderUseCase.execute(command);
        return OrderResponse.from(order);
    }
}
```

### 6. Adapter de Saída (JPA)
```java
// adapter/out/persistence/OrderJpaAdapter.java
@Component
@RequiredArgsConstructor
public class OrderJpaAdapter implements OrderRepository {  // implementa porta OUT

    private final OrderJpaRepository jpaRepository;
    private final OrderMapper mapper;

    @Override
    public Order save(Order order) {
        OrderEntity entity = mapper.toEntity(order);
        OrderEntity saved = jpaRepository.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<Order> findById(OrderId id) {
        return jpaRepository.findById(id.value()).map(mapper::toDomain);
    }
}
```

## Value Objects — Identidade Forte no Domínio
```java
// Prefira records para Value Objects imutáveis
public record OrderId(UUID value) {
    public OrderId {
        Objects.requireNonNull(value, "OrderId não pode ser nulo");
    }

    public static OrderId generate() {
        return new OrderId(UUID.randomUUID());
    }

    public static OrderId of(String value) {
        return new OrderId(UUID.fromString(value));
    }
}
```

## Configuração Spring Boot (Wiring)
```java
// NÃO use @Component no domínio — configure no adapter ou via @Bean
@Configuration
public class OrderConfig {

    @Bean
    public CreateOrderUseCase createOrderUseCase(
            OrderRepository repository,
            OrderEventPublisher publisher) {
        return new OrderService(repository, publisher);
    }
}
```

## Testes por Camada

### Domínio (sem Spring, instantâneo)
```java
@Test
void deve_criar_pedido_com_itens_validos() {
    // Mocks das portas OUT
    OrderRepository repository = mock(OrderRepository.class);
    OrderEventPublisher publisher = mock(OrderEventPublisher.class);
    when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    OrderService service = new OrderService(repository, publisher);
    CreateOrderCommand command = new CreateOrderCommand(
        new CustomerId(UUID.randomUUID()),
        List.of(new OrderItem(ProductId.generate(), 2, Money.of(50)))
    );

    Order order = service.execute(command);

    assertThat(order.getStatus()).isEqualTo(OrderStatus.PENDING);
    verify(publisher).publish(any(OrderCreatedEvent.class));
}
```

### Adapter Web (MockMvc)
```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {
    @MockBean CreateOrderUseCase createOrderUseCase;

    @Test
    void deve_retornar_201_ao_criar_pedido() throws Exception {
        // arrange + act + assert com MockMvc
    }
}
```

### Adapter Persistência (Testcontainers)
```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = NONE)
@Testcontainers
class OrderJpaAdapterTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");
    // testa apenas o adapter, não o domínio
}
```

## Checklist de Conformidade

- [ ] Domínio não importa `org.springframework`, `javax.persistence`, `org.apache.kafka`
- [ ] Portas são interfaces no pacote `domain/port/`
- [ ] Serviços de domínio implementam portas IN e recebem portas OUT via construtor
- [ ] Controllers injetam portas IN (interfaces), nunca serviços diretamente
- [ ] Adapters de saída implementam portas OUT
- [ ] Mappers convertem entre domain model e entity/dto nos adapters
- [ ] Testes de domínio não usam `@SpringBootTest`
- [ ] Value Objects são imutáveis (records ou final fields)

## Referências Detalhadas

- Para padrões DDD (Aggregates, Events): `references/ddd-patterns.md`
- Para integração com Kafka/RabbitMQ nos adapters: `references/messaging-adapters.md`
- Para exemplos de testes por camada: `references/testing-layers.md`
