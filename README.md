# projeto-doceria-Multilojas

## 🚀 Deploy do Projeto
Siga os passos abaixo para instalar as dependências e realizar o deploy da aplicação no Firebase.

---

### 1️⃣ Instalar dependências do CRM e gerar o build
```bash
# Instalar a CLI do Firebase (caso ainda não tenha)
npm install -g firebase-tools

# Entrar na pasta do CRM
cd crm

# Instalar dependências
npm install

# Gerar build da aplicação
npm run build
```

---

### 2️⃣ Instalar dependências das Functions
```bash
cd ../functions
npm install
```

---

### 3️⃣ Fazer o deploy para o Firebase
Volte para a raiz do projeto:
```bash
cd ..
```

#### 🔸 Deploy completo (Hosting + Functions, etc.)
```bash
firebase deploy
```

#### 🔸 Deploy somente do Hosting
```bash
firebase deploy --only hosting
```
---
## 🧪 Testar localmente

Para testar a aplicação gerada localmente, rode o comando abaixo no **diretório da aplicação** (onde está a pasta `dist` ou equivalente):
```bash
http-server
```

> 💡 Se não tiver o `http-server` instalado globalmente, use:
> ```bash
> npm install -g http-server
> ```

---

## 📤 Publicar alterações no Git
1. **Verificar configuração de usuário**
   ```bash
   git config user.name
   git config user.email
   ```
2. **Verificar o status atual**
   ```bash
   git status
   ```
   Isso mostra quais arquivos foram modificados.
3. **Adicionar os arquivos para o commit**
   ```bash
   # Para adicionar todos os arquivos modificados
   git add .

   # Ou para adicionar arquivos específicos
   git add nome_do_arquivo
   ```
4. **Fazer o commit das alterações**
   ```bash
   git commit -m "Descrição das alterações realizadas"
   ```
5. **Enviar para o repositório remoto**
   ```bash
   git push origin main
   ```
   > Se sua branch principal for chamada `master`:
   > ```bash
   > git push origin master
   > ```

---
## 🔑 Configuração segura da chave do Google Maps

1. **Habilite as APIs necessárias** no projeto do Google Cloud usado pelo Firebase: Maps JavaScript API, Geocoding API e Places API. O faturamento deve estar ativo para a chave funcionar.
2. **Defina a chave como segredo das Functions** para que ela não fique exposta no código-fonte:
   ```bash
   firebase functions:secrets:set MAPS_API_KEY
   # Adicione os domínios de produção e homolog separados por vírgula
   firebase functions:secrets:set MAPS_ALLOWED_ORIGINS
   ```
   Depois, redeploy:
   ```bash
   firebase deploy --only functions:api
   ```
3. **Aplique restrições na chave no Console do Google Cloud**:
   - Tipo de restrição: *Aplicativos da Web* (chave JavaScript).
   - URLs autorizadas: domínios de produção e homologação utilizados pelo cardápio público.
   - APIs permitidas: Maps JavaScript API, Geocoding API e Places API.
4. **Como funciona no frontend**: as páginas `cardapio-*.html` carregam a chave via endpoint `/maps-key` da Cloud Function usando o arquivo `crm/public/mapsApiConfig.js`. A chave é interpolada na URL do script do Maps em tempo de execução, evitando hardcode no HTML.
5. **Monitoramento**: se o endpoint `/maps-key` retornar 503, a chave não foi configurada; se retornar 403, a origem não está na lista permitida. Ajuste as secrets ou os domínios autorizados para evitar bloqueios futuros.
   
   firebase deploy --only hosting --project crmdoceria-9959e
firebase deploy --only hosting --project ana-guimaraes