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

**SADEC — Sistema Autônomo de Drones de Entrega e Cuidado**: rede de drones
autônomos na **cidade de São Paulo inteira** (mapa real: contorno do IBGE,
180 hospitais do CNES, 23 filiais). Faz parte da Global Solution do grupo;
os outros entregáveis estão no repositório `Global_Solution-projects`
(Python, Java, BD, chatbot, Software Engineering) e o site em
`Global_Solution-Site`, ambos clonados em `F:\1TDSPB-Fiap_Projects\Global_Solution\`.
No app, "hub" (no código) = **filial** (nome usado nos documentos do grupo).

Drone de referência: **ACSL PF4** (Japan Post): 40 km de alcance com carga
máxima → 2,5%/km, 0,0375%/s, 2,25% por subida/descida de 120 m.

Modos por prioridade:
1. Órgãos
2. Emergência
3. Saúde
4. Comercial
5. Retorno (drone vazio voltando à filial: cede a vez a todos)

Regras do drone (todas já implementadas, exceto onde indicado):
- Sai da filial mais próxima do destino; só decola se a bateria cobrir
  ida + volta + 4 subidas/descidas com 30% de margem.
- Decola e pousa na vertical (falha abaixo de 30 m na decolagem = queda dentro da filial).
- Zonas controladas: as zonas de pouso (nos parques) e TODAS as filiais. A filial
  é sempre o melhor lugar se der para chegar com margem. Pontos de entrega
  (têm gente) só em último caso.
- Pane: desvia para a filial mais próxima (ou a zona controlada mais próxima).
- Falha grave: paraquedas guiável (planeio 3:1), escolhe o ponto pelo risco,
  prefere chegar com 40 m de margem e desce em espiral.
- Motor fraco: sistema de risco ("consigo chegar com folga?") a cada tique;
  "talvez" ou "não" = paraquedas na hora.
- Sem GPS: afasta-se de vias/bairros, paira e verifica o sinal até bater a
  reserva de bateria ou 150 m de incerteza; depois vai para uma zona.
- Dois drones: conversam pelo rádio e rodam a mesma regra (prioridade,
  bateria, identificação); drone sem rádio = nós desviamos; os dois sem
  rádio = regra do ar (cada um pela própria direita).
- Drone sem rádio "errante": contorna pelo lado (lado travado) e só recua
  dentro da bolha de 150 m.
- Missão completa: ida, entrega no destino, volta à filial mais próxima (ou
  zona, se a bateria não cobrir a filial com margem).
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
- `src/dados/regiao.js`: a cidade de SP num quadrado de 76 km (x 0=oeste,
  y 0=norte). Geografia escrita em [lat, lon] e convertida com `listaParaKm`:
  CONTORNO (IBGE), RIOS (Tietê, Pinheiros), AREAS (parques 'mata', represas
  'agua', a cidade e as vizinhas 'urbano'; a ORDEM importa), VIAS (Marginais,
  Rodoanel, rodovias, CPTM), ZONAS_POUSO (nos parques), BAIRROS (nomes das
  filiais), FILIAIS (23, calculadas) e LOCAIS (filiais + hospitais).
- `src/dados/hospitais.js` (gerado do `sadec.py`): 180 hospitais do CNES; 16
  com posição corrigida pelo endereço (campo `posicao` + `cnes` original).
- `src/dados/contornoSP.js` (IBGE) e `src/regras/geo.js` (graus → km, com os
  mesmos 110,8 e 102,0 km/grau do Python).
- `src/regras/cobertura.js` + `scripts/calcular-filiais.mjs`: filiais por
  algoritmo guloso + poda; 2+ filiais a até 10 km em toda a área urbana e em
  todos os hospitais, 1+ na zona rural.
- `src/componentes/Mapa.js`: SVG com a cidade inteira (vizinhas em cinza,
  contorno), detalhe por zoom (hospitais viram pontos na vista inteira),
  rótulos sem colisão, só desenha o que está na vista, alcance das filiais,
  drone, rota, desvio, paraquedas, obstáculos, vento e selo de zoom em km.
- `src/componentes/BuscaDestino.js`: busca de hospital sem acentos.
- `src/app/(tabs)/index.js`: tela Simular completa: cenários prontos, destino
  (busca ou toque em dois passos: aproximar → escolher), tipo de entrega,
  bateria com verificação, editor de eventos com linha do tempo e marcadores,
  voo com vista de 10 km seguindo o drone e zoom de 1,2 km nos obstáculos.
- `src/dados/cenarios.js`: 8 cenários calibrados no mapa real (Einstein, HC,
  Japonês Santa Cruz, São Camilo Pompeia, Nova Iguatemi).
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

Passos 1 a 5a (voo, eventos, tela de montagem, cenários) e o mapa real
estão PRONTOS. A apresentação é de 23 a 27/11.

1. **Missão de órgãos**: hospital X (coleta) → hospital Y (entrega) →
   filial, com escolha de dois hospitais quando a prioridade for órgãos e
   bateria para as 3 pernas (é o que o Documento Funcional e o Java dizem).
2. **Publicar** (EAS Update com QR code; rodar `npx expo install --check`
   antes, o Expo avisou sobre 58.0.23 → ~58.0.26). Testar cedo.
3. Resumo do voo no fim (distância, bateria, tempo, eventos, onde pousou).
4. Várias rotas simultâneas (drones da rede se enxergando).
5. Safe area e legenda do mapa.
6. Aba Pedidos.
7. README com prints e seção de uso de IA (o enunciado pede declarar).

Pendências menores:
- Níveis 1 e 2 pegando um drone comercial que ainda não decolou.
- Lint não configurado (`npx expo lint` instalaria pacotes).
- O h177 e os 16 hospitais corrigidos no app continuam com a posição do
  CNES no `sadec.py` (181 hospitais, não 182).

Pendências dos outros repositórios (fora do app):
- Railway: o deploy antigo (`sadec-web-production`) é de outro integrante e
  está desatualizado; o novo foi feito na conta do Kauan. Conferir o domínio
  novo, o volume em `/data` e atualizar o link no README do site.
- Vercel: criar `vercel.json` (repasse de `/api`, `/sadec`, `/healthz` para o
  Railway) e `.vercelignore` (sem banco, Java, Python, testes) antes de importar.
- Nome do projeto: o site usa "Cuidado e Entrega"; as outras matérias,
  "Entrega e Cuidado". Padronizar.
- SE: os 3 diagramas de caso de uso não parecem do Astah (o enunciado pede).
- `Global_Solution-projects` tem as chaves reais em `ChatBot/chaves-api (1).txt`:
  gerar chaves novas antes de deixar o repositório público.

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

### 19/11/2026 — Tela de montagem, autonomia real e mapa da cidade inteira
- **Feito:** tela de montagem completa (passos 4a–4d e 5a: cenários prontos,
  editor de eventos, linha do tempo e marcadores); autonomia recalculada pelo
  ACSL PF4 (pesquisa dos drones de entrega do Japão); filial como zona
  preferida; mapa de 20 km; depois o **mapa real de SP**: contorno do IBGE,
  180 hospitais do CNES (16 posições corrigidas pelo endereço), 23 filiais
  com cobertura dupla comprovada, busca de destino, toque em dois passos,
  rótulos sem colisão, 8 cenários recalibrados; correção do "pisca-pisca"
  do drone sem rádio. Também revisamos os entregáveis do grupo contra o
  enunciado da GS (chaves de API expostas, watsonx exigido no chatbot,
  PDF do Python, `contato.html`, link do pitch) e o grupo ficou de ajustar.
- **Conceitos:** projeção simples de graus para km; dados gerados por script
  (ast do Python, sem executar o código); geocodificação e validação de dados
  reais; algoritmo guloso + poda (cobertura de conjuntos); filtro de colisão
  de retângulos; `fillRule="evenodd"`; desenhar só o que está na vista
  (desempenho); estado de zoom (`foco`); normalização de texto (NFD).
- **Onde paramos:** tudo commitado (mapa real em `6ad3636`, correção do
  drone sem rádio depois). Próximo: missão de órgãos (X → Y → filial) e
  publicar com QR code.

### 19–20/11/2026 — Entrega da Global Solution (repositórios do grupo)
- **Feito:** o app ficou pausado para a entrega. No `Global_Solution-projects`:
  regra única de bateria (ida e volta × 1,3 em toda entrega) no Java e no
  Python; correção do Java que quebrava ao rodar; ciclo resgate → manutenção →
  liberação demonstrado na Main; PDF do Java refeito com os prints do IntelliJ e
  UML novo; Python com status corrigido, autonomia de 40 km, PDF e
  `integrantes.txt`; nomes completos em todos os `.txt`; Documento Funcional de
  SE refeito (nomes, regra dos 30% e link do pitch); README de portfólio.
  ChatBot ficou com a Groq (o professor liberou) e as chaves ficaram no repo
  privado. BD mantido como estava. No site: commits do Kauan (login, API, menu),
  versões corretas de Java/Python, `contato.html` criado a partir do FAQ, 5
  LinkedIn, áreas dos integrantes, espaçamento do topo, ignores sem ferramentas
  de IA e README reescrito com os 8 itens do enunciado; repositório público.
  Gerados os 6 entregáveis em `F:\1TDSPB-Fiap_Projects\Entregaveis_Global_Solution`
  (5 zips + o PDF de SE).
- **Conceitos:** comparar entregáveis com o enunciado item por item; `git archive`
  para gerar zips só com o que está commitado; histórico reescrito no GitHub
  (mesmo conteúdo, autor trocado) e `git reset --hard origin/main`; gerar PDF a
  partir de HTML com o Chrome; acessibilidade e responsividade testadas em
  390/768/1440 px.
- **Onde paramos:** entregas prontas. Próximo no app: missão de órgãos e
  publicar com QR code; fora do app, ver as pendências dos outros repositórios.
