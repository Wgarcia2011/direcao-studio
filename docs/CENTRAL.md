# Central de ideias e pré-montagem

Abra `Abrir-Central.cmd` ou `ABRIR-CENTRAL.ps1`. Python 3.11+ é necessário.
O servidor escuta somente em `127.0.0.1:8790`; `-Port` permite outra porta.
O botão Abrir Concat usa o caminho local configurado pelo instalador.

Os 46 modelos são textos próprios de planejamento, com categorias inspiradas
no painel EDIT IA PRO fornecido pelo usuário. Não são uma cópia do software
comercial nem uma promessa de executar automaticamente suas técnicas.

1. Preencha as pastas, assunto e chamada em Materiais e direção.
2. Escolha Remotion, HyperFrames ou Ambos para criar as peças de motion.
3. Adicione pedidos, personalize o texto e escreva suas observações.
4. Na Pré-montagem, ordene blocos, fala, intenção visual e motor de cada cena.
5. Copie o pedido completo para o chat. O agente confere material e suporte,
   prepara fontes dos motions e monta os clipes no Concat.

Templates e rascunhos ficam no armazenamento deste navegador e origem (incluindo
porta). Para levar a outro navegador/computador ou proteger contra limpeza do
cache, use Baixar plano. Importe o JSON na aba Pré-montagem.
Ao carregar template ou importar plano, a central guarda um checkpoint local;
use Restaurar rascunho anterior para desfazer a troca, inclusive após recarregar.
Uma nova troca substitui esse checkpoint único. Importar plano também recupera
os templates do arquivo e combina com os locais, até 50, sem duplicar IDs.
Selecionar pedidos ou motores não altera um vídeo nem inicia IA.

A skill adaptada está em `skills/direcao-studio/SKILL.md`. Nesta máquina,
uma entrada local em `.agents/skills/edit-ia-pro/SKILL.md` aponta para ela.
A cópia original privada está em `skills-locais/edit-ia-pro/editor-video`,
ignorada pelo Git, com sua licença preservada. Ela não acompanha clones novos.

O servidor expõe apenas os arquivos públicos da central. Configurações, token,
pacote comercial e arquivos de vídeos não são servidos. Não usa serviço de IA,
não lê mídia pelas pastas digitadas e não sincroniza dados para uma conta.
