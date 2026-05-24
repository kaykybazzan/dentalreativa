--
-- PostgreSQL database dump
--

\restrict sLJbu4Dsv1OcLTb7KIb9xAAlYxgkPyB2Bv8dy2vEgnZFY6teUMzv0e0s0vnTJQI

-- Dumped from database version 13.2
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: StatusPaciente; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StatusPaciente" AS ENUM (
    'ativo',
    'em_risco',
    'contatado',
    'aguardando_resposta',
    'recuperado',
    'perdido',
    'nao_contatar'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Clinica; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Clinica" (
    id integer NOT NULL,
    nome character varying(255) NOT NULL,
    cidade character varying(255),
    telefone character varying(50),
    "numDentistas" character varying(50),
    "ticketMedio" double precision DEFAULT 300,
    plano character varying(50) DEFAULT 'fundador'::character varying,
    "criadaEm" timestamp without time zone DEFAULT now()
);


--
-- Name: Clinica_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Clinica_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Clinica_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Clinica_id_seq" OWNED BY public."Clinica".id;


--
-- Name: ConfiguracaoMensagens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConfiguracaoMensagens" (
    id integer NOT NULL,
    "clinicaId" integer NOT NULL,
    "diasGatilho" integer DEFAULT 180,
    "diasEntreTentativa2" integer DEFAULT 3,
    "diasEntreTentativa3" integer DEFAULT 5,
    mensagem1 text,
    mensagem2 text,
    mensagem3 text,
    "mensagemDireta" text
);


--
-- Name: ConfiguracaoMensagens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ConfiguracaoMensagens_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ConfiguracaoMensagens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ConfiguracaoMensagens_id_seq" OWNED BY public."ConfiguracaoMensagens".id;


--
-- Name: ContactAttempt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ContactAttempt" (
    id integer NOT NULL,
    "pacienteId" integer NOT NULL,
    "clinicaId" integer NOT NULL,
    "tentativaNumero" integer NOT NULL,
    "mensagemEnviada" text,
    "valorRecuperado" double precision,
    tipo character varying(50) NOT NULL,
    "criadoEm" timestamp without time zone DEFAULT now()
);


--
-- Name: ContactAttempt_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ContactAttempt_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ContactAttempt_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ContactAttempt_id_seq" OWNED BY public."ContactAttempt".id;


--
-- Name: Paciente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Paciente" (
    id integer NOT NULL,
    "clinicaId" integer NOT NULL,
    nome character varying(255) NOT NULL,
    telefone character varying(50) NOT NULL,
    "telefoneBruto" character varying(50),
    email character varying(255),
    "ultimaConsulta" timestamp without time zone,
    procedimento character varying(255),
    "valorUltimaConsulta" double precision,
    status public."StatusPaciente" DEFAULT 'ativo'::public."StatusPaciente",
    "tentativaAtual" integer DEFAULT 0,
    "ultimaTentativa" timestamp without time zone,
    "dadosIncompletos" boolean DEFAULT false,
    "criadoEm" timestamp without time zone DEFAULT now(),
    "atualizadoEm" timestamp without time zone DEFAULT now(),
    "vaiMarcar" boolean DEFAULT false
);


--
-- Name: Paciente_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Paciente_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Paciente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Paciente_id_seq" OWNED BY public."Paciente".id;


--
-- Name: Usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Usuario" (
    id integer NOT NULL,
    "clinicaId" integer NOT NULL,
    nome character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    "senhaHash" character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'admin'::character varying,
    "criadoEm" timestamp without time zone DEFAULT now()
);


--
-- Name: Usuario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Usuario_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Usuario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Usuario_id_seq" OWNED BY public."Usuario".id;


--
-- Name: Clinica id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Clinica" ALTER COLUMN id SET DEFAULT nextval('public."Clinica_id_seq"'::regclass);


--
-- Name: ConfiguracaoMensagens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConfiguracaoMensagens" ALTER COLUMN id SET DEFAULT nextval('public."ConfiguracaoMensagens_id_seq"'::regclass);


--
-- Name: ContactAttempt id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactAttempt" ALTER COLUMN id SET DEFAULT nextval('public."ContactAttempt_id_seq"'::regclass);


