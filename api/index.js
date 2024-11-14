const express = require("express");
const mysql = require("mysql2");
const amqp = require("amqplib");
const redis = require("redis");
const bodyParser = require("body-parser");
const uuidv4 = require("uuid").v4;
const path = require("path");
const fs = require('fs');
const { log } = require("console");

const app = express();
app.use(bodyParser.json());

console.log("Tentando conectar ao Redis...");
const client = redis.createClient({
  url: "redis://redis:6379",
  retry_strategy: () => 1000,
  max_attempts: 10,
  connect_timeout: 1000,
  max_connect_timeout: 1000,
  auth_pass: "redispassword",
});

client.on("error", (err) => {
  console.error("Erro ao conectar ao Redis:", err);
});

client.connect().then((a) => {
  console.log("Conectado ao Redis");
});
let connection;
const mysqlInterval = setInterval(() => {
  try {
    connection = mysql.createConnection({
      host: "mysql",
      user: "user",
      password: "userpassword",
      database: "sistema_diplomas",
    });

    connection.connect((err) => {
      try {
        if (err) throw err;
        console.log("Conectado ao MySQL!");
        clearInterval(mysqlInterval);
      } catch (error) {
        console.error("Erro ao conectar ao MySQL:", error);
      }
    });
  } catch (error) {
    console.error("Erro ao conectar ao MySQL:", error);
  }
}, 1000);
// Conexão com o MySQL

// Conexão RabbitMQ
async function sendToQueue(message) {
  try {
    const connection = await amqp.connect("amqp://rabbitmq");
    const channel = await connection.createChannel();
    const queue = "diplomasQueue";

    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });

    console.log("Mensagem enviada para fila:", message);
  } catch (error) {
    console.error("Erro ao enviar mensagem para fila:", error);
  }
}

// Endpoint para receber JSON e salvar no MySQL
app.post("/diploma", async (req, res) => {
  const {
    nome_aluno,
    data_conclusao,
    nome_curso,
    nacionalidade,
    naturalidade,
    data_nascimento,
    numero_rg,
    data_emissao,
    assinaturas,
    diploma_path,
  } = req.body;

  // Salvando os dados no MySQL
  const query = `INSERT INTO diplomas (nome_aluno, data_conclusao, nome_curso, nacionalidade, naturalidade, data_nascimento, numero_rg, data_emissao, diploma_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const newLocal = diploma_path + "_" + uuidv4() + ".pdf";
  connection.query(
    query,
    [
      nome_aluno,
      data_conclusao,
      nome_curso,
      nacionalidade,
      naturalidade,
      data_nascimento,
      numero_rg,
      data_emissao,
      newLocal,
    ],
    (err, result) => {
      if (err) {
        console.error("Erro ao salvar no MySQL:", err);
        return res.status(500).send("Erro ao salvar no banco de dados.");
      }

      const diplomaId = result.insertId;

      // Adicionar assinaturas
      assinaturas.forEach(({ cargo, nome }) => {
        const queryAssinatura = `INSERT INTO assinaturas (diploma_id, cargo, nome) VALUES (?, ?, ?)`;
        connection.query(
          queryAssinatura,
          [result.insertId, cargo, nome],
          (err) => {
            if (err) console.error("Erro ao salvar assinatura:", err);
          }
        );
      });

      // Enviar os dados para a fila RabbitMQ
      sendToQueue({ ...req.body, diploma_path: newLocal });

      res.status(200).send({ message: "Dados recebidos e processados com sucesso. ID item:" + diplomaId, diploma_id: diplomaId });
    }
  );
});

app.get("/obterDiploma/:id", async (req, res) => {
  let resultRedis = await client.get(req.params.id).catch((err) => {console.log(err);})
  resultRedis = JSON.parse(resultRedis)

  if (resultRedis) {
    console.log("Encontrado no Redis");

    res.sendFile("/usr/src/app/storage/" + resultRedis.diploma_path, (err) => {
      if (err) {
        // Caso haja algum erro ao enviar o arquivo, loga o erro
        console.log(err);
        res.status(500).send('Erro ao enviar o arquivo');
      }
    });
  } else {
    console.log('1');
    const query = `SELECT nome_aluno, data_conclusao, nome_curso, nacionalidade, naturalidade, data_nascimento, numero_rg, data_emissao, diploma_path FROM diplomas WHERE id = ?`;

    connection.query(query, [req.params.id], (err, result) => {
      if (err) {
        console.error("Erro ao salvar no MySQL:", err);
        return res.status(500).send("Erro ao salvar no banco de dados.");
      }

      client.set(req.params.id, JSON.stringify(result[0]), "EX", 60);

      // Download function provided by express
      res.sendFile("/usr/src/app/storage/" + result[0].diploma_path, (err) => {
        if (err) {
          // Caso haja algum erro ao enviar o arquivo, loga o erro
          console.log(err);
          res.status(500).send('Erro ao enviar o arquivo');
        }
      });

    });
  }

});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
