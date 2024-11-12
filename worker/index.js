const amqp = require("amqplib");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

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
      gerarPDF(htmlModificado).then((pdf) => {
        if (!pdf) {
          console.error("Erro ao gerar PDF");
          return;
        }
        console.log(dados);
        const pdfPath = path.join(__dirname, "./storage", `${dados['diploma_path']}.pdf`);
        console.log(pdfPath);
        console.log(pdf);
        fs.writeFileSync(pdfPath, pdf);
        console.log("PDF generated and saved at:", pdfPath);
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    }
  });
}

// Função para gerar o PDF a partir do HTML
async function gerarPDF(html) {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"], // Add these flags
  });
  const page = await browser.newPage();
  await page.setContent(html);
  const pdf = await page.pdf({ format: "A4", landscape: false });
  await browser.close();
  return pdf;
}

// Conecta ao RabbitMQ
(async () => {
  try {
    const intervalId = setInterval(async () => {
      const connection = await amqp.connect("amqp://rabbitmq").catch((err) => {
        console.error("Erro ao conectar ao RabbitMQ:", err);
      });
      if (!connection) {
        console.log("Erro ao conectar ao RabbitMQ");
        return;
      }
      clearInterval(intervalId);

      console.log("Conectado ao RabbitMQ");
      const channel = await connection.createChannel();
      const queue = "diplomasQueue";

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
    }, 1000);

    // Cria a fila
  } catch (error) {
    console.error("Erro ao ler mensagem da fila:", error);
  }
})();
