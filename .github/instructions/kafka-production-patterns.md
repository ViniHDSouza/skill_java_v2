---
applyWhen: "Implement production-grade Apache Kafka patterns in Java/Spring Boot microservices.   Use this skill when implementing Kafka producers or consumers, configuring Dead Letter Queue (DLQ),   retry strategies, idempotent producers, exactly-once semantics, Outbox Pattern, Saga choreography   via Kafka, consumer group management, message ordering, partition strategies, schema registry   with Avro, Spring Kafka @KafkaListener, KafkaTemplate, error handlers, backoff policies,   or when debugging consumer lag, rebalancing, or message loss issues.   Always use this skill for any Kafka configuration or production troubleshooting in Java. --- ---  ## Dead Letter Queue (DLQ) — Padrão Completo  ### Configuração do Error Handler com DLQ ```java @Configuration public class KafkaConfig {      @Bean     public DefaultErrorHandler errorHandler(KafkaTemplate<String, Object> kafkaTemplate) {         // Política de retry: 3 tentativas com backoff exponencial         ExponentialBackOffWithMaxRetries backoff = new ExponentialBackOffWithMaxRetries(3);         backoff.setInitialInterval(1_000L);    // 1 segundo inicial         backoff.setMultiplier(2.0);            // dobra a cada retry         backoff.setMaxInterval(30_000L);       // máximo 30 segundos          // DeadLetterPublishingRecoverer envia para tópico -dlt automaticamente         DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(             kafkaTemplate,             (record, exception) -> {                 log.error("Mensagem enviada para DLT após retries: topic={}, key={}, error={}",                     record.topic(), record.key(), exception.getMessage());                 // Destino: {topico-original}.DLT                 return new TopicPartition(record.topic() + ".DLT", record.partition());             }         );          DefaultErrorHandler handler = new DefaultErrorHandler(recoverer, backoff);          // Erros não retriáveis — vão direto para DLT sem retry         handler.addNotRetryableExceptions(             JsonParseException.class,             InvalidPayloadException.class,             DataIntegrityViolationException.class         );          return handler;     }      @Bean     public ConcurrentKafkaListenerContainerFactory<String, Object> kafkaListenerContainerFactory(             ConsumerFactory<String, Object> consumerFactory,             DefaultErrorHandler errorHandler) {          ConcurrentKafkaListenerContainerFactory<String, Object> factory =             new ConcurrentKafkaListenerContainerFactory<>();         factory.setConsumerFactory(consumerFactory);         factory.setCommonErrorHandler(errorHandler);         factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.RECORD);         factory.setConcurrency(3);  // número de threads = número de partições idealmente         return factory;     } } ```  ### Consumer com Tratamento Robusto ```java @Component @RequiredArgsConstructor @Slf4j public class OrderEventConsumer {      private final OrderService orderService;     private final MeterRegistry meterRegistry;      @KafkaListener(         topics = "${kafka.topics.orders}",         groupId = "${spring.application.name}",         containerFactory = "kafkaListenerContainerFactory"     )     public void consume(             @Payload OrderCreatedEvent event,             @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,             @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,             @Header(KafkaHeaders.OFFSET) long offset,             Acknowledgment ack) {          log.info("Processando evento: topic={}, partition={}, offset={}, orderId={}",             topic, partition, offset, event.orderId());          try {             orderService.processOrderCreated(event);             ack.acknowledge();  // commit manual apenas após sucesso             meterRegistry.counter("kafka.messages.processed", "topic", topic).increment();         } catch (RetryableException e) {             log.warn("Erro retriável, será tentado novamente: {}", e.getMessage());             throw e;  // DefaultErrorHandler vai retentar         } catch (Exception e) {             log.error("Erro não retriável ao processar mensagem: offset={}", offset, e);             ack.acknowledge();  // acknowledging para não reprocessar — vai para DLT via error handler             throw new NonRetryableException("Erro permanente", e);         }     }      // Consumer dedicado para processar a DLQ (Dead Letter Topic)     @KafkaListener(         topics = "${kafka.topics.orders}.DLT",         groupId = "${spring.application.name}-dlt"     )     public void consumeDlt(             @Payload String rawMessage,             @Header Map<String, Object> headers) {          log.error("Mensagem na DLT — requer atenção manual: headers={}", headers);         // Salvar em banco para análise, alertar time, ou reprocessar manualmente         dlqRepository.save(new DlqEntry(rawMessage, headers));     } } ```  --- ---  ## Outbox Pattern — Consistência Transacional Garantida  ``` PROBLEMA: Salvar no banco E publicar no Kafka atomicamente é impossível sem Outbox. SOLUÇÃO: Salvar o evento na mesma transação do banco, publicar assincronamente. ```  ### Implementação com Spring + JPA ```java // 1. Tabela de outbox @Entity @Table(name = "outbox_events") public class OutboxEvent {     @Id private UUID id;     @Column(nullable = false) private String aggregateType;   // "Order"     @Column(nullable = false) private String aggregateId;     // orderId     @Column(nullable = false) private String eventType;       // "OrderCreated"     @Column(columnDefinition = "jsonb") private String payload;     @Column(nullable = false) private Instant createdAt;     @Column private Instant processedAt;     @Enumerated(EnumType.STRING) private OutboxStatus status; // PENDING, SENT, FAILED }  // 2. Service: salva pedido + evento na mesma transação @Service @RequiredArgsConstructor public class OrderService {     private final OrderRepository orderRepository;     private final OutboxEventRepository outboxRepository;      @Transactional     public Order createOrder(CreateOrderCommand cmd) {         Order order = Order.create(cmd);         orderRepository.save(order);          // Evento vai para outbox na MESMA transação — atomicidade garantida         outboxRepository.save(OutboxEvent.builder()             .id(UUID.randomUUID())             .aggregateType("Order")             .aggregateId(order.getId().toString())             .eventType("OrderCreated")             .payload(serialize(new OrderCreatedEvent(order)))             .createdAt(Instant.now())             .status(OutboxStatus.PENDING)             .build());          return order;     } }  // 3. Publisher: lê outbox e publica no Kafka @Component @RequiredArgsConstructor @Slf4j public class OutboxEventPublisher {      private final OutboxEventRepository outboxRepository;     private final KafkaTemplate<String, Object> kafkaTemplate;      @Scheduled(fixedDelay = 1000)  // a cada 1 segundo     @Transactional     public void publishPendingEvents() {         List<OutboxEvent> pending = outboxRepository             .findTop100ByStatusOrderByCreatedAtAsc(OutboxStatus.PENDING);          for (OutboxEvent event : pending) {             try {                 kafkaTemplate.send(                     topicFor(event.getEventType()),                     event.getAggregateId(),                     event.getPayload()                 ).get(5, TimeUnit.SECONDS);  // síncrono para garantir envio                  event.markAsSent();                 outboxRepository.save(event);             } catch (Exception e) {                 log.error("Falha ao publicar outbox event: id={}", event.getId(), e);                 event.markAsFailed(e.getMessage());                 outboxRepository.save(event);             }         }     } } ```  --- ---  ## Consumer Scaling — Monitoramento de Lag  ```java // Métricas de lag via Micrometer (auto-configurado com Spring Kafka + Actuator) // Disponível em /actuator/metrics/kafka.consumer.fetch-latency-avg // e /actuator/metrics/kafka.consumer.records-lag-max  // Configuração para expor métricas de lag @Bean public MeterBinder kafkaConsumerMetrics(ConsumerFactory<?, ?> consumerFactory) {     return new KafkaClientMetrics(consumerFactory.createConsumer()); } ```  ```yaml # Alertas recomendados (Prometheus/Grafana) # - consumer lag > 1000 mensagens por 5 minutos → alerta # - rebalance rate > 1 por minuto → investigar # - error rate > 1% → alerta ```  ---"
---


