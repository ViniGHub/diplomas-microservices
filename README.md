## Passos para executar o projeto 

Rode o comando para inicar:
  ``docker compose up -d --build``

Execute o curl para gerar o diploma:
  curl --location 'http://localhost:3000/diploma' \
--header 'Content-Type: application/json' \
--data '{
    "nome_aluno": "Vinicius Rodrigues",
    "data_conclusao": "12/12/12",
    "nome_curso": "SIS",
    "nacionalidade": "BR",
    "naturalidade": "Braza",
    "data_nascimento": "12/12/12",
    "numero_rg": "09009",
    "data_emissao": "12/12/12",
    "assinaturas": [
        {
            "nome": "Vini",
            "cargo": "Gerente"
        }
    ],
    "diploma_path": "teste"
}'


Execute o curl para pegar o diploma:
  curl --location 'http://localhost:3000/obterDiploma/:id' \
--data ''