# Dashboard Administrativa - Documentação

## 📋 Resumo das Alterações

Este projeto foi atualizado com uma **Dashboard Administrativa moderna e profissional** com funcionalidades avançadas de gerenciamento de widgets usando drag & drop.

### ✨ Principais Recursos

1. **Dashboard Personalizável**
   - Grid responsivo com drag & drop (desktop)
   - Widgets redimensionáveis
   - Layout salvo automaticamente no localStorage

2. **Tipos de Widgets**
   - **Gráficos**: Barras, Linha e Pizza (usando Recharts)
   - **Tabelas**: Dados tabulares formatados
   - **KPIs**: Indicadores-chave com valores e tendências
   - **Cards Informativos**: Conteúdo textual

3. **Modal de Criação/Edição**
   - Formulário dinâmico baseado no tipo de widget
   - Preview em tempo real
   - Interface intuitiva e profissional

4. **Responsividade**
   - Desktop: Drag & drop completo
   - Mobile: Layout adaptado sem drag (melhor UX)
   - Breakpoints otimizados

---

## 📁 Estrutura de Arquivos Criados/Modificados

### Novos Componentes

```
/components/
├── admin-dashboard.tsx           # Dashboard principal com grid layout
├── widget-modal.tsx              # Modal para criar/editar widgets
└── widgets/
    ├── chart-widget.tsx          # Componente de gráfico
    ├── table-widget.tsx          # Componente de tabela
    ├── kpi-widget.tsx            # Componente de KPI
    └── card-info-widget.tsx      # Componente de card informativo
```

### Arquivos Modificados

```
/components/dashboard-home.tsx    # Agora usa AdminDashboard
/app/globals.css                  # Adicionados estilos do react-grid-layout
```

---

## 🎨 Design e Tema

- **Cores principais**: Verde (#00A859) e Branco
- **Estilo**: Profissional, clean e moderno
- **Componentes**: Shadcn/UI + Radix UI
- **Gráficos**: Recharts
- **Drag & Drop**: react-grid-layout

---

## 🚀 Instalação e Uso

### 1. Instalar Dependências

```bash
npm install
# ou
yarn install
```

### 2. Executar o Projeto

```bash
npm run dev
# ou
yarn dev
```

### 3. Acessar

Navegue para `http://localhost:5000/dashboard`

---

## 💡 Como Usar

### Criar Widget

1. Clique no botão **"Criar Widget"** no topo da dashboard
2. Selecione o tipo de widget (Gráfico, Tabela, KPI ou Card)
3. Preencha os dados do formulário
4. Visualize o preview em tempo real
5. Clique em **"Criar"**

### Editar Widget

1. Passe o mouse sobre um widget
2. Clique no ícone de **lápis (editar)**
3. Modifique os dados no formulário
4. Clique em **"Atualizar"**

### Deletar Widget

1. Passe o mouse sobre um widget
2. Clique no ícone de **lixeira**
3. Confirme a exclusão

### Mover e Redimensionar (Desktop)

1. **Mover**: Clique e arraste o ícone de drag (pontos) no canto superior esquerdo
2. **Redimensionar**: Clique e arraste os cantos/bordas do widget

---

## 📊 Widgets Padrão

O sistema vem com 3 widgets pré-configurados:

1. **Faturamento Mensal** (KPI)
   - Valor: R$ 125.000
   - Tendência: Crescimento

2. **Vendas por Categoria** (Gráfico de Barras)
   - 5 categorias com valores simulados

3. **Top 5 Produtos** (Tabela)
   - Produtos mais vendidos com estoque

---

## 🔧 Personalização

### Adicionar Novos Tipos de Widget

1. Criar novo componente em `/components/widgets/`
2. Adicionar tipo no `WidgetModal`
3. Adicionar renderização no `AdminDashboard`

### Modificar Layout Padrão

Edite `defaultLayouts` em `/components/admin-dashboard.tsx`

### Alterar Cores

Modifique as variáveis CSS em `/app/globals.css` (variável `--primary`)

---

## 📱 Responsividade

- **Desktop (lg)**: 12 colunas
- **Tablet (md)**: 6 colunas
- **Mobile (sm)**: 4 colunas
- **Extra Small (xs)**: 1 coluna (sem drag)

---

## 💾 Persistência de Dados

Os widgets e layouts são salvos automaticamente no **localStorage**:

- `dashboard-widgets`: Configuração dos widgets
- `dashboard-layouts`: Posição e tamanho dos widgets

Para resetar: Limpe o localStorage do navegador

---

## 🛠️ Tecnologias Utilizadas

- **Next.js 14** (React 18)
- **TypeScript**
- **Tailwind CSS**
- **Shadcn/UI + Radix UI**
- **Recharts** (gráficos)
- **react-grid-layout** (drag & drop)
- **Lucide React** (ícones)

---

## 📝 Notas Importantes

1. Os dados são **simulados** e armazenados localmente
2. Para dados reais, conecte os widgets a uma API
3. O drag & drop é **desabilitado em mobile** para melhor UX
4. Os layouts são **responsivos** e se adaptam automaticamente

---

## 🎯 Próximos Passos (Sugestões)

- [ ] Conectar widgets a API real
- [ ] Adicionar mais tipos de gráficos
- [ ] Implementar filtros de data
- [ ] Adicionar exportação de dados
- [ ] Criar templates de dashboard
- [ ] Adicionar compartilhamento de dashboards

---

## 📞 Suporte

Para dúvidas ou problemas, consulte a documentação do Next.js e das bibliotecas utilizadas.

---

**Versão**: 1.0.0  
**Data**: Janeiro 2025
