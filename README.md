Projekt razvija spletno aplikacijo za pogovor z velikimi jezikovnimi modeli, ki poenostavi uporabo različnih ponudnikov umetne inteligence v enem sistemu. Omogoča izbiro ponudnika in modela za posamezno sporočilo in spremljanjem porabe. Modularna zasnova omogoča enostavno razširljivost in nadaljnji razvoj sistema.

GitHub repo: https://github.com/orgs/PRPO-Skupina-11/repositories
Docker images: https://hub.docker.com/u/columbae

Install Docker Desktop, Java 21, Maven, Node.js, npm
Download all 4 repos (prpo-entry, prpo-router, prpo-usage, prpo-local) and docker images.
Go to prpo-local and add .ENV file with OpenAI and Anthropic API keys: 
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEYsk-ant-api03-...

Structure should look like this:
workspace/
  prpo-entry/
  prpo-router/
  prpo-usage/
  prpo-local/   (docker-compose)

In prpo-local run this in terminal: "docker compose up -d --build"
in prpo-entry/ui run "npm run dev"

Open http://localhost:5173/ and login with a Google account.