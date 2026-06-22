---
name: estrutura-pastas
description: 'Mapeia e documenta a estrutura real de pastas/pacotes do backend do projeto atual e a responsabilidade de cada pasta, gerando o arquivo `.estrutura-pastas-realizado.md` na raiz como baseline da arquitetura. Use ao iniciar ou assumir um projeto backend, mapear/registrar a arquitetura existente, fazer onboarding, padronizar a documentação de estrutura, ou antes de criar novas features e endpoints. Aciona em: mapear estrutura, documentar arquitetura, estrutura de pastas, baseline de arquitetura, onboarding backend, o que cada pasta faz, organização de pacotes.'
argument-hint: 'Caminho do módulo/projeto backend a mapear (opcional; por padrão, a raiz atual)'
---

> **Referência de estrutura do projeto:** [folder-structure](../../../.skills/folder-structure/SKILL.md) — padrão prescritivo das camadas BFF.

# Estrutura de Pastas (Baseline da Arquitetura)

Esta skill **inspeciona o projeto backend atual**, descreve **a estrutura real de pastas/pacotes** e
**o papel de cada pasta**, e grava o resultado em **`.estrutura-pastas-realizado.md`** na raiz do
projeto. Esse arquivo passa a ser a **baseline da arquitetura** — a referência consultada ao criar,
manter ou revisar código.

Diferença em relação à skill `folder-structure`:

- `folder-structure` é **prescritiva**: define o padrão ideal (camadas BFF `controller → service → client`).
- `estrutura-pastas` é **descritiva**: documenta **o que o projeto realmente tem** e confronta com esse padrão.

## Quando usar

- Ao iniciar ou assumir um projeto backend e precisar entender/registrar a arquitetura existente.
- Onboarding de novas pessoas: dar um mapa claro de onde cada coisa fica.
- Antes de criar uma nova feature/endpoint, para decidir onde cada classe entra.
- Para gerar/atualizar a baseline arquitetural versionada (`.estrutura-pastas-realizado.md`).

## Procedimentos

**Passo 1: Detectar o projeto e o layout de código**
1. Identifique a raiz do backend. Se a skill receber um caminho como argumento, use-o; senão, use a
   raiz atual.
2. Descubra a stack e o diretório-fonte. Para Java/Spring Boot, procure `pom.xml`/`build.gradle` e
   `src/main/java/<pacote-base>`. Em outras stacks, localize o diretório-fonte equivalente
   (ex.: `src/`, `app/`, `internal/`).
3. Determine o **pacote/raiz base** (ex.: `com.<empresa>.<produto>.bff.<servico>`).
4. Se houver **múltiplos módulos/serviços**, trate **um por seção** no relatório.

**Passo 2: Mapear a árvore de pastas**
1. Liste as pastas/pacotes de **1º e 2º níveis** sob o diretório-fonte (use Glob/listagem, não leia
   todos os arquivos).
2. Para cada pasta, colete **classes representativas** (2–4 exemplos) a partir dos nomes dos arquivos.
3. Ignore ruído: `target/`, `build/`, `node_modules/`, `.git/`, testes gerados, etc.

**Passo 3: Classificar e descrever cada pasta**
1. Para cada pasta, **classifique a camada** com base em nomes e conteúdo:
   `controller`, `service`, `client`, `config`, `exception`, `util`, `monitoring` — ou a camada
   equivalente que o projeto realmente usa (registre o nome real, não force o padrão).
2. Descreva, em uma frase, **a responsabilidade** da pasta (o que ela faz no projeto).
3. Anote a **direção de dependência observada** (ex.: `controller → service → client`) e marque
   eventuais **violações**.
4. Leia `references/heuristicas-camadas.md` quando precisar de regras para inferir a camada a partir
   de sufixos de classe e anotações.

**Passo 4: Confrontar com o padrão prescritivo**
1. Compare o que foi encontrado com a skill `folder-structure` (camadas, sufixos, regras de
   dependência).
2. Registre **conformidades** e **desvios/anti-padrões** (ex.: regra de negócio no controller,
   controller chamando client direto, pacotes genéricos como `helpers`/`commons`). **Não duplique** o
   conteúdo de `folder-structure` — referencie-o.

**Passo 5: Gerar `.estrutura-pastas-realizado.md`**
1. Leia `assets/estrutura-pastas-realizado.template.md` e preencha cada seção com os achados:
   visão geral, fluxo de requisição, árvore de diretórios, **tabela por pasta**
   (Pasta | Caminho | Camada | Responsabilidade | Exemplos), convenções de nomenclatura observadas,
   regras de dependência e anti-padrões detectados.
2. Escreva o arquivo em **`.estrutura-pastas-realizado.md`** na raiz do projeto-alvo.
3. **Baseline:** se o arquivo já existir, **atualize** as seções geradas e **preserve** seções
   manuais (qualquer bloco entre marcadores `<!-- manual:inicio -->` e `<!-- manual:fim -->`).

## Tratamento de erros

- Se **não houver código backend reconhecível** (sem diretório-fonte/manifesto de build), registre
  isso e peça ao usuário o caminho do módulo a mapear, em vez de inventar uma estrutura.
- Se houver **múltiplos módulos**, gere **uma seção por módulo** no mesmo arquivo.
- Se uma pasta **não se encaixar** em nenhuma camada conhecida, classifique como `outros` e descreva o
  que ela contém — não force o padrão BFF.
