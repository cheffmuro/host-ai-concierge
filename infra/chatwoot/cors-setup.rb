# Rodar dentro do container chatwoot-rails:
#   docker compose exec chatwoot-rails bundle exec rails runner /app/cors-setup.rb
#
# (monte este arquivo via volume ou copie com `docker cp` antes de rodar)

origins = [
  "https://host-ai-concierge.vercel.app",
  "https://app.suaempresa.com.br",
]

InstallationConfig.where(name: "CHATWOOT_HOSTS").first_or_create!(
  value: origins.join(","),
  locked: true,
)

puts "CORS origins atualizados: #{origins.join(', ')}"