--
-- Name: Paciente id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Paciente" ALTER COLUMN id SET DEFAULT nextval('public."Paciente_id_seq"'::regclass);


--
-- Name: Usuario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Usuario" ALTER COLUMN id SET DEFAULT nextval('public."Usuario_id_seq"'::regclass);


--
-- Data for Name: Clinica; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Clinica" (id, nome, cidade, telefone, "numDentistas", "ticketMedio", plano, "criadaEm") FROM stdin;
1	Clínica Teste	Blumenau	47999999999	\N	300	fundador	2026-05-10 13:59:50.63224
5	Dentalclinica	Timbó	(84) 44444-4444	\N	300	fundador	2026-05-10 17:52:15.161457
8	Clínica Sorriso Perfeito	São Paulo	(11) 99999-0000	\N	300	fundador	2026-05-23 10:09:47.165827
15	Clínica QA	Florianópolis	(99) 99999-9999	\N	300	fundador	2026-05-24 15:34:36.140312
\.


--
-- Data for Name: ConfiguracaoMensagens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConfiguracaoMensagens" (id, "clinicaId", "diasGatilho", "diasEntreTentativa2", "diasEntreTentativa3", mensagem1, mensagem2, mensagem3, "mensagemDireta") FROM stdin;
2	8	180	3	5	Olá [nome]! Já faz um tempinho desde sua última consulta na [clinica]. Que tal agendar uma revisão?	[nome], temos horários disponíveis essa semana na [clinica]. Posso reservar um para você?	Oi [nome]! Queremos ter certeza de que está tudo bem. Podemos ajudar com algo? Entre em contato com a [clinica].	\N
1	5	180	3	5	Olá [nome]! Já faz um tempinho desde sua última consulta na [clinica]. Que tal agendar uma revisão?	[nome], temos horários disponíveis essa semana na [clinica]. Posso reservar um para você?	Oi [nome]! Queremos ter certeza de que está tudo bem. Podemos ajudar com algo? Entre em contato com a [clinica].	Bom dia
13	15	180	3	5	Oi [nome]! Faz um tempo que não te vemos na [clinica]. Vamos agendar?	[nome], ainda temos horários disponíveis na [clinica] essa semana!	[nome], última tentativa de contato da [clinica]. Estamos aqui se precisar!	Olá [nome]! Aqui é a [clinica]. Tudo bem? Que tal agendar sua consulta????? 😊
\.


--
-- Data for Name: ContactAttempt; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ContactAttempt" (id, "pacienteId", "clinicaId", "tentativaNumero", "mensagemEnviada", "valorRecuperado", tipo, "criadoEm") FROM stdin;
44	146	8	1	Contato realizado	0	recuperado	2026-05-23 15:58:18.433796
46	176	5	1	\N	376	recuperado	2026-05-24 14:55:58.426601
47	206	15	1	\N	\N	enviado	2026-05-24 15:53:55.54103
50	209	15	1	\N	\N	enviado	2026-05-24 15:54:55.68539
48	207	15	1	\N	0	recuperado	2026-05-24 15:54:48.213982
49	208	15	1	\N	0	recuperado	2026-05-24 15:54:51.782959
51	210	15	1	\N	\N	enviado	2026-05-24 16:13:39.687092
\.


