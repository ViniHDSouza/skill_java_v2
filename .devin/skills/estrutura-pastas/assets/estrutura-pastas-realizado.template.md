# Estrutura de Pastas — Baseline da Arquitetura

> Documento **gerado** pela skill `estrutura-pastas`. É a baseline da arquitetura deste projeto:
> consulte-o ao criar, manter ou revisar código. Regenere após mudanças estruturais relevantes.
>
> - **Projeto/módulo:** `[nome do módulo ou serviço]`
> - **Stack:** `[ex.: Java 21 + Spring Boot 3.x (Maven)]`
> - **Pacote/raiz base:** `[ex.: com.exemplo.bff.pedido]`
> - **Diretório-fonte:** `[ex.: src/main/java/...]`
> - **Gerado em:** `[AAAA-MM-DD]`

## Visão geral

`[1–3 frases descrevendo a arquitetura do projeto: estilo (camadas BFF, hexagonal, etc.), propósito
do serviço e como as camadas se relacionam.]`

## Fluxo de requisição

```text
HTTP → controller → service → client → API externa
                         ▲
        (cada camada mapeia seus próprios DTOs via mappers)
```

`[Ajuste o diagrama ao fluxo real observado. Se o projeto não for BFF, descreva o fluxo equivalente.]`

## Árvore de diretórios

```text
[pacote.base]
├── controller/        [camada de entrada — HTTP]
├── service/           [camada de negócio]
├── client/            [camada de saída — integrações]
├── config/            [configuração e wiring do framework]
├── exception/         [tratamento centralizado de erros]
├── util/              [helpers transversais]
├── monitoring/        [health checks / observabilidade]
└── Application.java   [ponto de entrada @SpringBootApplication]
```

`[Substitua pela árvore real do projeto, mantendo os comentários do papel de cada pasta.]`

## O que cada pasta faz

| Pasta | Caminho | Camada | Responsabilidade | Exemplos de classes |
|-------|---------|--------|------------------|---------------------|
| `[controller]` | `[.../controller]` | controller | `[Recebe HTTP, valida entrada, delega ao service.]` | `[OrderController, OrderControllerSwagger]` |
| `[service]` | `[.../service]` | service | `[Regras de negócio e orquestração.]` | `[OrderService]` |
| `[client]` | `[.../client]` | client | `[Integração externa (Feign + wrapper).]` | `[OrderClient, OrderFeignClient]` |
| `[config]` | `[.../config]` | config | `[Beans e configuração do framework.]` | `[SwaggerConfig]` |
| `[exception]` | `[.../exception]` | exception | `[@RestControllerAdvice e payloads de erro.]` | `[OrderExceptionHandler, ErrorCodeEnum]` |
| `[util]` | `[.../util]` | util | `[Helpers estáticos e validadores.]` | `[DocumentValidationUtil]` |
| `[monitoring]` | `[.../monitoring]` | monitoring | `[Health indicators de dependências.]` | `[DependenciesHealthIndicator]` |

`[Adicione/remova linhas conforme as pastas reais. Para pastas fora do padrão, use a camada `outros`.]`

## Convenções de nomenclatura observadas

| Sufixo | Camada | Uso |
|--------|--------|-----|
| `[*Controller]` | `[controller]` | `[Endpoint REST]` |
| `[*Service]` | `[service]` | `[Orquestração de negócio]` |
| `[*Client / *FeignClient]` | `[client]` | `[Integração externa]` |
| `[*Request / *Response]` | `[controller/dto]` | `[Contrato público]` |
| `[*RequestDTO / *ResponseDTO]` | `[client/dto]` | `[Contrato externo]` |

`[Liste apenas as convenções realmente encontradas no projeto.]`

## Regras de dependência

- Direção permitida (apenas para dentro): `controller → service → client`.
- Pastas de apoio (`config`, `exception`, `util`, `monitoring`) podem ser usadas por qualquer camada.
- `[Registre aqui regras específicas observadas no projeto.]`

## Conformidade e anti-padrões

Comparação com o padrão prescritivo da skill `folder-structure`.

**Conformidades**
- `[Ex.: DTOs públicos e de integração separados e traduzidos por mappers.]`

**Desvios / anti-padrões detectados**
- `[Ex.: regra de negócio no controller X; pacote genérico `commons` usado como depósito.]`
- `[Se nenhum, escreva: "Nenhum desvio relevante detectado."]`

<!-- manual:inicio -->
## Notas manuais

`[Conteúdo escrito à mão; preservado entre regenerações desta baseline.]`
<!-- manual:fim -->
