const mysql = require("mysql2");
const amqp = require("amqplib");
const fs = require("fs");
const path = require("path");
const pdf = require("html-pdf");

// Caminho do arquivo HTML
const caminhoTemplate = path.join(__dirname, "template.html");

// Função para substituir as variáveis no HTML
function substituirVariaveisNoHTML(arquivo, queue) {
  // Lê o conteúdo do arquivo HTML
  fs.readFile(arquivo, "utf-8", (err, conteudo) => {
    if (err) {
      console.error("Erro ao ler o arquivo:", err);
      return;
    }

    // Substitui as variáveis no HTML
    let htmlModificado = conteudo;

    console.log(queue);

    // Para cada variável no objeto de dados, substitui a chave no HTML
    // for (const chave in dados) {
    //   const valor = dados[chave];
    //   const regex = new RegExp(`{{${chave}}}`, "g"); // Cria uma expressão regular
    //   htmlModificado = htmlModificado.replace(regex, valor);
    // }

    // Exibe o HTML com as variáveis substituídas
    console.log(htmlModificado);

    // Opcional: Salvar o HTML modificado em um novo arquivo
    // fs.writeFile(
    //   path.join(__dirname, "../storage/certificado_modificado.html"),
    //   htmlModificado,
    //   (err) => {
    //     if (err) {
    //       console.error("Erro ao salvar o arquivo:", err);
    //     } else {
    //       console.log(
    //         "Arquivo HTML modificado salvo como certificado_modificado.html"
    //       );
    //     }
    //   }
    // );

    // Chama a função para gerar o PDF a partir do HTML modificado
    gerarPDF(htmlModificado);
  });
}

// Função para gerar o PDF a partir do HTML
async function gerarPDF(htmlContent) {
  pdf
    .create(htmlContent)
    .toFile(
      path.join(__dirname, "../storage/certificado_modificado.pdf"),
      (err, res) => {
        if (err) return console.log(err);
        console.log("PDF generated successfully:", res);
      }
    );
}

// Conecta ao RabbitMQ
(async () => {
  const connection = await amqp.connect("amqp://rabbitmq");
  const channel = await connection.createChannel();
  const queue = "diplomasQueue";

  // Cria a fila
  await channel.assertQueue(queue, { durable: true });

  // Consome a fila
  channel.consume(
    queue,
    // Chama a função para substituir as variáveis no HTML
    async () => {
      substituirVariaveisNoHTML(caminhoTemplate, queue);
    },
    {
      noAck: true,
    }
  );
})();