# Kafka Production Patterns — Java/Spring Boot

## Configuração Base de Produção

```yaml
# application.yml
spring:
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      acks: all                    # aguarda confirmação de todos ISR replicas
      retries: 3
      properties:
        enable.idempotence: true   # garante exactly-once na produção
        max.in.flight.requests.per.connection: 5
        compression.type: snappy
    consumer:
      group-id: ${spring.application.name}
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.ErrorHandlingDeserializer
      properties:
        spring.deserializer.value.delegate.class: >
          org.springframework.kafka.support.serializer.JsonDeserializer
        spring.json.trusted.packages: "com.empresa.*"
      auto-offset-reset: earliest
      enable-auto-commit: false    # NUNCA use auto-commit em produção
      max-poll-records: 100
```

---

## Dead Letter Queue (DLQ) — Padrão Completo

### Configuração do Error Handler com DLQ
```java
@Configuration
public class KafkaConfig {

    @Bean
    public DefaultErrorHandler errorHandler(KafkaTemplate<String, Object> kafkaTemplate) {
        // Política de retry: 3 tentativas com backoff exponencial
        ExponentialBackOffWithMaxRetries backoff = new ExponentialBackOffWithMaxRetries(3);
        backoff.setInitialInterval(1_000L);    // 1 segundo inicial
        backoff.setMultiplier(2.0);            // dobra a cada retry
        backoff.setMaxInterval(30_000L);       // máximo 30 segundos

        // DeadLetterPublishingRecoverer envia para tópico -dlt automaticamente
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(
            kafkaTemplate,
            (record, exception) -> {
                log.error("Mensagem enviada para DLT após retries: topic={}, key={}, error={}",
                    record.topic(), record.key(), exception.getMessage());
                // Destino: {topico-original}.DLT
                return new TopicPartition(record.topic() + ".DLT", record.partition());
            }
        );

        DefaultErrorHandler handler = new DefaultErrorHandler(recoverer, backoff);

        // Erros não retriáveis — vão direto para DLT sem retry
        handler.addNotRetryableExceptions(
            JsonParseException.class,
            InvalidPayloadException.class,
            DataIntegrityViolationException.class
        );

        return handler;
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> kafkaListenerContainerFactory(
            ConsumerFactory<String, Object> consumerFactory,
            DefaultErrorHandler errorHandler) {

        ConcurrentKafkaListenerContainerFactory<String, Object> factory =
            new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.setCommonErrorHandler(errorHandler);
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.RECORD);
        factory.setConcurrency(3);  // número de threads = número de partições idealmente
        return factory;
    }
}
```

