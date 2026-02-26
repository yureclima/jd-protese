---
title: Integração Cal.com API v2 - JD Prótese
description: Documentação detalhada sobre a implementação da agenda customizada usando a API v1 e v2 do Cal.com.
date: 2026-02-24
---

# Integração VIP Cal.com (jdprotese)

Este documento descreve a arquitetura e as decisões técnicas tomadas para implementar uma interface de agendamento 100% nativa (In-App) conectada à API do Cal.com, eliminando a necessidade de iframes ou popups externos na aplicação JD Prótese.

## 1. Gerenciamento, Multi-Tenant e Autenticação (API Key)

Para garantir máxima segurança, isolamento de dados e flexibilidade, transitamos de um armazenamento local frágil para uma arquitetura Multi-Tenant completa usando o **Supabase SSR**.

### Fluxo da Chave de API e Multi-Tenancy:
1. **SSO e Isolamento:** Cada usuário da aplicação possui um Perfil isolado na tabela `profiles` gerida pelo RLS (Row Level Security) do Supabase, o que garante acesso único a dados.
2. **Armazenamento Seguro na Nuvem:** O *Input* da chave não vive mais no `localStorage`, evitando limpezas acidentais do cache. Ele agora é guardado e puxado de forma assíncrona do campo `cal_api_key` da base de dados assim que a sessão SSR do utilizador é montada, via `/dashboard/perfil`.
3. **Interface Desacoplada e Oculta:** O input foi migrado integralmente para a página inteligente `/dashboard/perfil` (na *Tab Integrações*). Assim, a Rota da Agenda (`/agenda`) limita-se exclusivamentte ao consumo da chave previamente guardada para gerenciar horários, despoluindo a tela. Quando não há chave, aparece um "Card" em estado vazio orientando-o a configurar as Integrações.
4. **Padrão Híbrido de Requisições:**
   - Para operações de **Leitura (v1)**: A chave é enviada como parâmetro de Query String na URL: `?apiKey=QUALQUER_CHAVE`.
   - Para operações de **Escrita Crítica (v2)**: A chave é enviada nos Headers (`Authorization: Bearer QUALQUER_CHAVE`).

## 2. Abstração de Fetching (Sem Reloads)

Implementamos a função assíncrona raiz `loadData()` que consome duas pontas essenciais do Cal.com:

1. `GET /v1/event-types`: Busca os serviços disponíveis (`eventTypes: EventType[]`).
2. `GET /v1/bookings`: Resgata toda a carteira de agendamentos (`bookings: Booking[]`).

**Vantagem do `loadData()`:** Em vez de depender do defasado e pesado `window.location.reload()` via Browser, quando o usuário finaliza uma ação de CRUD (Criar, Cancelar, Reagendar), nós apenas **executamos a `loadData()` novamente**. O painel percebe o novo state, substitui o Virtual DOM (React) e pisca o esqueleto (Loader2) graciosamente, sem estressar a máquina do usuário.

## 3. Criação de Agendamentos (POST /v1/bookings)

O modal de criação foi montado baseando-se no comportamento cascata do calendário com validação inteligente de telefones `E.164`.

### A interface (UI):
O usuário seleciona 3 peças-chave: 
1. `ClienteCombobox` puxa o `Supabase ID` (`selectedClienteId`). 
2. `Select` exibe os EventTypes disponíveis da API (`selectedEventId`).
3. O componente `<Calendar />` seleciona a `Date` do tipo `luxon`/`date-fns` sem deixar retroceder o tempo (`disabled={{ before: new Date() }}`).
4. Ao clicar na Data, ele bate assincronamente em `GET /v1/slots` com as Strings *Start* e *End* do dia formatadas en ISO para renderizar os *buttons* com horários na tela.

### O disparo do Payload POST:
Ao selecionar `14:30`, capturamos o input, explodimos via `.split(":")` para fixar as `Horas` e `Minutos` no relógio nativo (Date Object), formatando num glorioso `.toISOString()`.

**Tratamento do Telefone:** Ponto fortíssimo deste endpoint é a sua intolerância a telefones fora do padrão *E.164*. Muitos clientes registram celular via WhatsApp com 12 ou 13 dígitos *(`+551199999999` vs `1199999999`)*.
- O dado cru passa por um Regex para extrair não-numéricos `(/\D/g)`.
- Lidamos dinamicamente com prefixos DDI `55` soltos e forçamos o **"nono dígito" (`9`)**, prevenindo o famoso bloqueio `invalid_number` do server do Cal.com que frustra conversões.

```javascript
const payload = {
    eventTypeId: parseInt(selectedEventId, 10),
    start: startDateTime.toISOString(), // Essencial: data local convertida para UTC Eixo Z.
    responses: {
        name: selectedCliente.nome || "Cliente JD",
        email: selectedCliente.email || `JD@...`,
        phone: formattedPhone || "",
        attendeePhoneNumber: formattedPhone || "", // Config especial obrigatoria.
    },
    metadata: { supabase_id: selectedClienteId }, // Mantém o vinculo para nosso painel local.
    timeZone: "America/Sao_Paulo",
    language: "pt-BR"
};
```

