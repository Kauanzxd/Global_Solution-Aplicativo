# PROGRESSO — SADEC

Diário do projeto. Lido no início de toda sessão e atualizado ao final.

## Quem sou eu

- Estudante de ADS da FIAP (1º ano). Este app é um extra da Global
  Solution e também vai para o meu portfólio.
- Ritmo de estudante: um conceito pequeno por vez (poucas dezenas de
  linhas). Nada de muito código de uma vez.
- Explicações em português, passo a passo, linha a linha, como uma aula.
- O Claude roda os comandos e eu acompanho pelo VS Code.
- Commits e pushes são feitos só por mim, sem linha de coautoria de IA.
  Ao fim de cada passo, o Claude diz quais arquivos entram no commit e
  espera eu responder "Commit feito, siga".

## O projeto

**SADEC — Sistema Autônomo de Drones de Entrega e Cuidado**
(antes chamado AeroCuidado): rede de drones autônomos de entrega em Perus e
Anhanguera (noroeste da capital de SP). A região foi escolhida por ter
baixa densidade em boa parte do território e grandes áreas verdes para
pouso de emergência (Parque Anhanguera, o maior parque municipal de SP,
e o Parque Estadual do Jaraguá), além de nomes conhecidos (rodovias
Anhanguera e Bandeirantes, Rodoanel, Pico do Jaraguá). Antes o mapa era
de Parelheiros (zona sul).

Modos por prioridade:
1. Órgãos
2. Emergência
3. Saúde
4. Comercial
5. Retorno (drone vazio voltando ao hub: cede a vez a todos)

Regras do drone (todas já implementadas, exceto onde indicado):
- Só decola se a bateria cobrir ida + volta + 4 subidas/descidas com 30% de margem.
- Decola e pousa na vertical (falha abaixo de 30 m na decolagem = queda dentro do hub).
- Zonas controladas: as zonas de pouso e o hub. Em emergência, o drone sempre
  procura uma delas; pontos de entrega (têm gente) só em último caso.
- Pane: desvia para a zona controlada mais próxima.
- Falha grave: paraquedas guiável (planeio 3:1), escolhe o ponto pelo risco,
  prefere chegar com 40 m de margem e desce em espiral.
- Motor fraco: sistema de risco ("consigo chegar com folga?") a cada tique;
  "talvez" ou "não" = paraquedas na hora.
- Sem GPS: afasta-se de vias/bairros, paira e verifica o sinal até bater a
  reserva de bateria ou 150 m de incerteza; depois vai para uma zona.
- Dois drones: conversam pelo rádio e rodam a mesma regra (prioridade,
  bateria, identificação); drone sem rádio = nós desviamos; os dois sem
  rádio = regra do ar (cada um pela própria direita).
- Missão completa: ida, entrega no destino, volta ao hub (ou zona, se a
  bateria não cobrir o hub).
- (Ainda não implementado) Níveis 1 e 2 podem pegar um drone comercial que
  ainda não decolou.

Foco do app: **simulações**. Na apresentação (23 a 27/11), os
professores escaneiam um QR code, montam qualquer cenário (tipo de
entrega, destino, bateria e eventos em km específicos, ex.: "pane no
km 1,5"; eventos: pane, falha grave, motor, GPS, obstáculo, vento,
bateria, temperatura) e veem o drone voar no mapa.
Parte secundária: aba de Pedidos.

## Stack

- Expo SDK 58, React Native 0.88
- JavaScript (sem TypeScript)
- Expo Router (rotas em `src/app/`)
- react-native-svg
- Instalar pacotes sempre com `npx expo install <pacote>`

## O que já está pronto

- `src/app/_layout.js` (Stack) e `src/app/(tabs)/` com as abas Simular
  (`index.js`) e Pedidos (`pedidos.js`).
- `src/componentes/Cabecalho.js`
- `src/dados/regiao.js`: mapa esquemático de Perus/Anhanguera, 10x10 km
  (x 0=oeste a 10=leste, y 0=norte a 10=sul) com RIOS (Ribeirão Perus),
  AREAS (mata/urbano, com `rotulo` opcional), PICO (Pico do Jaraguá),
  VIAS (tipos rodovia, rodoanel, estrada e ferrovia/CPTM), LOCAIS (hub,
  Hosp. Perus, Hosp. Pirituba, UBS Perus, UBS Morro Doce, Aldeia
  Jaraguá) e ZONAS_POUSO (ZP-01 a ZP-06). Nomes de hospitais são
  genéricos ("de referência"), para não afirmar nomes reais incertos.