--
-- Data for Name: Paciente; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Paciente" (id, "clinicaId", nome, telefone, "telefoneBruto", email, "ultimaConsulta", procedimento, "valorUltimaConsulta", status, "tentativaAtual", "ultimaTentativa", "dadosIncompletos", "criadoEm", "atualizadoEm", "vaiMarcar") FROM stdin;
126	8	Maria Silva	47999991234	\N	\N	2026-01-12 00:00:00	\N	250	ativo	0	\N	f	2026-05-23 13:09:12.531855	2026-05-23 13:09:12.531855	f
127	8	JoÃ£o Santos	47988887777	\N	\N	2026-03-15 00:00:00	\N	250	ativo	0	\N	f	2026-05-23 13:09:12.546716	2026-05-23 13:09:12.546716	f
129	8	Rafael Pereira	47999996666	\N	\N	2025-11-05 00:00:00	\N	1500	ativo	0	\N	f	2026-05-23 13:09:12.551044	2026-05-23 13:09:12.551044	f
130	8	Fernanda Costa	47999995555	\N	\N	2026-03-10 00:00:00	\N	800	ativo	0	\N	f	2026-05-23 13:09:12.553742	2026-05-23 13:09:12.553742	f
131	8	Carlos Souza	47999994444	\N	\N	2025-11-18 00:00:00	\N	150	ativo	0	\N	f	2026-05-23 13:09:12.556213	2026-05-23 13:09:12.556213	f
132	8	Julia Mendes	47988883333	\N	\N	2026-01-22 00:00:00	\N	350	ativo	0	\N	f	2026-05-23 13:09:12.558315	2026-05-23 13:09:12.558315	f
133	8	Pedro Alves	47999992222	\N	\N	2025-10-30 00:00:00	\N	250	ativo	0	\N	f	2026-05-23 13:09:12.560681	2026-05-23 13:09:12.560681	f
134	8	Mariana Oliveira	47999991111	\N	\N	2026-02-08 00:00:00	\N	450	ativo	0	\N	f	2026-05-23 13:09:12.562969	2026-05-23 13:09:12.562969	f
135	8	Lucas Rocha	47999990000	\N	\N	2025-09-25 00:00:00	\N	150	ativo	0	\N	f	2026-05-23 13:09:12.565033	2026-05-23 13:09:12.565033	f
136	8	PatrÃ­cia Nunes	47988889999	\N	\N	2026-04-14 00:00:00	\N	200	ativo	0	\N	f	2026-05-23 13:09:12.567374	2026-05-23 13:09:12.567374	f
137	8	Rodrigo Lima	47988888888	\N	\N	2025-11-02 00:00:00	\N	250	ativo	0	\N	f	2026-05-23 13:09:12.569212	2026-05-23 13:09:12.569212	f
138	8	Beatriz Santos	47977777777	\N	\N	2026-02-19 00:00:00	\N	800	ativo	0	\N	f	2026-05-23 13:09:12.571195	2026-05-23 13:09:12.571195	f
139	8	Thiago Costa	47999976666	\N	\N	2025-10-28 00:00:00	\N	350	ativo	0	\N	f	2026-05-23 13:09:12.573027	2026-05-23 13:09:12.573027	f
140	8	Camila Ferreira	47977775555	\N	\N	\N	\N	250	ativo	0	\N	t	2026-05-23 13:09:12.575664	2026-05-23 13:09:12.575664	f
141	8	Diego Martins	47966664444	\N	\N	2026-03-16 00:00:00	\N	2000	ativo	0	\N	f	2026-05-23 13:09:12.577595	2026-05-23 13:09:12.577595	f
142	8	Larissa Pereira	47999963333	\N	\N	2025-10-03 00:00:00	\N	200	ativo	0	\N	f	2026-05-23 13:09:12.580212	2026-05-23 13:09:12.580212	f
143	8	Marcos Almeida	47955552222	\N	\N	2026-02-24 00:00:00	\N	250	ativo	0	\N	f	2026-05-23 13:09:12.582931	2026-05-23 13:09:12.582931	f
144	8	Juliana Ramos	47944441111	\N	\N	2026-03-11 00:00:00	\N	500	ativo	0	\N	f	2026-05-23 13:09:12.585431	2026-05-23 13:09:12.585431	f
145	8	Roberto Silva	47999940000	\N	\N	2025-09-06 00:00:00	\N	350	ativo	0	\N	f	2026-05-23 13:09:12.587621	2026-05-23 13:09:12.587621	f
147	8	Gustavo Oliveira	47922228888	\N	\N	2026-03-13 00:00:00	\N	200	ativo	0	\N	f	2026-05-23 13:09:12.591691	2026-05-23 13:09:12.591691	f
148	8	Vanessa Lima	47999917777	\N	\N	2025-11-22 00:00:00	\N	800	ativo	0	\N	f	2026-05-23 13:09:12.5941	2026-05-23 13:09:12.5941	f
149	8	Anderson Souza	47911116666	\N	\N	2026-01-05 00:00:00	\N	150	ativo	0	\N	f	2026-05-23 13:09:12.598248	2026-05-23 13:09:12.598248	f
150	8	Renata Costa	47900005555	\N	\N	2026-04-17 00:00:00	\N	350	ativo	0	\N	f	2026-05-23 13:09:12.60025	2026-05-23 13:09:12.60025	f
151	8	Felipe Martins	47988884444	\N	\N	2025-11-09 00:00:00	\N	1800	ativo	0	\N	f	2026-05-23 13:09:12.602159	2026-05-23 13:09:12.602159	f
152	8	Isabela Santos	47977773333	\N	\N	2026-02-26 00:00:00	\N	250	ativo	0	\N	f	2026-05-23 13:09:12.603949	2026-05-23 13:09:12.603949	f
154	8	Natalia Ramos	47999951111	\N	\N	2026-03-20 00:00:00	\N	450	ativo	0	\N	f	2026-05-23 13:09:12.608272	2026-05-23 13:09:12.608272	f
155	8	Paulo Alves	47944440000	\N	\N	2026-01-14 00:00:00	\N	150	ativo	0	\N	f	2026-05-23 13:09:12.610056	2026-05-23 13:09:12.610056	f
182	5	Contato 9984-3008	5547999843008	\N	\N	2026-05-03 00:00:00	\N	197	ativo	0	\N	f	2026-05-24 12:52:30.34815	2026-05-24 12:52:30.34815	f
160	5	Aquiles Zanluca	5547992869477	\N	\N	2026-03-25 00:00:00	\N	352	ativo	0	\N	f	2026-05-24 12:52:30.272563	2026-05-24 12:52:30.272563	f
128	8	Ana Lima	47977776666	\N	\N	2026-05-23 13:16:53.616152	\N	300	recuperado	0	\N	f	2026-05-23 13:09:12.548736	2026-05-23 13:16:53.616152	f
146	8	Aline Nascimento	47933339999	\N	\N	2026-05-23 15:59:19.179472	\N	250	recuperado	0	\N	f	2026-05-23 13:09:12.589628	2026-05-23 15:59:19.179472	f
153	8	Bruno Pereira	47966662222	\N	\N	2026-05-23 15:59:29.665996	\N	250	recuperado	0	\N	f	2026-05-23 13:09:12.606391	2026-05-23 15:59:29.665996	f
158	5	André Felipe Travaglia	5547989035893	\N	\N	2025-12-07 00:00:00	\N	446	ativo	0	\N	f	2026-05-24 12:52:30.265877	2026-05-24 12:52:30.265877	f
161	5	Ariel	5547991669755	\N	\N	2025-03-08 00:00:00	\N	295	ativo	0	\N	f	2026-05-24 12:52:30.275765	2026-05-24 12:52:30.275765	f
162	5	Braatz	5547991877616	\N	\N	2025-11-08 00:00:00	\N	409	ativo	0	\N	f	2026-05-24 12:52:30.278643	2026-05-24 12:52:30.278643	f
165	5	Dioney Kohls	5547996885585	\N	\N	2025-04-09 00:00:00	\N	270	ativo	0	\N	f	2026-05-24 12:52:30.287113	2026-05-24 12:52:30.287113	f
166	5	Douglas Donner	5547992526936	\N	\N	2025-12-09 00:00:00	\N	327	ativo	0	\N	f	2026-05-24 12:52:30.289417	2026-05-24 12:52:30.289417	f
169	5	Itamar	5547988926642	\N	\N	2025-06-10 00:00:00	\N	181	ativo	0	\N	f	2026-05-24 12:52:30.299774	2026-05-24 12:52:30.299774	f
173	5	Junior B	5547988014142	\N	\N	2025-07-11 00:00:00	\N	451	ativo	0	\N	f	2026-05-24 12:52:30.314441	2026-05-24 12:52:30.314441	f
177	5	Luiz Mengarda	5547991686913	\N	\N	2025-09-12 00:00:00	\N	419	ativo	0	\N	f	2026-05-24 12:52:30.326668	2026-05-24 12:52:30.326668	f
180	5	Contato 8817-2734	5547988172734	\N	\N	2026-10-01 00:00:00	\N	180	ativo	0	\N	f	2026-05-24 12:52:30.338003	2026-05-24 12:52:30.338003	f
204	5	Tostano	5547984280324	\N	\N	2026-05-07 00:00:00	\N	238	ativo	0	\N	f	2026-05-24 13:26:15.213084	2026-05-24 13:26:15.213084	f
176	5	Luiz	5547988830608	\N	\N	2026-05-24 14:56:03.353532	\N	376	recuperado	0	\N	f	2026-05-24 12:52:30.324145	2026-05-24 14:56:03.353532	f
157	5	Anderson Morante	5547991935680	\N	\N	2025-05-07 00:00:00	\N	300	ativo	0	\N	f	2026-05-24 12:52:30.259413	2026-05-24 12:52:30.259413	f
205	5	Lincon	5547984280324	\N	\N	2026-05-01 00:00:00	\N	168	ativo	0	\N	f	2026-05-24 13:26:15.21711	2026-05-24 13:26:15.21711	f
211	15	Ariel	5547991669755	\N	\N	2025-08-03 00:00:00	\N	300	ativo	0	\N	f	2026-05-24 15:43:07.998227	2026-05-24 15:43:07.998227	f
212	15	Braatz	5547991877616	\N	\N	2025-08-11 00:00:00	\N	300	ativo	0	\N	f	2026-05-24 15:43:08.000337	2026-05-24 15:43:08.000337	f
213	15	Carlos Augusto	5547991953829	\N	\N	2025-08-19 00:00:00	\N	300	ativo	0	\N	f	2026-05-24 15:43:08.002425	2026-05-24 15:43:08.002425	f
159	5	Andrey Pieritz Hartmann	5547999456834	\N	\N	2026-02-18 00:00:00	\N	230	ativo	0	\N	f	2026-05-24 12:52:30.269065	2026-05-24 12:52:30.269065	f
163	5	Carlos Augusto	5547991953829	\N	\N	2026-02-24 00:00:00	\N	348	ativo	0	\N	f	2026-05-24 12:52:30.281512	2026-05-24 12:52:30.281512	f
164	5	Claudio Draeger	5547999553995	\N	\N	2026-02-16 00:00:00	\N	232	ativo	0	\N	f	2026-05-24 12:52:30.284769	2026-05-24 12:52:30.284769	f
181	5	Contato 9193-7822	5547991937822	\N	\N	2026-03-14 00:00:00	\N	250	ativo	0	\N	f	2026-05-24 12:52:30.343184	2026-05-24 12:52:30.343184	f
167	5	Edson	5547996395712	\N	\N	2026-02-15 00:00:00	\N	400	ativo	0	\N	f	2026-05-24 12:52:30.292716	2026-05-24 12:52:30.292716	f
168	5	Gui Elias	5547988416454	\N	\N	2026-02-21 00:00:00	\N	246	ativo	0	\N	f	2026-05-24 12:52:30.295994	2026-05-24 12:52:30.295994	f
170	5	Jairo Dallabona	5547984387338	\N	\N	2026-03-27 00:00:00	\N	169	ativo	0	\N	f	2026-05-24 12:52:30.303275	2026-05-24 12:52:30.303275	f
171	5	Jorge Uliano	5547988171338	\N	\N	2026-01-09 00:00:00	\N	258	ativo	0	\N	f	2026-05-24 12:52:30.307715	2026-05-24 12:52:30.307715	f
172	5	Junior	5547999960246	\N	\N	2025-11-06 00:00:00	\N	382	ativo	0	\N	f	2026-05-24 12:52:30.310724	2026-05-24 12:52:30.310724	f
214	15	Claudio Draeger	5547999553995	\N	\N	2025-08-27 00:00:00	\N	300	ativo	0	\N	f	2026-05-24 15:43:08.004405	2026-05-24 15:43:08.004405	f
215	15	Dioney Kohls	5547996885585	\N	\N	2025-09-04 00:00:00	\N	300	ativo	0	\N	f	2026-05-24 15:43:08.00661	2026-05-24 15:43:08.00661	f
216	15	Douglas Donner	5547992526936	\N	\N	2025-09-12 00:00:00	\N	300	ativo	0	\N	f	2026-05-24 15:43:08.008539	2026-05-24 15:43:08.008539	f
217	15	Edson	5547996395712	\N	\N	2025-09-20 00:00:00	\N	300	ativo	0	\N	f	2026-05-24 15:43:08.011649	2026-05-24 15:43:08.011649	f
209	15	Andrey Pieritz Hartmann	5547999456834	\N	\N	2025-07-20 00:00:00	\N	300	nao_contatar	1	2026-05-24 15:54:55.686249	f	2026-05-24 15:43:07.99261	2026-05-24 15:56:44.741664	f
208	15	AndrÃ© Felipe Travaglia	5547989035893	\N	\N	2026-05-24 16:08:11.112614	\N	300	recuperado	0	\N	f	2026-05-24 15:43:07.989449	2026-05-24 16:08:11.112614	f
210	15	Aquiles Zanluca	5547992869477	\N	\N	2025-07-28 00:00:00	\N	300	contatado	1	2026-05-24 16:13:46.914195	f	2026-05-24 15:43:07.994671	2026-05-24 16:13:46.914195	t
156	5	Kayky Bazzan	5547988231164	\N	\N	2026-02-11 00:00:00	Limpeza	300	ativo	0	\N	f	2026-05-24 12:28:39.208119	2026-05-24 12:28:39.208119	f
174	5	Lourival	5547984022750	\N	\N	2025-12-08 00:00:00	\N	453	ativo	0	\N	f	2026-05-24 12:52:30.31737	2026-05-24 12:52:30.31737	f
175	5	Luciano Borges	5547996499534	\N	\N	2026-01-24 00:00:00	\N	308	ativo	0	\N	f	2026-05-24 12:52:30.321808	2026-05-24 12:52:30.321808	f
178	5	Meio Kilo	5547996530290	\N	\N	2026-01-02 00:00:00	\N	212	ativo	0	\N	f	2026-05-24 12:52:30.329743	2026-05-24 12:52:30.329743	f
179	5	Oziel	5547997401589	\N	\N	2025-11-03 00:00:00	\N	336	ativo	0	\N	f	2026-05-24 12:52:30.3335	2026-05-24 12:52:30.3335	f
218	15	Gui Elias	5547988416454	\N	\N	2025-09-28 00:00:00	\N	300	ativo	0	\N	f	2026-05-24 15:43:08.014142	2026-05-24 15:43:08.014142	f
219	15	Itamar	5547988926642	\N	\N	2025-10-06 00:00:00	\N	300	ativo	0	\N	f	2026-05-24 15:43:08.016063	2026-05-24 15:43:08.016063	f
220	15	Jairo Dallabona	5547984387338	\N	\N	2025-10-14 00:00:00	\N	300	ativo	0	\N	f	2026-05-24 15:43:08.018007	2026-05-24 15:43:08.018007	f
221	15	Jorge Uliano	5547988171338	\N	\N	2025-10-22 00:00:00	\N	300	ativo	0	\N	f	2026-05-24 15:43:08.02012	2026-05-24 15:43:08.02012	f
222	15	Junior	5547999960246	\N	\N	2025-10-30 00:00:00	\N	300	ativo	0	\N	f	2026-05-24 15:43:08.022349	2026-05-24 15:43:08.022349	f
223	15	Junior B	5547988014142	\N	\N	2025-11-07 00:00:00	\N	300	ativo	0	\N	f	2026-05-24 15:43:08.024297	2026-05-24 15:43:08.024297	f
224	15	Lourival	5547984022750	\N	\N	2025-11-15 00:00:00	\N	300	ativo	0	\N	f	2026-05-24 15:43:08.026118	2026-05-24 15:43:08.026118	f
225	15	Luciano Borges	5547996499534	\N	\N	2025-11-23 00:00:00	\N	300	ativo	0	\N	f	2026-05-24 15:43:08.028166	2026-05-24 15:43:08.028166	f
226	15	Luiz	5547988830608	\N	\N	2025-12-01 00:00:00	\N	300	ativo	0	\N	f	2026-05-24 15:43:08.030464	2026-05-24 15:43:08.030464	f
227	15	Luiz Mengarda	5547991686913	\N	\N	2025-12-09 00:00:00	\N	300	ativo	0	\N	f	2026-05-24 15:43:08.032393	2026-05-24 15:43:08.032393	f
228	15	Meio Kilo	5547996530290	\N	\N	2025-12-17 00:00:00	\N	300	ativo	0	\N	f	2026-05-24 15:43:08.034544	2026-05-24 15:43:08.034544	f
229	15	Oziel	5547997401589	\N	\N	2025-12-25 00:00:00	\N	300	ativo	0	\N	f	2026-05-24 15:43:08.03631	2026-05-24 15:43:08.03631	f
207	15	Anderson Morante	5547991935680	\N	\N	2026-05-24 15:55:04.71006	Implante	250	recuperado	0	\N	f	2026-05-24 15:43:07.98558	2026-05-24 15:55:04.71006	f
206	15	João Teste QA	5547999991111	\N	\N	2025-01-15 00:00:00	Limpeza	300	contatado	1	2026-05-24 15:53:55.557148	t	2026-05-24 15:40:46.690183	2026-05-24 16:24:58.2662	f
\.


