"""Ranqueia candidatos de corte a partir de transcricao JSON por palavra.

Entrada: {"words": [{"w": "...", "s": 0.0, "e": 0.3}, ...]}.
Saida: JSON para revisao humana; nao promete desempenho nem edita/renderiza.
"""
import argparse
import json
import re
from pathlib import Path


PADROES_GANCHO = re.compile(r"\b(por que|como|o que|quando|ninguem|todo mundo|o problema|a verdade|nao|nunca|mas|porque)\b", re.I)
PADROES_FECHO = re.compile(r"[.!?…]$")
PESOS = {"duracao": 20, "completude": 25, "gancho": 20, "densidade": 20, "pontuacao": 15}


def validar_palavras(dados):
    palavras = dados.get("words") if isinstance(dados, dict) else None
    if not isinstance(palavras, list) or not palavras:
        raise ValueError("A transcricao deve conter uma lista nao vazia 'words'.")
    validas = []
    anterior = -1.0
    for i, item in enumerate(palavras):
        if not isinstance(item, dict) or not isinstance(item.get("w"), str) or not item["w"].strip():
            raise ValueError(f"Palavra invalida no indice {i}.")
        try:
            inicio, fim = float(item["s"]), float(item["e"])
        except (KeyError, TypeError, ValueError):
            raise ValueError(f"Timestamps invalidos no indice {i}.") from None
        if inicio < 0 or fim <= inicio or inicio < anterior:
            raise ValueError(f"Intervalo invalido ou fora de ordem no indice {i}.")
        validas.append({"w": item["w"].strip(), "s": inicio, "e": fim})
        anterior = inicio
    return validas


def _texto(palavras):
    return " ".join(p["w"] for p in palavras)


def pontuar(palavras, min_seg=15, max_seg=60):
    """Produz segmentos de sentenca elegiveis e uma nota explicavel 0-100."""
    if min_seg <= 0 or max_seg < min_seg:
        raise ValueError("Informe 0 < min_seg <= max_seg.")
    grupos, atual = [], []
    for palavra in palavras:
        atual.append(palavra)
        if PADROES_FECHO.search(palavra["w"]):
            grupos.append(atual)
            atual = []
    if atual:
        grupos.append(atual)

    candidatos = []
    for i in range(len(grupos)):
        bloco = []
        for grupo in grupos[i:]:
            bloco.extend(grupo)
            duracao = bloco[-1]["e"] - bloco[0]["s"]
            if duracao > max_seg:
                break
            if duracao < min_seg:
                continue
            texto = _texto(bloco)
            n_palavras = len(bloco)
            duracao_score = max(0, 1 - abs(duracao - min(35, max_seg)) / max(min(35, max_seg), 1))
            completude = 1.0 if PADROES_FECHO.search(bloco[-1]["w"]) else 0.45
            gancho = 1.0 if PADROES_GANCHO.search(texto[:100]) else 0.35
            densidade = min(1.0, (n_palavras / max(duracao, 1)) / 2.5)
            pontuacao = min(1.0, sum(bool(PADROES_FECHO.search(p["w"])) for p in bloco) / max(duracao / 18, 1))
            criterios = {"duracao": round(duracao_score * 100), "completude": round(completude * 100),
                         "gancho": round(gancho * 100), "densidade": round(densidade * 100),
                         "pontuacao": round(pontuacao * 100)}
            nota = round(sum(criterios[k] * peso for k, peso in PESOS.items()) / 100)
            candidatos.append({"start": round(bloco[0]["s"], 3), "end": round(bloco[-1]["e"], 3),
                               "duration": round(duracao, 3), "text": texto, "score": nota,
                               "criteria": criterios,
                               "rationale": "Segmento terminado em pontuacao." if completude == 1 else "Inicio/fim requerem revisao contextual."})
    candidatos.sort(key=lambda c: (-c["score"], c["start"]))
    return candidatos


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("transcricao", type=Path)
    parser.add_argument("--saida", type=Path, required=True)
    parser.add_argument("--min-seg", type=float, default=15)
    parser.add_argument("--max-seg", type=float, default=60)
    args = parser.parse_args()
    dados = json.loads(args.transcricao.read_text(encoding="utf-8"))
    palavras = validar_palavras(dados)
    resultado = {"version": 1, "source": str(args.transcricao), "method": "heuristica deterministica; nao prediz viralizacao",
                 "weights": PESOS, "candidates": pontuar(palavras, args.min_seg, args.max_seg)}
    args.saida.parent.mkdir(parents=True, exist_ok=True)
    args.saida.write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(resultado['candidates'])} candidatos escritos em {args.saida}")


if __name__ == "__main__":
    main()