- `src/componentes/Mapa.js`: desenha tudo em SVG (viewBox 100x100,
  ESCALA = 10). Desenha o drone (altitude, sombra, paraquedas, "sem GPS ±X m"),
  a rota, o desvio, os círculos de alcance do paraquedas, os obstáculos
  (guindaste em escala de terreno, bando de pássaros, outros drones) e o
  indicador de vento. Tem ZOOM (`vista`): o terreno aproxima e os símbolos
  ficam do mesmo tamanho na tela (multiplicados por `s`).
- `src/app/(tabs)/index.js`: tela Simular com um cenário FIXO (constantes
  `EVENTOS`, `BATERIA_INICIAL`, `PRIORIDADE`, destino), relógio com
  `setInterval`, 4 decisões por tique e zoom suave perto de obstáculos.
- `src/regras/distancia.js`: `distanciaKm` e `zonaMaisProxima`.
- `src/regras/bateria.js`: consumo por km e por segundo, reserva
  (`bateriaParaChegar`), entrega + zona, e `verificarDecolagem` (ida + volta
  + 4 verticais + 30%).
- `src/regras/risco.js`: ponto no polígono, distância até via, e
  `riscoNoPonto` (proibido / alto / médio / baixo), com incerteza e pontos a evitar.
- `src/regras/paraquedas.js`: planeio com vento (Bhaskara), áreas de alcance
  e `escolherPouso` (aceitável → confortável → menor risco → mais alto).
- `src/regras/obstaculos.js`: guindaste girando, pássaros, drones (com e sem
  rádio, comportamentos reto/pairando/errante) e o que o sensor mede.
- `src/regras/trafego.js`: prioridades e `quemDesvia` (consenso por regra).
- `src/regras/voo.js`: o coração da simulação (`avancarVoo`): fases, etapas
  ida/volta, hodômetro, todos os eventos (pane, falha grave, motor, GPS,
  vento, bateria, temperatura, obstáculo, drone), desviador em tempo real
  com histerese, bateria em voo e verificação antes da decolagem.
- Nos arquivos de `src/regras/`, os imports usam `.js` no final, para
  dar para testar com Node:
  `node --no-warnings --input-type=module -e "import ..."`

### Formato dos eventos (o que a tela do passo 4 vai produzir)
- `{ tipo: 'pane' | 'falha-grave' | 'motor', km }` (km 0 = na decolagem;
  `altitude` opcional para a decolagem)
- `{ tipo: 'gps', km, duracao? }` (sem duração = o sinal não volta)
- `{ tipo: 'vento', km, velocidade (m/s), de: 'norte' | 'sul' | ... }`
- `{ tipo: 'bateria', km, perda? }`, `{ tipo: 'temperatura', km, grau?: 'critica' }`
- `{ tipo: 'obstaculo', km, objeto: 'guindaste' | 'passaros' }`
- `{ tipo: 'drone', km, prioridade?, comunicacao?, comportamento?, semGps?, ambosSemRadio? }`
- `{ ..., durante: 'gps' }` no lugar do km = acontece 10 s depois da perda do GPS
- O km é o do hodômetro (viagem inteira): a ida até a Aldeia tem 4,2 km;
  km maiores acontecem na volta.

## Próximos passos (nesta ordem)

Passos 1, 2 e 3 (drone no mapa, voo animado, eventos) estão PRONTOS.
A apresentação é de 23 a 27/11: priorizar o que os professores vão usar.

4. Tela para montar a simulação: tipo de entrega (prioridade), destino,
   bateria (bloqueando a decolagem sem bateria e mostrando o motivo),
   lista de eventos com km, botões Simular e Reiniciar. Hoje o cenário é
   fixo no `index.js`.
5. Cenários prontos (ex.: "Pane sobre a rodovia", "Dois drones",
   "GPS perdido") + resumo do voo no fim (distância, bateria, eventos,
   onde pousou).