--
-- Data for Name: Usuario; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Usuario" (id, "clinicaId", nome, email, "senhaHash", role, "criadoEm") FROM stdin;
4	5	Kayky Bazzan	kaykybazzan@gmail.com	$2b$10$/rlWa0jNV9FRP.yBKuZGYOKzj/Lx9FLUw8BLo1xRfgtnimLYT5EAG	admin	2026-05-10 17:52:15.188182
7	8	Clinica Teste	clinicateste@gmail.com	$2b$10$SbR6a6uks8M.F.YEbtSlOuE1yqAECR3I8QKri32e7sfVQa139Xruy	admin	2026-05-23 10:09:47.168776
14	15	QAteste	qa@clinicateste.com	$2b$10$0/s9/l7jsRLnj7PZSA38Me4mRAVu9RHg/OzH4TH/KyvxIqXp5w6Ga	admin	2026-05-24 15:34:36.143488
\.


--
-- Name: Clinica_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Clinica_id_seq"', 15, true);


--
-- Name: ConfiguracaoMensagens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ConfiguracaoMensagens_id_seq"', 17, true);


--
-- Name: ContactAttempt_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ContactAttempt_id_seq"', 51, true);


--
-- Name: Paciente_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Paciente_id_seq"', 232, true);


--
-- Name: Usuario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Usuario_id_seq"', 14, true);


