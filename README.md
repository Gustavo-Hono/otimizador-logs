# AI Terminal Optimizer

CLI em Node.js + TypeScript para executar comandos do terminal e exibir uma versao resumida dos logs quando houver um parser compativel.

Hoje o projeto reconhece principalmente:

- `git ...`
- `jest`
- `npm test`
- `yarn test`
- `pnpm test`

Quando o comando nao e reconhecido, a ferramenta mostra a saida completa normal.

## Requisitos

- Node.js instalado
- npm instalado

## 1. Instalar dependencias

Entre na pasta do projeto:

```bash
cd /home/pinguimsurfante/ai-terminal/otimizador-logs
```

Instale as dependencias:

```bash
npm install
```

## 2. Gerar a versao compilada

Compile o projeto para a pasta `dist`:

```bash
npm run build
```

## 3. Liberar o comando global `ai-term`

Para usar o comando direto no terminal, rode:

```bash
npm link
```

Isso registra o binario definido no projeto e libera o uso do comando `ai-term` globalmente no seu ambiente.

## 4. Testar se funcionou

Depois do `npm link`, teste:

```bash
ai-term git status
```

Se estiver tudo certo, a CLI vai executar `git status` e tentar mostrar uma versao otimizada da saida.

## Como usar

A sintaxe geral e:

```bash
ai-term <comando>
```

Exemplos:

```bash
ai-term git status
ai-term npm test
ai-term npx jest
```

## Como rodar sem instalar globalmente

Se voce nao quiser usar `npm link`, pode executar direto pelo Node:

```bash
node dist/cli.js "git status"
node dist/cli.js "npm test"
```

Ou em modo TypeScript, sem depender da pasta `dist`:

```bash
npx ts-node src/cli.ts "git status"
npx ts-node src/cli.ts "npm test"
```

## Fluxo recomendado para desenvolvimento

Sempre que alterar o codigo:

1. Rode o build novamente:

```bash
npm run build
```

2. Teste a CLI:

```bash
ai-term git status
```

Se o comando global nao refletir suas alteracoes, rode o build de novo antes de testar.

## Atualizar a instalacao global

Se voce fizer mudancas no projeto, o fluxo normal e:

```bash
cd /home/pinguimsurfante/ai-terminal/otimizador-logs
npm run build
```

Como o comando global aponta para os arquivos desse projeto, normalmente basta recompilar.

Se precisar reinstalar o link:

```bash
npm link
```

## Remover o comando global

Para remover o `ai-term` do sistema:

```bash
npm unlink -g ai-terminal-optimizer
```

Se quiser desfazer o link a partir da pasta do projeto:

```bash
cd /home/pinguimsurfante/ai-terminal/otimizador-logs
npm unlink
```

## Estrutura principal

- `src/cli.ts`: entrada da CLI
- `src/runCommand.ts`: executa o comando recebido
- `src/detectCommand.ts`: detecta qual parser usar
- `src/parsers/`: parsers de saida

## Observacoes

- O nome do comando liberado no terminal e `ai-term`.
- Se voce tentar usar `at-term`, nao vai funcionar, a menos que crie um alias manualmente.
- O projeto depende de `npm run build` para gerar `dist/cli.js`, que e o arquivo usado pelo binario global.

## CI/CD (GitHub Actions)

O projeto agora inclui dois workflows:

- `CI` (`.github/workflows/ci.yml`)
  - Roda em `push` e `pull_request` para `main`/`master`
  - Executa `npm ci` e `npm run build`
- `Release` (`.github/workflows/release.yml`)
  - Roda quando uma release e publicada no GitHub
  - Executa `npm ci`, `npm run build` e `npm publish`

Para o workflow de release funcionar, configure no repositório:

- Secret: `NPM_TOKEN` (token de automacao do npm com permissao de publish)

## Como usar em qualquer outro projeto

Se voce quiser usar o otimizador em outro repositorio (por exemplo `meu-app`), siga este fluxo.

### Opcao A: instalacao global (recomendada para uso diario)

1. Instale o pacote globalmente:

```bash
npm i -g ai-terminal-optimizer
```

2. Entre no projeto onde voce quer usar:

```bash
cd /caminho/do/seu-outro-projeto
```

3. Rode comandos com o prefixo `ai-term`:

```bash
ai-term git status
ai-term git push origin minha-branch
ai-term npm test
ai-term npm i axios
```

### Opcao B: usar sem instalacao global

Se nao quiser instalar globalmente, rode com `npx`:

```bash
npx ai-terminal-optimizer git status
npx ai-terminal-optimizer npm test
```

### Se o comando `ai-term` nao existir

Verifique se o pacote foi publicado no npm. Se ainda nao foi, use localmente via clone:

```bash
git clone <url-do-repo> otimizador-logs
cd otimizador-logs
npm install
npm run build
npm link
```

Depois disso, o `ai-term` fica disponivel no terminal e pode ser usado em qualquer pasta/projeto.
