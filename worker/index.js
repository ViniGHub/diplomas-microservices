const amqp = require("amqplib");
const fs = require("fs");
const path = require("path");
const PuppeteerHTMLPDF = require("puppeteer-html-pdf");

// Caminho do arquivo HTML
const caminhoTemplate = path.join(__dirname, "template.html");

// Função para substituir as variáveis no HTML
function substituirVariaveisNoHTML(arquivo, data) {
  // Lê o conteúdo do arquivo HTML
  fs.readFile(arquivo, "utf-8", (err, conteudo) => {
    if (err) {
      console.error("Erro ao ler o arquivo:", err);
      return;
    }

    // Substitui as variáveis no HTML
    let htmlModificado = conteudo;

    const dados = JSON.parse(data.content.toString());

    // Para cada variável no objeto de dados, substitui a chave no HTML
    for (const chave in dados) {
      const valor = dados[chave];
      const regex = new RegExp(`{{${chave}}}`, "g"); // Cria uma expressão regular
      htmlModificado = htmlModificado.replace(regex, valor);
    }

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
    try {
      gerarPDF(htmlModificado);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    }
  });
}

// Função para gerar o PDF a partir do HTML
async function gerarPDF(htmlContent) {
  const htmlPDF = require("puppeteer-html-pdf");

  const options = {
    format: "A4",
    path: path.join(__dirname, "diploma.pdf"),
  };

  try {
    await htmlPDF.create(htmlContent, options);
  } catch (error) {
    console.log("htmlPDF error", error);
  }
}

// Conecta ao RabbitMQ
(async () => {
  try {
    const connection = await amqp.connect("amqp://localhost");
    const channel = await connection.createChannel();
    const queue = "diplomasQueue";

    // Cria a fila
    await channel.assertQueue(queue, { durable: true });

    // Consome a fila
    channel.consume(
      queue,
      // Chama a função para substituir as variáveis no HTML
      async (data) => {
        substituirVariaveisNoHTML(caminhoTemplate, data);
      },
      {
        noAck: true,
      }
    );
  } catch (error) {
    console.error("Erro ao ler mensagem da fila:", error);
  }
})();
