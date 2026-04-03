CREATE DATABASE IF NOT EXISTS voz_de_todos_mvp
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE voz_de_todos_mvp;

CREATE TABLE IF NOT EXISTS professor (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome            VARCHAR(120) NOT NULL,
  email           VARCHAR(190) NOT NULL,
  senha_hash      VARCHAR(255) NOT NULL,
  criado_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_prof_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessao (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  professor_id    BIGINT UNSIGNED NOT NULL,
  titulo          VARCHAR(160) NULL,
  codigo_acesso   VARCHAR(12) NOT NULL,
  status          ENUM('ABERTA','ENCERRADA') NOT NULL DEFAULT 'ABERTA',
  criada_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  encerrada_em    DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessao_codigo (codigo_acesso),
  KEY idx_sessao_prof (professor_id),
  KEY idx_sessao_status (status),
  CONSTRAINT fk_sessao_prof
    FOREIGN KEY (professor_id) REFERENCES professor(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS participante (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sessao_id       BIGINT UNSIGNED NOT NULL,
  nome            VARCHAR(120) NOT NULL,
  entrou_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_part_sessao (sessao_id),
  KEY idx_part_nome (nome),
  CONSTRAINT fk_part_sessao
    FOREIGN KEY (sessao_id) REFERENCES sessao(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pergunta (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sessao_id       BIGINT UNSIGNED NOT NULL,
  tipo            ENUM('ABERTA','MULTIPLA_ESCOLHA') NOT NULL,
  enunciado       TEXT NOT NULL,
  criada_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  encerrada_em    DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_pergunta_sessao (sessao_id),
  KEY idx_pergunta_tipo (tipo),
  CONSTRAINT fk_pergunta_sessao
    FOREIGN KEY (sessao_id) REFERENCES sessao(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alternativa (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pergunta_id     BIGINT UNSIGNED NOT NULL,
  ordem           INT NOT NULL,
  texto           VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_alt_pergunta_ordem (pergunta_id, ordem),
  KEY idx_alt_pergunta (pergunta_id),
  CONSTRAINT fk_alt_pergunta
    FOREIGN KEY (pergunta_id) REFERENCES pergunta(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS resposta (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pergunta_id      BIGINT UNSIGNED NOT NULL,
  participante_id  BIGINT UNSIGNED NOT NULL,
  alternativa_id   BIGINT UNSIGNED NULL,
  texto_livre      TEXT NULL,
  respondida_em    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_resp_pergunta_part (pergunta_id, participante_id),
  KEY idx_resp_pergunta (pergunta_id),
  KEY idx_resp_part (participante_id),
  KEY idx_resp_alt (alternativa_id),
  CONSTRAINT fk_resp_pergunta
    FOREIGN KEY (pergunta_id) REFERENCES pergunta(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_resp_part
    FOREIGN KEY (participante_id) REFERENCES participante(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_resp_alt
    FOREIGN KEY (alternativa_id) REFERENCES alternativa(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;
