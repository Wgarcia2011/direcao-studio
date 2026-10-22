# Skills auxiliares de motion — instalação local

Análise e instalação em 22/10/2026. São instruções para agentes, não plugins
nativos do Concat nem instalação de bibliotecas JavaScript no Windows.

## Inventário e avaliação

| Origem | Skills principais | Aplicação e limites |
| --- | --- | --- |
| https://github.com/greensock/gsap-skills | 8 `gsap-*` | API, timelines, React, plugins e desempenho. Complementa o GSAP 3.15.0 declarado no HyperFrames local. ScrollTrigger é para interação de interface; vídeo precisa de tempo determinístico. |
| https://github.com/lottiefiles/motion-design-skill | `motion-design` | Direção de timing, easing, emoção e coreografia. Não instala player nem exportador Lottie. As regras de UI precisam ser adaptadas à duração e à fala do vídeo. |
| https://github.com/AThevon/genjutsu | `genjutsu` | Router com cast, paint, bunshin e 17 módulos internos. Útil para interfaces e direção visual. Bunshin exige escolha explícita e pode consumir muitos tokens. |
| https://github.com/CloudAI-X/threejs-skills | 13 `threejs-*` | Cenas, materiais, iluminação, shaders, assets, R3F e desempenho. Exemplos miram Three.js r186; conferir a versão real antes de copiar APIs. Não instala Three.js/R3F. |

Os quatro repositórios declaram MIT para suas skills; cópias das licenças e
atribuições foram preservadas. A licença das skills não substitui os termos
dos runtimes, plugins, fontes ou assets usados em um projeto.

## Escopos instalados

- Global do usuário Codex: `C:/Users/wagne/.codex/skills`.
- Workspace aberto: `D:/Wagner/Video/Video Editor/.agents/skills`.
- Código ativo: `.agents/skills` deste repositório.

São 22 entradas principais por escopo. Por pedido do usuário, o Genjutsu foi
retirado desses três escopos e instalado separadamente em
`D:/Wagner/Video/Video Editor/Genjutsu/.agents/skills/genjutsu`, com AGENTS.md
orientando usar somente ele nessa pasta. Skills globais/herdadas ainda podem
ser visíveis; essa instrução define o uso, não um sandbox de descoberta.

O Genjutsu foi empacotado conforme
o bundle único upstream: router em SKILL.md e pipelines/módulos em GUIDE.md,
com referências ajustadas. Isso preserva os módulos e evita ativá-los como
skills independentes. Seus exemplos de carregamento usam shell POSIX; no
PowerShell, ler os mesmos GUIDE.md por caminho explícito, sem executar Bash
como se fosse PowerShell. Os scripts de auditoria/busca usam Python.

As cópias são independentes, sem sincronização automática. A instalação usou
os helpers de validação/cópia do skill-installer, sem executar instaladores
ou workflows dos repositórios. Cada entrada tem INSTALL-SOURCE.json com origem
e commit. SKILLS-MOTION-INSTALACAO.json registra SHA-256 de todos os arquivos;
as instalações foram comparadas integralmente ao staging. O manifesto atual
registra 66 cópias nos três escopos e uma cópia isolada do Genjutsu.

## Uso no Direção Studio

Leia as skills sob demanda. HyperFrames continua seguindo suas próprias
skills de composição/render; use GSAP e Three.js como referências auxiliares,
com tempo controlado pelo framework. Remotion usa frames determinísticos;
não transportar loops autônomos, relógios ou scroll para exportação de vídeo.

Concat permanece o único editor de montagem, com interface original. A central
continua planejamento. Estas skills não autorizam redesenhar o Concat,
instalar dependências extras, publicar conteúdo ou exportar sem revisão humana.
Preserve originais e use apenas fixtures sintéticas na validação.

Exemplos de pedidos: “use motion-design para planejar a coreografia”, “consulte
gsap-timeline para um motion HyperFrames”, “consulte threejs-lighting para a
cena 3D”. Para Genjutsu, abra a pasta separada e peça “use genjutsu cast”.

Instalação de arquivos verificada; renderização, APIs dos exemplos e detecção
automática pelo agente em nova sessão não foram exercitadas nesta instalação.

Verificações do projeto após a instalação: 64 testes Python passaram; auditoria
de publicação sem problemas; 887 arquivos upstream sem divergências; TypeScript
do Remotion passou; HyperFrames lint/check passaram (9 amostras de layout e
10/10 verificações de contraste). Os testes que abrem sockets/navegador local
precisaram executar fora do sandbox após bloqueios EACCES. Esses checks validam
o projeto existente, não a renderização de cada exemplo das novas skills.
