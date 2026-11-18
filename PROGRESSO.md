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

Regras do drone:
- Só decola se a bateria cobrir ida + volta com 30% de margem.
- Níveis 1 e 2 podem pegar um drone de entrega comercial que ainda não
  decolou; um drone já em voo comercial termina a entrega antes.
- Pane: desvia para a zona de pouso segura mais próxima.
- Falha grave: aciona o paraquedas.

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
  ESCALA = 10), com os componentes internos Rotulo, Local e ZonaPouso.
  A ferrovia usa miolo tracejado (`tracejado` no ESTILO_VIA).
- `src/regras/distancia.js`: `distanciaKm` (Pitágoras) e
  `zonaMaisProxima(ponto, zonas)`.
- `src/regras/bateria.js`: `CONSUMO_POR_KM = 5`,
  `MARGEM_SEGURANCA = 0.3`, `bateriaNecessaria` e
  `verificarDecolagem(origem, destino, bateria)`.
- Nos arquivos de `src/regras/`, os imports usam `.js` no final, para
  dar para testar com Node:
  `node --no-warnings --input-type=module -e "import ..."`

## Próximos passos (nesta ordem)

1. Drone parado no mapa + linha da rota do hub até o destino.
2. Voo animado do drone.
3. Eventos durante o voo (pane, paraquedas etc.).
4. Tela para montar a simulação.
5. Cenários prontos + resumo do voo.
6. Safe area e legenda do mapa.
7. Aba Pedidos.
8. Publicar: APK pelo EAS Build + Expo Go/EAS Update com QR code.
9. README com prints.

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
