# Validação do primeiro recorte · 19/10/2026

- Suíte Python: 27 testes, incluindo 6 do kit com fixtures sintéticas.
- Remotion: TypeScript passou com o adaptador dos tokens compartilhados.
- HyperFrames instalado: 0.8.137, GSAP 3.15.0. Checks de título, dados e
  encerramento em 1080×1920 e 1920×1080, sem erros de layout/execução/contraste.
- Amostras verticais: três MP4 H.264, 1080×1920, 30 fps, 180 frames e 6 s.
  Sem faixa de áudio. Decodificação integral pelo FFmpeg passou.
- Quadros dos MP4s inspecionados no início, construção e sustentação da
  mensagem. Dados fictícios identificados; contagem chega a 72%.
- Auditoria dos arquivos rastreados: sem problemas. Integridade dos 887
  arquivos upstream do Concat: nenhuma divergência.

Evidências e vídeos locais em `Renders/editorial-kit-v2/`, ignorados pelo Git.
O relatório `qa-report.local.json` guarda especificações e SHA256 dos MP4s.
A página `revisao.html` reúne as três amostras com controles de reprodução.
Os fontes e manifestos de cada peça estão nas subpastas ao lado.

Estado: **aprovado pelo usuário em 19/10/2026**, conforme `APROVACAO.json`,
com hashes dos três MP4s e manifestos de seus fontes. A aprovação não se
estende a novas peças nem aos testes de Blender. Os rodapés de revisão
pendente nos MP4s registram o estado original da geração; os arquivos foram
preservados e a aprovação foi registrada separadamente. Não houve publicação nem exportação de
vídeos pessoais. As peças não foram importadas numa timeline real do Concat;
o procedimento de importação/posicionamento está documentado. O adaptador
Remotion foi verificado por TypeScript; os três templates renderizados são
HyperFrames. Fontes e imagens de demonstração não são assets redistribuídos.
