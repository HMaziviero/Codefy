# Voz de Todos - MVP

Aplicação simples para comunicação em tempo real entre professor e aluno durante a aula.

## Fluxo

1. Professor faz cadastro/login.
2. Professor abre uma sessão e recebe um `codigo_acesso`.
3. Aluno entra sem cadastro, apenas com nome + código.
4. Professor publica pergunta (aberta ou múltipla escolha).
5. Aluno responde no celular.
6. Professor acompanha os resultados no painel.

## Banco de dados

O schema MySQL está em:

- `backend/schema.sql`

## Backend (FastAPI)

### Variáveis de ambiente

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=sua_senha
MYSQL_DB=voz_de_todos_mvp
JWT_SECRET_KEY=troque_essa_chave
CORS_ORIGINS=*
```

### Rodar

```bash
pip install -r backend/requirements.txt
uvicorn backend.server:app --reload --host 0.0.0.0 --port 8000
```

## Frontend (React)

```bash
cd frontend
npm install
REACT_APP_BACKEND_URL=http://localhost:8000 npm start
```
