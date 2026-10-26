# Gerador de Etiquetas

Sobe uma lista de alunos (Excel, CSV ou PDF) e gera um PDF de etiquetas com **nome e turma** para
folha **A4 Pimaco 38,1 × 99,0 mm — 14 etiquetas por folha** (2 colunas × 7 linhas, ex.: Pimaco A4363).

Tudo roda no navegador: a lista de alunos não é enviada para nenhum servidor.

## Como usar

1. Envie a planilha/PDF. O sistema procura as colunas **Nome** (ou "Nome Completo", "Aluno") e
   **Turma** (ou "Série", "Classe", "Sala"). Sem cabeçalho, usa a 1ª coluna de texto como nome e a 2ª como turma.
2. Se existir a coluna **Situação** / **Situação do contrato**, entram só os alunos **Confirmado**.
3. Marque as turmas, escolha as opções e clique em **Gerar PDF**.
4. Imprima em **tamanho real (100%)**. Se sair deslocado, use os ajustes horizontal/vertical (mm).
   Dica: gere com "Mostrar contorno" e imprima em papel comum para conferir antes de gastar etiqueta.

PDF é lido por aproximação (posição do texto na página) — confira a lista antes de imprimir.
PDF escaneado (imagem) não funciona: use a planilha.

## Desenvolvimento

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # testes do leitor de planilha/PDF e da geometria
npm run build   # gera dist/
```

## Deploy na Vercel

Importe o repositório na Vercel — o preset **Vite** é detectado sozinho
(build `npm run build`, saída `dist`). Não precisa de variáveis de ambiente.

## Medidas usadas (mm)

| | |
|---|---|
| Etiqueta | 99,0 × 38,1 |
| Margem superior | 15,15 |
| Margem esquerda | 4,7 |
| Espaço entre colunas | 2,5 |

Estão em `src/layout.js`.
