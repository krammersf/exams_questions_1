import json
from pathlib import Path


FILE_PATH = Path(__file__).resolve().with_name("subopcoes.json")


def perguntar(mensagem: str) -> bool:
    while True:
        resposta = input(f"{mensagem} (s/n): ").strip().lower()
        if resposta in {"s", "sim"}:
            return True
        if resposta in {"n", "nao", "não"}:
            return False
        print("Resposta invalida. Escreva s ou n.")


def main() -> None:
    dados = json.loads(FILE_PATH.read_text(encoding="utf-8"))
    exames = [
        exame
        for provider in dados
        for exame in provider.get("exams", [])
    ]

    zerar_contadores = perguntar("Deseja zerar todos os contadores?")
    mudar_carregado = perguntar("Deseja mudar todos os campos carregado para false?")

    if zerar_contadores:
        for exame in exames:
            exame["contador"] = 0

    if mudar_carregado:
        for exame in exames:
            exame["carregado"] = False

    if zerar_contadores or mudar_carregado:
        FILE_PATH.write_text(
            json.dumps(dados, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"Ficheiro atualizado: {len(exames)} exames processados.")
    else:
        print("Nenhuma alteracao feita.")


if __name__ == "__main__":
    main()