### Consumer com Tratamento Robusto
```java
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventConsumer {

    private final OrderService orderService;
    private final MeterRegistry meterRegistry;

    @KafkaListener(
        topics = "${kafka.topics.orders}",
        groupId = "${spring.application.name}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void consume(
            @Payload OrderCreatedEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset,
            Acknowledgment ack) {

        log.info("Processando evento: topic={}, partition={}, offset={}, orderId={}",
            topic, partition, offset, event.orderId());

        try {
            orderService.processOrderCreated(event);
            ack.acknowledge();  // commit manual apenas após sucesso
            meterRegistry.counter("kafka.messages.processed", "topic", topic).increment();
        } catch (RetryableException e) {
            log.warn("Erro retriável, será tentado novamente: {}", e.getMessage());
            throw e;  // DefaultErrorHandler vai retentar
        } catch (Exception e) {
            log.error("Erro não retriável ao processar mensagem: offset={}", offset, e);
            ack.acknowledge();  // acknowledging para não reprocessar — vai para DLT via error handler
            throw new NonRetryableException("Erro permanente", e);
        }
    }

    // Consumer dedicado para processar a DLQ (Dead Letter Topic)
    @KafkaListener(
        topics = "${kafka.topics.orders}.DLT",
        groupId = "${spring.application.name}-dlt"
    )
    public void consumeDlt(
            @Payload String rawMessage,
            @Header Map<String, Object> headers) {

        log.error("Mensagem na DLT — requer atenção manual: headers={}", headers);
        // Salvar em banco para análise, alertar time, ou reprocessar manualmente
        dlqRepository.save(new DlqEntry(rawMessage, headers));
    }
}
```

