from datetime import datetime, timedelta
import os
import secrets
import string
from typing import List, Literal, Optional

import jwt
import pymysql
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from starlette.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI(title="Voz de Todos MVP API")
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "trocar-em-producao")
ALGORITHM = "HS256"


def get_connection():
    return pymysql.connect(
        host=os.environ.get("MYSQL_HOST", "localhost"),
        port=int(os.environ.get("MYSQL_PORT", "3306")),
        user=os.environ.get("MYSQL_USER", "root"),
        password=os.environ.get("MYSQL_PASSWORD", ""),
        database=os.environ.get("MYSQL_DB", "voz_de_todos_mvp"),
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
    )


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_code(length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def create_token(payload: dict, minutes: int = 24 * 60) -> str:
    data = payload.copy()
    data["exp"] = datetime.utcnow() + timedelta(minutes=minutes)
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")


class ProfessorCadastro(BaseModel):
    nome: str
    email: EmailStr
    senha: str


class ProfessorLogin(BaseModel):
    email: EmailStr
    senha: str


class SessaoCreate(BaseModel):
    titulo: Optional[str] = None


class PerguntaCreate(BaseModel):
    tipo: Literal["ABERTA", "MULTIPLA_ESCOLHA"]
    enunciado: str
    alternativas: Optional[List[str]] = None


class EntrarSessao(BaseModel):
    nome: str


class RespostaCreate(BaseModel):
    alternativa_id: Optional[int] = None
    texto_livre: Optional[str] = None


async def professor_autenticado(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    payload = decode_token(credentials.credentials)
    if payload.get("tipo") != "professor":
        raise HTTPException(status_code=401, detail="Acesso somente para professor")
    return payload


async def participante_autenticado(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    payload = decode_token(credentials.credentials)
    if payload.get("tipo") != "participante":
        raise HTTPException(status_code=401, detail="Acesso somente para participante")
    return payload


@app.post("/api/professores/cadastro")
async def cadastro_professor(data: ProfessorCadastro):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM professor WHERE email=%s", (data.email,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Email já cadastrado")

            cur.execute(
                "INSERT INTO professor (nome, email, senha_hash) VALUES (%s, %s, %s)",
                (data.nome, data.email, hash_password(data.senha)),
            )
            professor_id = cur.lastrowid

    token = create_token({"tipo": "professor", "professor_id": professor_id})
    return {"token": token, "professor_id": professor_id, "nome": data.nome}


@app.post("/api/professores/login")
async def login_professor(data: ProfessorLogin):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, nome, senha_hash FROM professor WHERE email=%s", (data.email,))
            professor = cur.fetchone()

    if not professor or not verify_password(data.senha, professor["senha_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    token = create_token({"tipo": "professor", "professor_id": professor["id"]})
    return {"token": token, "professor_id": professor["id"], "nome": professor["nome"]}


@app.get("/api/professores/me")
async def professor_me(payload: dict = Depends(professor_autenticado)):
    return payload


@app.post("/api/sessoes")
async def criar_sessao(data: SessaoCreate, payload: dict = Depends(professor_autenticado)):
    professor_id = payload["professor_id"]

    with get_connection() as conn:
        with conn.cursor() as cur:
            codigo = create_access_code()
            while True:
                cur.execute("SELECT id FROM sessao WHERE codigo_acesso=%s", (codigo,))
                if not cur.fetchone():
                    break
                codigo = create_access_code()

            cur.execute(
                "INSERT INTO sessao (professor_id, titulo, codigo_acesso, status) VALUES (%s, %s, %s, 'ABERTA')",
                (professor_id, data.titulo, codigo),
            )
            sessao_id = cur.lastrowid

    return {"id": sessao_id, "codigo_acesso": codigo, "titulo": data.titulo, "status": "ABERTA"}


@app.get("/api/sessoes/aberta")
async def sessao_aberta(payload: dict = Depends(professor_autenticado)):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, titulo, codigo_acesso, status, criada_em
                FROM sessao
                WHERE professor_id=%s AND status='ABERTA'
                ORDER BY criada_em DESC
                LIMIT 1
                """,
                (payload["professor_id"],),
            )
            sessao = cur.fetchone()
            if not sessao:
                raise HTTPException(status_code=404, detail="Nenhuma sessão aberta")
    return sessao


@app.post("/api/sessoes/{codigo_acesso}/entrar")
async def entrar_sessao(codigo_acesso: str, data: EntrarSessao):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM sessao WHERE codigo_acesso=%s AND status='ABERTA'",
                (codigo_acesso,),
            )
            sessao = cur.fetchone()
            if not sessao:
                raise HTTPException(status_code=404, detail="Sessão não encontrada")

            cur.execute(
                "INSERT INTO participante (sessao_id, nome) VALUES (%s, %s)",
                (sessao["id"], data.nome),
            )
            participante_id = cur.lastrowid

    token = create_token(
        {
            "tipo": "participante",
            "participante_id": participante_id,
            "sessao_id": sessao["id"],
            "codigo_acesso": codigo_acesso,
            "nome": data.nome,
        },
        minutes=8 * 60,
    )
    return {"token": token, "participante_id": participante_id, "sessao_id": sessao["id"]}


@app.post("/api/sessoes/{sessao_id}/perguntas")
async def criar_pergunta(sessao_id: int, data: PerguntaCreate, payload: dict = Depends(professor_autenticado)):
    if data.tipo == "MULTIPLA_ESCOLHA" and (not data.alternativas or len(data.alternativas) < 2):
        raise HTTPException(status_code=400, detail="Pergunta de múltipla escolha precisa de pelo menos 2 alternativas")

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM sessao WHERE id=%s AND professor_id=%s AND status='ABERTA'",
                (sessao_id, payload["professor_id"]),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=403, detail="Sessão inválida")

            cur.execute("UPDATE pergunta SET encerrada_em=NOW() WHERE sessao_id=%s AND encerrada_em IS NULL", (sessao_id,))
            cur.execute(
                "INSERT INTO pergunta (sessao_id, tipo, enunciado) VALUES (%s, %s, %s)",
                (sessao_id, data.tipo, data.enunciado),
            )
            pergunta_id = cur.lastrowid

            if data.tipo == "MULTIPLA_ESCOLHA":
                for idx, alt in enumerate(data.alternativas or [], start=1):
                    cur.execute(
                        "INSERT INTO alternativa (pergunta_id, ordem, texto) VALUES (%s, %s, %s)",
                        (pergunta_id, idx, alt.strip()),
                    )

    return {"id": pergunta_id}


@app.get("/api/sessoes/{codigo_acesso}/pergunta-atual")
async def pergunta_atual(codigo_acesso: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM sessao WHERE codigo_acesso=%s AND status='ABERTA'", (codigo_acesso,))
            sessao = cur.fetchone()
            if not sessao:
                raise HTTPException(status_code=404, detail="Sessão não encontrada")

            cur.execute(
                """
                SELECT id, sessao_id, tipo, enunciado, criada_em
                FROM pergunta
                WHERE sessao_id=%s AND encerrada_em IS NULL
                ORDER BY criada_em DESC
                LIMIT 1
                """,
                (sessao["id"],),
            )
            pergunta = cur.fetchone()
            if not pergunta:
                return {"pergunta": None}

            alternativas = []
            if pergunta["tipo"] == "MULTIPLA_ESCOLHA":
                cur.execute(
                    "SELECT id, ordem, texto FROM alternativa WHERE pergunta_id=%s ORDER BY ordem ASC",
                    (pergunta["id"],),
                )
                alternativas = cur.fetchall()

    return {"pergunta": pergunta, "alternativas": alternativas}


@app.post("/api/perguntas/{pergunta_id}/responder")
async def responder_pergunta(
    pergunta_id: int,
    data: RespostaCreate,
    payload: dict = Depends(participante_autenticado),
):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, tipo FROM pergunta WHERE id=%s AND sessao_id=%s AND encerrada_em IS NULL",
                (pergunta_id, payload["sessao_id"]),
            )
            pergunta = cur.fetchone()
            if not pergunta:
                raise HTTPException(status_code=404, detail="Pergunta não encontrada ou encerrada")

            alternativa_id = data.alternativa_id
            texto_livre = (data.texto_livre or "").strip() or None

            if pergunta["tipo"] == "ABERTA" and not texto_livre:
                raise HTTPException(status_code=400, detail="Resposta aberta obrigatória")
            if pergunta["tipo"] == "MULTIPLA_ESCOLHA" and not alternativa_id:
                raise HTTPException(status_code=400, detail="Alternativa obrigatória")

            try:
                cur.execute(
                    """
                    INSERT INTO resposta (pergunta_id, participante_id, alternativa_id, texto_livre)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (pergunta_id, payload["participante_id"], alternativa_id, texto_livre),
                )
            except pymysql.err.IntegrityError:
                raise HTTPException(status_code=409, detail="Você já respondeu essa pergunta")

    return {"ok": True}


@app.get("/api/perguntas/{pergunta_id}/resultados")
async def resultados(pergunta_id: int, payload: dict = Depends(professor_autenticado)):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT p.id, p.tipo, p.enunciado
                FROM pergunta p
                JOIN sessao s ON s.id = p.sessao_id
                WHERE p.id=%s AND s.professor_id=%s
                """,
                (pergunta_id, payload["professor_id"]),
            )
            pergunta = cur.fetchone()
            if not pergunta:
                raise HTTPException(status_code=404, detail="Pergunta não encontrada")

            if pergunta["tipo"] == "MULTIPLA_ESCOLHA":
                cur.execute(
                    """
                    SELECT a.id AS alternativa_id, a.ordem, a.texto, COUNT(r.id) AS votos
                    FROM alternativa a
                    LEFT JOIN resposta r ON r.alternativa_id=a.id
                    WHERE a.pergunta_id=%s
                    GROUP BY a.id, a.ordem, a.texto
                    ORDER BY a.ordem ASC
                    """,
                    (pergunta_id,),
                )
                return {"tipo": "MULTIPLA_ESCOLHA", "enunciado": pergunta["enunciado"], "opcoes": cur.fetchall()}

            cur.execute(
                """
                SELECT pa.nome AS aluno_nome, r.texto_livre, r.respondida_em
                FROM resposta r
                JOIN participante pa ON pa.id=r.participante_id
                WHERE r.pergunta_id=%s
                ORDER BY r.respondida_em DESC
                """,
                (pergunta_id,),
            )
            return {"tipo": "ABERTA", "enunciado": pergunta["enunciado"], "respostas": cur.fetchall()}


app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
