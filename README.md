# Month / Year Timeline Slicer for Power BI

Custom Visual para Power BI que permite selecionar períodos no formato **MMM/AAAA** através de uma faixa horizontal de navegação.

O objetivo do visual é oferecer uma experiência mais amigável para seleção de competência/mês de referência sem depender do comportamento padrão dos slicers nativos.

---

# Exemplo do Visual

<img width="464" height="148" alt="image" src="https://github.com/user-attachments/assets/adb475b1-c152-4213-b596-d0ceb1a74859" />


---

# Funcionalidades

✅ Seleção de períodos no formato:

```text
Jan/2024
Fev/2024
Mar/2024
Abr/2024
...
```

✅ Seleção automática do mês atual

✅ Destaque visual do período selecionado

✅ Scroll horizontal automático

✅ Título configurável

✅ Paleta de cores configurável

✅ Compatível com Power BI Desktop e Power BI Service

✅ Utiliza filtro do tipo:

```text
Basic Filter
Operator = In
```

✅ Performance otimizada para listas extensas de meses

---

# Estrutura Esperada

O visual foi desenvolvido para trabalhar com uma coluna texto contendo valores únicos no formato:

```text
Jan/2024
Fev/2024
Mar/2024
Abr/2024
...
```

Exemplo:

| SHORT_MONTH_YEAR |
|------------------|
| Jan/2024 |
| Fev/2024 |
| Mar/2024 |
| Abr/2024 |

A coluna deve estar como:

```text
Texto
```

e preferencialmente já estar distinta.

---

# Comportamento

Ao iniciar:

- Se a configuração **Iniciar no Mês Atual** estiver habilitada:
  - o visual tentará selecionar automaticamente o mês atual.

Exemplo:

```text
Hoje = Agosto/2026
```

e existir:

```text
Ago/2026
```

na lista, então:

```text
Ago/2026
```

será selecionado automaticamente.

---

# Configurações Disponíveis

## Geral

| Configuração | Descrição |
|------------|------------|
| Título | Texto exibido no cabeçalho |
| Iniciar no Mês Atual | Seleciona automaticamente o mês atual |
| Mês Padrão | Utilizado quando a seleção automática estiver desabilitada |
| Ordenação Descendente | Mais recente para mais antigo |
| Idioma | PT-BR ou EN-US |

---

## Estilo

| Configuração | Descrição |
|------------|------------|
| Tamanho da Fonte | Define o tamanho textual |
| Cor da Fonte | Cor do texto |
| Cor de Fundo | Cor do container |
| Cor de Seleção | Destaque do item selecionado |
| Cor da Borda | Cor das bordas |

---

# Instalação
 
## 1. Baixar o Visual
 
Faça o download da versão mais recente do arquivo:

```text

monthYearSlicer.pbiviz

```
na área de Releases deste repositório.

---

## 2. Importar no Power BI

Abra o Power BI Desktop.

No painel de visualizações:

```text

Visualizações

→ ...

→ Obter mais visuais

→ Importar um visual de um arquivo

```

Selecione:

```text

monthYearSlicer.pbiviz

```

Após a importação o visual estará disponível no painel de visualizações.

---
