# Instruções HUBBI DEV #

Abaixo contém as tecnologias utilizadas no desenvolvimento da plataforma do Hubbi e o passo a passo para criar o ambiente de desenvolvimento.

Darei permissões para vocês fazerem uso do repositório no Bitbucket e o convite do Trello para gestão de tarefas. No início do desenvolvimento desse MVP foi usado o MeisterTask, porém foi visto que o uso do Trello é melhor.

Houve um ponto do sistema que esqueci de comentar, sobre os usuários do sistema. Para cada frente (admin, oficina e fornecedor) existem apenas 2 níveis de acesso: ADMIN e USUARIO.

## Tecnologias utilizadas: ##
Abaixo estão listadas as ferramentas usadas para auxiliar e realizar o desenvolvimento do sistema.

*  NVM: Node Version Manager, ferramenta para gerenciamento de versões NodeJS.
*  NodeJS 12.9.1
*  Express 4.17.1
*  MongoDB 4.0.9
*  Angular 8.1.0
*  PM2: gerenciamento de processos node. Utilizado em produção.
*  Robo 3T: ferramenta GUI para manipular o banco Mongo.
*  Studio 3T: ferramenta completa de gestão do Mongo, seria um SGBD.
 
## Passo a passo para criar o ambiente de desenvolvimento: ##

1.	Instalar NVM
2.	Instalar Node pelo NVM
3.	Instalar PM2: npm -g (globalmente)
4.	Instalar MongoDB
5.	Instalar Robo 3T
6.	Instalar Studio 3T
7.	Instalar Angular: npm -g (globalmente)
8.	Instalar dependências do front: npm install
9.	Rodar o front: npm run start (mais info: package.js > scripts)
10.	Instalar dependências do back: npm install
11.	Rodar o back: npm run api (mais info: package.js > scripts)
 
Erro provável: bcrypt que pode reclamar de permissões do usuário, dependências instaladas e versão do Node.

**npm install bcrypt --unsafe-perm   (força a instalação do bcrypt)**
 
Instalar Puppetier
sudo apt-get install --no-install-recommends gconf-service libasound2 libatk1.0-0 libatk-bridge2.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
 
## Repositório: Git - BitBucket ##
git clone https://luizbezerra@bitbucket.org/construtordigital/hubbi_app.git
 
## Template: Material Pro ##

* Versão Angular:
https://wrappixel.com/demos/angular-admin-templates/material-angular/material/dashboards/dashboard1

* Versão Bootstrap:
https://wrappixel.com/demos/admin-templates/material-pro/material
 
## Biblioteca de Componentes: Angular Material (Material Design) ##
https://material.angular.io