6. Safe area e legenda do mapa (o que é cada cor/ícone).
7. Aba Pedidos.
8. Publicar: APK pelo EAS Build + Expo Go/EAS Update com QR code.
9. README com prints.

Pendências menores:
- Níveis 1 e 2 pegando um drone comercial que ainda não decolou (regra do
  projeto ainda não implementada).
- Lint não configurado (`npx expo lint` instalaria pacotes).
- Confirmar os nomes reais dos hospitais da região (hoje genéricos).

## Para testar

```bash
npx expo start --web --port 8081
```

Abrir http://localhost:8081 (tamanho de celular). No celular, pelo
Expo Go, na mesma rede Wi-Fi.

## Histórico de sessões

### Sessões anteriores (outro computador)
- **Feito:** estrutura de rotas com abas, cabeçalho, dados da região,
  mapa em SVG (mata, áreas urbanas, colônias, vias, locais e zonas de
  pouso), regra da zona de pouso mais próxima e regra da bateria.
- **Conceitos:** Expo Router e abas, SVG com viewBox e escala,
  distância por Pitágoras, módulos JS com import/export.
- **Onde paramos:** regras de distância e bateria prontas; próximo é
  o passo 1 (drone parado no mapa + linha da rota).

### 18/11/2026 — Preparação do novo computador
- **Feito:** instalado o Node.js LTS (v26.13.1, npm 11.20.0) via
  winget, `npm install` e teste do app no navegador (abriu sem erros).
  Criados o `PROGRESSO.md` e o `CLAUDE.md`.
- **Conceitos:** arquivos de continuidade entre sessões (diário do
  projeto + instruções automáticas para o Claude).
- **Onde paramos:** pronto para começar o passo 1 dos próximos passos.

### 18/11/2026 — Troca da região do mapa
- **Feito:** comparamos Marsilac, Perus/Anhanguera e a borda da
  Cantareira e escolhemos Perus/Anhanguera. O `regiao.js` foi reescrito
  e o `Mapa.js` ajustado (rios no lugar das represas, Pico do Jaraguá
  no lugar da cratera, rodovias, trem da CPTM e nomes das áreas). Desta
  vez, a pedido, foi tudo de uma vez, não aos poucos. O projeto foi
  renomeado de AeroCuidado para SADEC (app.json, hub no mapa com a
  letra "S", README, CLAUDE.md e este arquivo).
- **Conceitos:** reaproveitar o mesmo formato de dados para trocar o
  conteúdo sem mexer na lógica; propriedades opcionais (`rotulo`,
  `tracejado`); `strokeDasharray` no SVG.
- **Onde paramos:** mapa novo pronto e testado (web + regras no Node).
  Próximo é o passo 1: drone parado no mapa + linha da rota.

### 18–19/11/2026 — Voo, eventos e regras de segurança (passos 1 a 3)
- **Feito:** drone e rota no mapa; voo animado; altitude com sombra;
  decolagem e pouso verticais; todos os eventos (pane, falha grave com
  paraquedas guiável, motor fraco com sistema de risco, GPS com espera
  inteligente e incerteza, vento, bateria, temperatura, obstáculos em
  movimento, drones cooperativos e sem rádio); mapa de risco; bateria em
  voo; segunda falha em qualquer fase (hodômetro); zoom no mapa; missão
  completa com ida, entrega e volta; hub como zona controlada; pontos de
  entrega evitados; decolagem negada sem bateria; dois drones vazios.
- **Conceitos:** useState/useEffect/setInterval; interpolação linear;
  ponto no polígono (raio); distância até segmento (projeção); vetores e
  vetor unitário; trigonometria (cos/sen); Bhaskara no tempo de planeio;
  ponto de maior aproximação; histerese; consenso por regra determinística;
  refatoração (funções genéricas como `abrirParaquedas`, `desviarParaZona`,
  `bateriaParaTerminar`, `continuar`); testes no Node revelando bugs reais
  (ZP-05 perto do trilho, reserva sem a descida, 0 ÷ 0, desvio "raspando").
- **Onde paramos:** passos 1–3 completos. Últimas mudanças (subir para
  planar do ponto de entrega e dois drones vazios) em `voo.js` e
  `trafego.js`, ainda não commitadas. Próximo: passo 4, a tela de montar
  a simulação.