## 4. Cancelamentos (POST /v2/bookings/{uid}/cancel)

Para realizar cancelamentos, evoluímos da antiga arquitetura legada (usando `DELETE /v1/...`) para o end-point moderno `v2` focado em resiliência e controle. O usuário clica na lixeira, e um modal abre confirmando o cancelamento, protegendo de cliques falsos.

### O Resgate do UID V2
Nesta implementação, toda vez que consumimos o Booking em `/v1/bookings`, fomos obrigados a resgatar a chave `uid` exclusiva da nova interface para passar a utilizar as Rotas de Cancelamento v2.

```javascript
    const url = `https://api.cal.com/v2/bookings/${bookingToCancel.uid}/cancel`;
    const payload = {
        cancellationReason: "Cancelado pelo painel gerencial JD",
        cancelSubsequentBookings: true
    };
```
* **O Header V2:** Aqui a chave viaja via Header (`cal-api-version: "2024-08-13"` e Bearer).
* **O Fallback:** Caso a chave usada (`apikey=`) ainda não tenha sofrido o migratório pro *OAuth* ou Bearer Pattern dos planos Enterprise, o nosso código reverte lindamente para `DELETE /v1/bookings/${id}/cancel`, sendo à prova de falhas.
* O state `[isCanceling]` roda spinners de loading `(Loader2)` nos botões.

## 5. Reagendamentos In-App (POST /v2/bookings/{uid}/reschedule)

A verdadeira "Jóia da Coroa" arquitetônica. Removemos aquele link bruto em Iframe e implementamos uma experiência customizada, consumindo os Slots da API, direto no modal sem que o gestor se perca da aplicação.

### Como a interface nativa do Reagendamento foi montada:
1. Ao clicar no `[Ícone CalendarClock]`, injetamos o `booking` correspondente no state `bookingToReschedule`.
2. Como temos o Objeto do agendamento salvo com sua `eventTypeId` localmente, disparamos nosso `loadRescheduleSlots()` em direção da Rota de Rotas `GET /v1/slots`, consultando **exatamente as lacunas baseadas APENAS nas durações atreladas às restrições daquele Event Type original.**
3. Após o manager apertar na tela a nova Data + o Novo Tempo preenchido. As variáveis se casam:

```javascript
    const startDateTime = new Date(rescheduleDate);
    startDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    const url = `https://api.cal.com/v2/bookings/${bookingToReschedule.uid}/reschedule`;
    const payload = {
        start: startDateTime.toISOString(), // Apenas jogue o UTC pra eles, o motor troca no banco deles.
        reschedulingReason: "Reagendado pelo painel gerencial JD"
    };
```
4. Se efetuado o POST, fechamos o Modal UI via React SetState e disparamos o `loadData()` que baixa as views com os horários reestruturados em milissegundos.

## 6. Configurações de Perfil e Interface Multi-Tenant (Supabase SSR)

O sistema foi reconstruído baseando-se no paradigma do Next.js **App Router + Supabase SSR**, habilitando um pipeline completo de login unificado:
*   **Autenticação Obrigatória:** O acesso às ferramentas corporativas da plataforma exige agora que o token transite de ponta a ponta (`/login/actions.ts`). Temos suporte de *Middleware* root protegendo as rotas sensíveis como `/agenda` e enviando os "Não Autorizados" para o ecrã de LogIn Moderno (`shadcn` based).
*   **A Barra Lateral Dinâmica (`Sidebar`):** O layout reativo foi configurado para resgatar os parâmetros individuais do `profile` de cada *tenant*. Em vez do logo local antigo "JD", os URLs da Nuvem via Bucket (`logos` folder - Supabase Storage) carregam a Identidade Visual própria do Espaço. Nos casos vazios, gera iniciais de marca dinâmicas, de forma limpa.
*   **Server Actions Puras:** Substituímos submissões massantes em API Routes tradicionais (pages) pelas novas *Server Actions*. O "Guardar Configurações Visuais" submete `FormDatas` com o payload exato para dar *upsert* atómico da logo e do Nome da Clínica (`updateProfileInfo` e `updateIntegrations`).

## Resumo dos Padrões Arquitetónicos Atingidos (Fase Final):
- **Isolamento Total:** Supabase Row Level Security com arquitetura Multi-Tenant para suportar vários gerentes no painel na mesma codebase.
- **Fetch Desacoplado & Nativo:** Troca do acoplamento visual do Cal.com (estilo iframe/Link bruto) para chamadas Rest (`GET`/`POST`) encapsuladas com feedback UI in-app (Spinners Loader2).
- **Tratamento Reativo Eficiente:** Supressão total de reload (`window.location.reload()`) dando lugar ao React SetState em Lifecycles curtos.
- **Armazenamento de Chaves:** Deslocamento das Integrações API locais/embutidas para persistência Server-Side assíncrona blindada contra exposição Client-Side.
- **Standard Internacional:** Padronização robusta de formatação de horários pelo Fuso `América/Sao_Paulo` nos corpos da requisição, assegurando-se da validade do UTC String nativo `[startDateTime.toISOString()]`.
