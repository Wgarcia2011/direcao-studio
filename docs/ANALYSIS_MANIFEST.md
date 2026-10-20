# Manifesto de análise v1

CLI offline: `scripts/manifesto_analise.py`. Não requer modelos ou dependências extras.

```powershell
python scripts/pontuar_cortes.py transcricao.json --saida ranking.json
python scripts/manifesto_analise.py criar --fonte C:/Videos/original.mp4 --duracao 600 --transcricao transcricao.json --ranking ranking.json --provedor whisper-modelo-versao --saida analise.json
python scripts/manifesto_analise.py validar analise.json
python scripts/manifesto_analise.py plano-concat analise.json --cortes cut-0002 cut-0001 --saida montagem-revisao.json
```

Use arquivos de saída novos. A duração é informada e conferida pelo operador (por exemplo via ffprobe); o contrato não decodifica mídia e não comprova transcrição/qualidade audiovisual. A proveniência é declarada pelo operador. Os testes usam fonte textual sintética, adequada para conferir hashes e contrato, sem afirmar validação de vídeo.

## Contrato

- `schema: direcao.analysis`, `version: 1`; versões desconhecidas são recusadas.
- `source`: caminho local absoluto, SHA256 calculado em streaming e duração positiva em segundos.
- `transcript`: `timebase: source_seconds`, palavras `{w,s,e}` incorporadas, SHA256 do JSON canônico das palavras e `provenance.provider` (registrar serviço/modelo/versão).
- `analysis`: método e pesos provenientes do ranking.
- `candidates`: IDs estáveis dentro desse manifesto, início/fim absolutos, texto, score 0–100, critérios e justificativa. IDs mudam se o ranking for reordenado/regenerado; o plano referencia o hash do manifesto completo.
- `review`: sempre pendente e exigida antes de exportação final. Não é certificado de aprovação nem altera a barreira do cliente RPC.

Palavras exigem tempos numéricos finitos, crescentes, sem sobreposição e dentro da fonte. Esta versão trata uma fonte e uma sequência de fala; transcrições de falantes simultâneos precisam de normalização explícita. Candidatos devem alinhar nas fronteiras exatas das palavras e reproduzir seu texto. Rankings com arredondamento que desalinhe essas fronteiras são recusados; preservar precisão na geração da transcrição/ranking.

## Handoff para Concat

`direcao.concat-review-plan` é uma lista de montagem manual revisável. Só inclui IDs explicitamente selecionados, na ordem passada, com `source_in/out`, `timeline_start/end` e palavras remapeadas para a timeline contínua. Candidatos podem compartilhar material: a seleção e a ordem são decisões do operador. SHA256 da fonte é reconferido ao gerar plano; SHA256 canônico do manifesto vincula o plano à análise usada. Hashes detectam alterações acidentais, não autenticam autoria.

Na janela nativa, criar projeto de revisão, importar a fonte, montar os intervalos e conferir texto, contexto e sincronização. Para automação futura via API, ler IDs reais e conferir `project.document` após cada comando conforme `docs/CLI.md`. O plano não é `concat.json` nem um lote RPC executável.

Exportar amostra da timeline de revisão pelo fluxo `--sample`; obter aprovação humana explícita da amostra atual antes de exportação final com `--reviewed`. Nenhuma aprovação é herdada do ranking, seleção ou manifesto. O próximo P1 será o adaptador que executa comandos no Concat; esta entrega valida a ligação por dados e o handoff manual.

## Adaptador P1 de montagem

`scripts/montar_manifesto.py` executa a montagem pela API local autenticada. Leia `docs/CLI.md`, habilite a API e mantenha a janela do Concat na tela inicial. O projeto de destino precisa ser novo e ficar dentro da pasta do usuário. Não opere simultaneamente o mesmo projeto na janela e pela API.

```powershell
python scripts/montar_manifesto.py analise.json --cortes cut-0002 cut-0001 --nome Revisao-01 --evidencias C:/Users/SEU_USUARIO/Videos/evidencias-revisao-01
```

`--local` altera o diretório pai (padrão `~/Videos/Concat`). `--settings` seleciona preferências não portáteis; o token é usado internamente e não vai para as evidências. A pasta de evidências precisa ser nova, fora do projeto, com pai gravável. Não versionar essas evidências de mídia real: contêm caminhos locais e transcrição.

O adaptador confere hash/contrato, consulta `version`, cria projeto usando os parâmetros padrão do Concat (1080p/30 no snapshot atual), lê IDs reais do documento, importa fonte e compara a duração detectada com o manifesto (tolerância de 1 microssegundo). Se a duração declarada não corresponder ao probe, corrigir a análise e usar novo projeto; nenhum ajuste é feito silenciosamente. Não modifica resolução, proporção, estilo ou legendas; palavras remapeadas ficam no plano para preparação posterior.

Cada corte é adicionado, aparado pela cabeça e cauda, e reposicionado; o documento é lido após cada mutação. Depois de cada corte, verifica também todos os cortes anteriores: IDs, faixa, mídia, posição, duração e `sourceStart`. Ao terminar salva, registra documento e fecha com `save:true`, liberando o projeto para a janela nativa.

Evidências: `plano.json`, `version.json`, `operacoes.jsonl`, `documento.json` e `resultado.json`. O diário grava intenção antes da chamada e confirmação depois. Em falha pode haver projeto parcial; o último `pending` pode ter sido executado. Não há retry, rollback ou fechamento automático após erro/timeout. Confira o estado real e o diário antes de qualquer nova operação; a pasta exclusiva impede repetir a mesma execução às cegas. Um novo nome por si só não resolve um projeto anterior ainda aberto.

Após sucesso, abra o projeto salvo na janela com o launcher documentado. A montagem é para revisão; nenhuma exportação é iniciada. Exporte uma amostra da timeline de revisão pelo cliente `concat_rpc.py export.run --params amostra.json --sample --wait`, com parâmetros `path` e `output` novos dentro da pasta do usuário. `--sample` exporta a timeline inteira: selecione poucos cortes para uma amostra curta. Após aprovação humana explícita da amostra atual, use o fluxo separado `--reviewed` de `docs/CLI.md`. O adaptador não registra nem concede aprovação.

Validação executada: servidor RPC sintético com transporte TCP/autenticação reais do cliente e documento sintético em memória. Isso confirma o protocolo do adaptador, sem comprovar compatibilidade de uma distribuição Concat instalada, qualidade audiovisual ou renderização real.