---

## Idempotência — Garantindo Exactly-Once

### Produtor Idempotente
```java
@Service
@RequiredArgsConstructor
public class OrderEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishOrderCreated(Order order) {
        OrderCreatedEvent event = new OrderCreatedEvent(
            order.getId().toString(),   // correlationId único
            order.getCustomerId().toString(),
            order.getTotalAmount(),
            Instant.now()
        );

        // Chave = orderId garante que mensagens do mesmo pedido vão à mesma partição
        // (message ordering por entidade)
        CompletableFuture<SendResult<String, Object>> future =
            kafkaTemplate.send("orders.created", order.getId().toString(), event);

        future.whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("Falha ao publicar evento: orderId={}", order.getId(), ex);
                throw new KafkaPublishException("Falha ao publicar OrderCreatedEvent", ex);
            }
            log.info("Evento publicado: topic={}, partition={}, offset={}",
                result.getRecordMetadata().topic(),
                result.getRecordMetadata().partition(),
                result.getRecordMetadata().offset());
        });
    }
}
```

### Consumer Idempotente (Deduplicação)
```java
@Service
@RequiredArgsConstructor
public class IdempotentOrderProcessor {

    private final ProcessedEventRepository processedEventRepo;
    private final OrderRepository orderRepository;

    @Transactional
    public void processOrderCreated(OrderCreatedEvent event) {
        String eventId = event.orderId() + "_" + event.occurredAt().toEpochMilli();

        // Verifica se já processou este evento
        if (processedEventRepo.existsByEventId(eventId)) {
            log.info("Evento já processado, ignorando: eventId={}", eventId);
            return;
        }

        // Processamento real
        orderRepository.save(Order.from(event));

        // Registra como processado (atomicamente na mesma transação)
        processedEventRepo.save(new ProcessedEvent(eventId, Instant.now()));
    }
}

// Entidade de controle de deduplicação
@Entity
@Table(name = "processed_events",
    indexes = @Index(columnList = "event_id", unique = true))
public class ProcessedEvent {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "event_id", unique = true, nullable = false)
    private String eventId;

    @Column(nullable = false)
    private Instant processedAt;

    // Expirar registros antigos via job ou TTL no banco
}
```

---

## Outbox Pattern — Consistência Transacional Garantida

```
PROBLEMA: Salvar no banco E publicar no Kafka atomicamente é impossível sem Outbox.
SOLUÇÃO: Salvar o evento na mesma transação do banco, publicar assincronamente.
```