--
-- Name: Clinica Clinica_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Clinica"
    ADD CONSTRAINT "Clinica_pkey" PRIMARY KEY (id);


--
-- Name: ConfiguracaoMensagens ConfiguracaoMensagens_clinicaId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConfiguracaoMensagens"
    ADD CONSTRAINT "ConfiguracaoMensagens_clinicaId_key" UNIQUE ("clinicaId");


--
-- Name: ConfiguracaoMensagens ConfiguracaoMensagens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConfiguracaoMensagens"
    ADD CONSTRAINT "ConfiguracaoMensagens_pkey" PRIMARY KEY (id);


--
-- Name: ContactAttempt ContactAttempt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactAttempt"
    ADD CONSTRAINT "ContactAttempt_pkey" PRIMARY KEY (id);


--
-- Name: Paciente Paciente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Paciente"
    ADD CONSTRAINT "Paciente_pkey" PRIMARY KEY (id);


--
-- Name: Usuario Usuario_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Usuario"
    ADD CONSTRAINT "Usuario_email_key" UNIQUE (email);


--
-- Name: Usuario Usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Usuario"
    ADD CONSTRAINT "Usuario_pkey" PRIMARY KEY (id);


--
-- Name: ConfiguracaoMensagens ConfiguracaoMensagens_clinicaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConfiguracaoMensagens"
    ADD CONSTRAINT "ConfiguracaoMensagens_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES public."Clinica"(id);


--
-- Name: ContactAttempt ContactAttempt_pacienteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactAttempt"
    ADD CONSTRAINT "ContactAttempt_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES public."Paciente"(id);


--
-- Name: Paciente Paciente_clinicaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Paciente"
    ADD CONSTRAINT "Paciente_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES public."Clinica"(id);


--
-- Name: Usuario Usuario_clinicaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Usuario"
    ADD CONSTRAINT "Usuario_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES public."Clinica"(id);


--
-- PostgreSQL database dump complete
--

\unrestrict sLJbu4Dsv1OcLTb7KIb9xAAlYxgkPyB2Bv8dy2vEgnZFY6teUMzv0e0s0vnTJQI

