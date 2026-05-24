/**
 * Configuração de Variáveis de Ambiente
 * 
 * ATENÇÃO: Para produção via Docker, este arquivo é gerado
 * automaticamente via sed substitution no entrypoint.
 * 
 * Para desenvolvimento local, você pode definir manualmente:
 * window.ENV_CONFIG = { GROQ_API_KEY: 'sua_chave' };
 */

window.ENV_CONFIG = {
  GROQ_API_KEY: '{{GROQ_API_KEY}}',
  WHATSAPP_NUMBER: '{{WHATSAPP_NUMBER}}',
  SITE_URL: '{{SITE_URL}}'
};