### Implementação com Spring + JPA
```java
// 1. Tabela de outbox
@Entity
@Table(name = "outbox_events")
public class OutboxEvent {
    @Id private UUID id;
    @Column(nullable = false) private String aggregateType;   // "Order"
    @Column(nullable = false) private String aggregateId;     // orderId
    @Column(nullable = false) private String eventType;       // "OrderCreated"
    @Column(columnDefinition = "jsonb") private String payload;
    @Column(nullable = false) private Instant createdAt;
    @Column private Instant processedAt;
    @Enumerated(EnumType.STRING) private OutboxStatus status; // PENDING, SENT, FAILED
}

// 2. Service: salva pedido + evento na mesma transação
@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final OutboxEventRepository outboxRepository;

    @Transactional
    public Order createOrder(CreateOrderCommand cmd) {
        Order order = Order.create(cmd);
        orderRepository.save(order);

        // Evento vai para outbox na MESMA transação — atomicidade garantida
        outboxRepository.save(OutboxEvent.builder()
            .id(UUID.randomUUID())
            .aggregateType("Order")
            .aggregateId(order.getId().toString())
            .eventType("OrderCreated")
            .payload(serialize(new OrderCreatedEvent(order)))
            .createdAt(Instant.now())
            .status(OutboxStatus.PENDING)
            .build());

        return order;
    }
}

// 3. Publisher: lê outbox e publica no Kafka
@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxEventPublisher {

    private final OutboxEventRepository outboxRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Scheduled(fixedDelay = 1000)  // a cada 1 segundo
    @Transactional
    public void publishPendingEvents() {
        List<OutboxEvent> pending = outboxRepository
            .findTop100ByStatusOrderByCreatedAtAsc(OutboxStatus.PENDING);

        for (OutboxEvent event : pending) {
            try {
                kafkaTemplate.send(
                    topicFor(event.getEventType()),
                    event.getAggregateId(),
                    event.getPayload()
                ).get(5, TimeUnit.SECONDS);  // síncrono para garantir envio

                event.markAsSent();
                outboxRepository.save(event);
            } catch (Exception e) {
                log.error("Falha ao publicar outbox event: id={}", event.getId(), e);
                event.markAsFailed(e.getMessage());
                outboxRepository.save(event);
            }
        }
    }
}
```

---

## Saga com Kafka — Choreography Pattern

```java
// Cada serviço reage a eventos e publica o próximo
// Order Service
@KafkaListener(topics = "payments.confirmed")
@Transactional
public void onPaymentConfirmed(PaymentConfirmedEvent event) {
    Order order = orderRepository.findById(event.orderId()).orElseThrow();
    order.confirm();
    orderRepository.save(order);

    // Publica próximo evento da saga
    outboxRepository.save(OutboxEvent.of("OrderConfirmed", order));
}

@KafkaListener(topics = "payments.failed")
@Transactional
public void onPaymentFailed(PaymentFailedEvent event) {
    // Transação compensatória
    Order order = orderRepository.findById(event.orderId()).orElseThrow();
    order.cancel("Pagamento recusado");
    orderRepository.save(order);
    outboxRepository.save(OutboxEvent.of("OrderCancelled", order));
}
```

---

## Consumer Scaling — Monitoramento de Lag

```java
// Métricas de lag via Micrometer (auto-configurado com Spring Kafka + Actuator)
// Disponível em /actuator/metrics/kafka.consumer.fetch-latency-avg
// e /actuator/metrics/kafka.consumer.records-lag-max

// Configuração para expor métricas de lag
@Bean
public MeterBinder kafkaConsumerMetrics(ConsumerFactory<?, ?> consumerFactory) {
    return new KafkaClientMetrics(consumerFactory.createConsumer());
}
```

```yaml
# Alertas recomendados (Prometheus/Grafana)
# - consumer lag > 1000 mensagens por 5 minutos → alerta
# - rebalance rate > 1 por minuto → investigar
# - error rate > 1% → alerta
```

---

## Checklist Kafka em Produção

### Produtor
- [ ] `enable.idempotence=true`
- [ ] `acks=all`
- [ ] Chave de mensagem definida (para ordering e particionamento)
- [ ] Outbox Pattern para publicação transacional segura

### Consumidor
- [ ] `enable-auto-commit=false`
- [ ] Acknowledge manual após processamento bem-sucedido
- [ ] DLQ configurada com `DeadLetterPublishingRecoverer`
- [ ] Retry com backoff exponencial
- [ ] Idempotência garantida (tabela de eventos processados)
- [ ] Consumer group por serviço

### Operacional
- [ ] Monitoramento de consumer lag
- [ ] Alertas configurados para DLQ com mensagens
- [ ] Job de monitoramento da tabela outbox (stuck events)
- [ ] Schema Registry para controle de compatibilidade (recomendado para produção)

## Referências

- Retry e backoff avançado: `references/retry-strategies.md`
- Avro e Schema Registry: `references/schema-registry.md`
- Tuning de performance: `references/kafka-performance.md`
