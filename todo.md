# Project TODO — Painel da Carteira Principal

## Schema & Backend

- [x] Criar schema da tabela `positions` (ticker, company, sector, quantity, created_at)
- [x] Criar schema da tabela `daily_history` (date, total_value, daily_result_brl, daily_result_pct)
- [x] Criar schema da tabela `sector_weights` (sector, weight_pct)
- [x] Criar schema da tabela `alerts` (ticker, level, what_changed, evidence_date, impact, thesis_status, next_step, created_at)
- [x] Criar schema da tabela `events` (ticker, event_type, event_date, description)
- [x] Gerar migration SQL e aplicar via webdev_execute_sql
- [x] Popular tabelas com os dados consolidados das 23 posições da carteira
- [x] Criar procedure `getSnapshot` que retorna valor total, resultado do dia, e posições
- [x] Criar procedure `getHistory` que retorna série histórica do valor da carteira
- [x] Criar procedure `getAlerts` que retorna alertas materiais dos 4 ativos
- [x] Criar procedure `getSnapshot` com concentração setorial embutida
- [x] Criar procedure `getEvents` que retorna calendário de eventos
- [x] Criar endpoint de atualização de cotações via Yahoo Finance API

## Frontend — Dashboard Principal

- [x] Criar layout do dashboard com header e footer fixos
- [x] Criar cards de valor total consolidado e resultado do dia (R$ e %)
- [x] Criar tabela de posições com 23 ativos (ticker, empresa, qtd, cotação, valor, var. dia, peso)
- [x] Criar gráfico de evolução histórica do valor consolidado
- [x] Criar ranking dos maiores impactos positivos e negativos
- [x] Criar bloco de alertas materiais (SMTO3, BMOB3, JHSF3, ORVR3)
- [x] Criar gráfico de concentração setorial (pizza)
- [x] Criar calendário de eventos corporativos
- [x] Adicionar disclaimer fixo em todas as telas

## Estilo & Validação

- [x] Definir paleta de cores escura premium e tipografia refinada (Inter + JetBrains Mono)
- [x] Garantir responsividade e acabamento visual
- [x] Escrever testes vitest para procedures
- [x] Validar funcionamento no navegador

- [x] Importar e validar as planilhas atualizadas com ativos brasileiros e em dólar
- [x] Definir campos de moeda, carteira de origem, preço médio e conversão cambial
- [x] Atualizar banco e procedures para visão consolidada em BRL e USD
- [x] Atualizar dashboard com posições internacionais e totais por moeda
- [x] Criar testes e validar a atualização da carteira consolidada
- [x] Separar o histórico diário legado do histórico da carteira unificada
