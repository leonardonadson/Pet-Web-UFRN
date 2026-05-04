# 🐾 Pet Web - Gerência de Horários de PetShop

## 🚀 Descrição do Projeto

Este repositório reúne o código e a documentação do **Pet Web**, uma plataforma web para **agendamento e gestão de horários em pet shops**, desenvolvida para a disciplina **Desenvolvimento de Sistemas Web I** da **Universidade Federal do Rio Grande do Norte (UFRN)**.

O objetivo principal é oferecer uma solução simples para que tutores possam cadastrar seus pets, consultar serviços disponíveis e agendar atendimentos online, enquanto o pet shop acompanha a agenda, controla horários, evita conflitos e gerencia seus serviços em um painel administrativo.

> 📌 Propósito: Entregar um MVP funcional que reduza agendamentos manuais por WhatsApp, telefone ou planilha, trazendo mais organização para o pet shop e mais autonomia para o tutor.

> ✨ Slogan: **"O cuidado premium que seu pet merece."**

***

## 📚 Tópicos e Conceitos Abordados

### 🔹 Planejamento de Produto

*   Visão de Produto, público-alvo e proposta de valor baseada no problema de agendamento em pet shops.
*   Definição de personas principais: **Tutor** e **Administrador do Pet Shop**.
*   MVP com foco em cadastro de pets, catálogo de serviços, agenda online e painel administrativo.
*   Levantamento de jornadas principais, regras de negócio e requisitos não funcionais.

### 🔹 Funcionalidades e Regras de Negócio

*   Agendamento online com cálculo de disponibilidade pelo backend.
*   Controle de horários de funcionamento, exceções por data, intervalos indisponíveis e capacidade simultânea.
*   Status do atendimento com fluxo operacional: `Pendente`, `Confirmado`, `Em Andamento`, `Concluído` e `Cancelado`.
*   Cancelamentos liberam o horário para novos agendamentos.

### 🔹 Arquitetura e Estrutura

*   Frontend web em HTML, CSS e JavaScript, priorizando simplicidade e clareza.
*   Backend com rotas para autenticação, pets, serviços, agendamentos e área administrativa.
*   Banco de dados para persistir usuários, pets, serviços, horários, exceções e agendamentos.
*   Organização pensada para separar interface, regras de negócio, API e documentação.

***

## 🧩 Funcionalidades Principais

### 🧑‍💼 Tutor

*   Criar conta e acessar o sistema com e-mail/senha ou Google.
*   Cadastrar, editar e excluir seus pets.
*   Consultar serviços com descrição, duração e preço.
*   Visualizar horários disponíveis por data.
*   Realizar e cancelar agendamentos.
*   Acompanhar próximos atendimentos e histórico.

### 🛠 Administrador

*   Acessar área administrativa restrita.
*   Visualizar a agenda do dia ou de um período.
*   Atualizar status dos atendimentos.
*   Gerenciar usuários, pets, serviços e tipos de pet.
*   Configurar horário semanal de funcionamento.
*   Cadastrar feriados, fechamentos, horários especiais e intervalos indisponíveis.
*   Definir capacidade simultânea de atendimentos.

***

## 🎯 Problema e Proposta de Valor

Pet shops pequenos e médios costumam organizar horários por conversas em aplicativos, ligações, papel ou planilhas. Isso pode gerar atrasos, dupla marcação, esquecimento de feriados e falta de visão clara da agenda.

O **Pet Web** propõe uma agenda centralizada, onde o tutor consegue agendar sem depender de resposta manual e o pet shop mantém controle sobre disponibilidade, serviços e status de cada atendimento.

| Para o tutor | Para o pet shop |
| :--- | :--- |
| Agendamento online a qualquer horário | Agenda centralizada e organizada |
| Cadastro persistente de pets | Redução de conversas manuais |
| Consulta de serviços e horários livres | Menos risco de dupla marcação |
| Cancelamento self-service | Controle de horários, feriados e capacidade |
| Histórico de atendimentos | Base organizada de clientes e pets |

***

## ▶️ Como Executar o Projeto

Esta seção será detalhada nas próximas etapas do projeto, quando a estrutura de frontend, backend, banco de dados e scripts de execução estiver definida com mais estabilidade.

A ideia é documentar aqui, futuramente:

*   Pré-requisitos de ambiente.
*   Comandos para instalação de dependências.
*   Execução local do frontend e da API.
*   Configuração de variáveis de ambiente.
*   Instruções de deploy.

***

## 🧪 Regras de Validação do MVP

O MVP prioriza a confiabilidade da agenda antes da expansão para recursos como pagamentos, notificações ou múltiplas unidades.

| Regra | Resultado esperado |
| :--- | :--- |
| Horários passados | Não podem ser agendados |
| Agendamento cancelado | Libera o horário novamente |
| Capacidade simultânea | Impede marcações acima do limite |
| Buffer de serviço | Evita encaixes colados sem intervalo |
| Perfil público | Sempre cria usuário como cliente |
| Feriado/fechamento | Bloqueia datas configuradas pelo admin |

***

## 📂 Estrutura do Repositório

A estrutura final do repositório ainda será consolidada conforme o desenvolvimento avançar.

Esta seção será atualizada para descrever, de forma fiel, a organização real de:

*   Código do frontend.
*   Rotas e serviços do backend.
*   Arquivos de banco de dados e seeds.
*   Documentação do produto.
*   Scripts de execução, testes e deploy.

***

## 🛠 Tecnologias

*   **Frontend:** HTML, CSS e JavaScript puro.
*   **Backend:** Node.js com rotas para autenticação, pets, serviços, agendamentos e administração.
*   **Banco de Dados:** SQLite em desenvolvimento e Postgres em produção.
*   **Autenticação:** e-mail/senha, JWT e Google OAuth.
*   **Segurança:** hash de senha, controle de perfil e validações no backend.
*   **Deploy:** Vercel.
*   **Idioma da interface:** pt-BR.

***

## 📚 Referências

*   Documento de Visão do Produto - Pet Web, versão 1.0.
*   Protótipos de baixa fidelidade elaborados para o projeto.
*   Requisitos funcionais e não funcionais definidos durante o planejamento do MVP.
*   Boas práticas de organização de interfaces web, APIs e regras de negócio.

***

## 👨‍💻 Autores

<table>
<tr>
<td align="center">
<a href="https://github.com/leonardonadson">
<img src="https://avatars.githubusercontent.com/u/72714982?v=4" width="100px;" alt="Foto de Leonardo Nadson no GitHub"/>
<br>
<sub>
<b>Leonardo Nadson</b>
</sub>
</a>
</td>
<td align="center">
<a href="https://github.com/matheus07h">
<img src="https://avatars.githubusercontent.com/u/95324105?v=4" width="100px;" alt="Foto de Matheus Henrique no GitHub"/>
<br>
<sub>
<b>Matheus Henrique</b>
</sub>
</a>
</td>
<td align="center">
<a href="https://github.com/geugenio">
<img src="https://avatars.githubusercontent.com/u/98301722?v=4" width="100px;" alt="Foto de Gabriel Eugenio no GitHub"/>
<br>
<sub>
<b>Gabriel Eugenio</b>
</sub>
</a>
</td>
</tr>
</table>

Desenvolvido como parte das atividades acadêmicas da disciplina de Desenvolvimento de Sistemas Web I da UFRN.
