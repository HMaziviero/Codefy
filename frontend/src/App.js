import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const teacherClient = axios.create({ baseURL: API });
const studentClient = axios.create({ baseURL: API });

function App() {
  const [tab, setTab] = useState('professor');

  return (
    <div className="container">
      <h1>Voz de Todos (MVP)</h1>
      <p>Comunicação rápida entre professor e aluno, sem cadastro de aluno.</p>

      <div className="tabs">
        <button className={tab === 'professor' ? 'active' : ''} onClick={() => setTab('professor')}>Professor</button>
        <button className={tab === 'aluno' ? 'active' : ''} onClick={() => setTab('aluno')}>Aluno</button>
      </div>

      {tab === 'professor' ? <ProfessorView /> : <AlunoView />}
    </div>
  );
}

function ProfessorView() {
  const [auth, setAuth] = useState(() => localStorage.getItem('prof_token') || '');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [sessao, setSessao] = useState(null);
  const [tipo, setTipo] = useState('ABERTA');
  const [enunciado, setEnunciado] = useState('');
  const [alternativasTexto, setAlternativasTexto] = useState('');
  const [perguntaAtual, setPerguntaAtual] = useState(null);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (auth) {
      teacherClient.defaults.headers.common.Authorization = `Bearer ${auth}`;
      carregarSessaoAberta();
    }
  }, [auth]);

  useEffect(() => {
    if (!sessao?.codigo_acesso) return;
    const t = setInterval(() => carregarPerguntaAtual(sessao.codigo_acesso), 4000);
    return () => clearInterval(t);
  }, [sessao]);

  const joinUrl = useMemo(() => sessao ? `${window.location.origin}/?codigo=${sessao.codigo_acesso}` : '', [sessao]);

  const cadastrar = async () => {
    const res = await teacherClient.post('/professores/cadastro', { nome, email, senha });
    localStorage.setItem('prof_token', res.data.token);
    setAuth(res.data.token);
  };

  const login = async () => {
    const res = await teacherClient.post('/professores/login', { email, senha });
    localStorage.setItem('prof_token', res.data.token);
    setAuth(res.data.token);
  };

  const carregarSessaoAberta = async () => {
    try {
      const res = await teacherClient.get('/sessoes/aberta');
      setSessao(res.data);
      carregarPerguntaAtual(res.data.codigo_acesso);
    } catch {
      setSessao(null);
    }
  };

  const criarSessao = async () => {
    const res = await teacherClient.post('/sessoes', { titulo: `Aula ${new Date().toLocaleString()}` });
    setSessao(res.data);
  };

  const criarPergunta = async () => {
    if (!sessao) return;
    const payload = { tipo, enunciado };
    if (tipo === 'MULTIPLA_ESCOLHA') {
      payload.alternativas = alternativasTexto.split('\n').map(v => v.trim()).filter(Boolean);
    }
    const res = await teacherClient.post(`/sessoes/${sessao.id}/perguntas`, payload);
    setEnunciado('');
    setAlternativasTexto('');
    setPerguntaAtual({ id: res.data.id, tipo, enunciado });
    setResultado(null);
  };

  const carregarPerguntaAtual = async (codigo) => {
    const res = await teacherClient.get(`/sessoes/${codigo}/pergunta-atual`);
    setPerguntaAtual(res.data.pergunta);
    if (res.data.pergunta?.id) {
      carregarResultado(res.data.pergunta.id);
    }
  };

  const carregarResultado = async (perguntaId) => {
    const res = await teacherClient.get(`/perguntas/${perguntaId}/resultados`);
    setResultado(res.data);
  };

  return (
    <div className="card">
      {!auth && (
        <>
          <h2>Cadastro/Login Professor</h2>
          <input placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} />
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} />
          <div className="row">
            <button onClick={cadastrar}>Cadastrar</button>
            <button onClick={login}>Entrar</button>
          </div>
        </>
      )}

      {auth && (
        <>
          <h2>Painel do Professor</h2>
          {!sessao ? (
            <button onClick={criarSessao}>Criar nova sessão</button>
          ) : (
            <>
              <p><strong>Código da sessão:</strong> {sessao.codigo_acesso}</p>
              <p><strong>Link:</strong> {joinUrl}</p>
              <img alt="QR Code da sessão" src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(joinUrl)}`} />

              <hr />
              <h3>Criar pergunta rápida</h3>
              <select value={tipo} onChange={e => setTipo(e.target.value)}>
                <option value="ABERTA">Aberta</option>
                <option value="MULTIPLA_ESCOLHA">Múltipla escolha</option>
              </select>
              <textarea placeholder="Digite a pergunta" value={enunciado} onChange={e => setEnunciado(e.target.value)} />
              {tipo === 'MULTIPLA_ESCOLHA' && (
                <textarea
                  placeholder="Uma alternativa por linha"
                  value={alternativasTexto}
                  onChange={e => setAlternativasTexto(e.target.value)}
                />
              )}
              <button onClick={criarPergunta}>Publicar pergunta</button>

              {perguntaAtual && (
                <>
                  <hr />
                  <h3>Pergunta atual</h3>
                  <p>{perguntaAtual.enunciado}</p>
                </>
              )}

              {resultado?.tipo === 'MULTIPLA_ESCOLHA' && (
                <ul>
                  {resultado.opcoes.map((op) => (
                    <li key={op.alternativa_id}>{op.ordem}. {op.texto} — {op.votos} voto(s)</li>
                  ))}
                </ul>
              )}

              {resultado?.tipo === 'ABERTA' && (
                <ul>
                  {resultado.respostas.map((r, i) => (
                    <li key={i}><strong>{r.aluno_nome}:</strong> {r.texto_livre}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function AlunoView() {
  const [codigo, setCodigo] = useState(new URLSearchParams(window.location.search).get('codigo') || '');
  const [nome, setNome] = useState('');
  const [token, setToken] = useState(() => localStorage.getItem('aluno_token') || '');
  const [pergunta, setPergunta] = useState(null);
  const [alternativas, setAlternativas] = useState([]);
  const [textoLivre, setTextoLivre] = useState('');
  const [alternativaId, setAlternativaId] = useState('');
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    if (!codigo || !token) return;
    studentClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    const t = setInterval(() => carregarPergunta(), 3000);
    carregarPergunta();
    return () => clearInterval(t);
  }, [codigo, token]);

  const entrar = async () => {
    const res = await studentClient.post(`/sessoes/${codigo.toUpperCase()}/entrar`, { nome });
    localStorage.setItem('aluno_token', res.data.token);
    studentClient.defaults.headers.common.Authorization = `Bearer ${res.data.token}`;
    setToken(res.data.token);
  };

  const carregarPergunta = async () => {
    const res = await studentClient.get(`/sessoes/${codigo.toUpperCase()}/pergunta-atual`);
    setPergunta(res.data.pergunta);
    setAlternativas(res.data.alternativas || []);
  };

  const responder = async () => {
    if (!pergunta) return;
    const payload = pergunta.tipo === 'ABERTA'
      ? { texto_livre: textoLivre }
      : { alternativa_id: Number(alternativaId) };
    await studentClient.post(`/perguntas/${pergunta.id}/responder`, payload);
    setMensagem('Resposta enviada com sucesso!');
    setTextoLivre('');
    setAlternativaId('');
  };

  return (
    <div className="card">
      <h2>Entrada do Aluno</h2>
      {!token && (
        <>
          <input placeholder="Código da sessão" value={codigo} onChange={e => setCodigo(e.target.value)} />
          <input placeholder="Seu nome" value={nome} onChange={e => setNome(e.target.value)} />
          <button onClick={entrar}>Entrar na sessão</button>
        </>
      )}

      {token && (
        <>
          <p><strong>Sessão:</strong> {codigo.toUpperCase()}</p>
          {!pergunta && <p>Aguardando o professor publicar uma pergunta...</p>}

          {pergunta && (
            <>
              <h3>{pergunta.enunciado}</h3>

              {pergunta.tipo === 'ABERTA' && (
                <textarea value={textoLivre} onChange={e => setTextoLivre(e.target.value)} placeholder="Digite sua resposta" />
              )}

              {pergunta.tipo === 'MULTIPLA_ESCOLHA' && (
                <div className="radio-list">
                  {alternativas.map((alt) => (
                    <label key={alt.id}>
                      <input
                        type="radio"
                        name="alt"
                        value={alt.id}
                        checked={String(alt.id) === alternativaId}
                        onChange={(e) => setAlternativaId(e.target.value)}
                      />
                      {alt.ordem}. {alt.texto}
                    </label>
                  ))}
                </div>
              )}

              <button onClick={responder}>Enviar resposta</button>
              {mensagem && <p>{mensagem}</p>}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
