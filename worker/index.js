const mysql = require("mysql2");
const amqp = require("amqplib");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");


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
    gerarPDF(htmlModificado);
  });
}

// Função para gerar o PDF a partir do HTML
async function gerarPDF(htmlConteudo) {
  // Inicia o Puppeteer e cria uma instância do navegador
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Configura a página com o conteúdo HTML modificado
  await page.setContent(htmlConteudo);

  // Gera o PDF
  await page.pdf({
    path: path.join(__dirname, "../storage/certificado_modificado.pdf"), // Caminho para salvar o PDF
    format: "A4",
    printBackground: true, // Garante que o fundo da página seja impresso
  });

  console.log("PDF gerado com sucesso: certificado_modificado.pdf");

  // Fecha o navegador
  await browser.close();
}


channel.consume(
  queue,
  // Chama a função para substituir as variáveis no HTML
  async () => {
    const connection = await amqp.connect("amqp://rabbitmq");
    const channel = await connection.createChannel();
    const queue = "diplomasQueue";

    substituirVariaveisNoHTML(caminhoTemplate, queue)
  },
  {
    noAck: true,
  }
);
