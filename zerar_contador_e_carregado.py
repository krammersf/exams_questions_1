import json
import urllib.error
import urllib.request
from urllib.parse import quote
from pathlib import Path


FILE_PATH = Path(__file__).resolve().with_name("subopcoes.json")
FIREBASE_ORDER_STATUS_URL = (
    "https://examtopics-v1-default-rtdb.europe-west1.firebasedatabase.app/"
    "orderStatus.json"
)


def perguntar(mensagem: str) -> bool:
    while True:
        resposta = input(f"{mensagem} (s/n): ").strip().lower()
        if resposta in {"s", "sim"}:
            return True
        if resposta in {"n", "nao", "não"}:
            return False
        print("Resposta invalida. Escreva s ou n.")


def ler_estado_firebase() -> dict:
    request = urllib.request.Request(FIREBASE_ORDER_STATUS_URL)
    with urllib.request.urlopen(request, timeout=30) as response:
        estado = json.loads(response.read().decode("utf-8"))
    return estado if isinstance(estado, dict) else {}


def atualizar_estado_firebase(
    exames: list[dict], estado_atual: dict
) -> tuple[int, int]:
    estado = {
        quote(f"{exame.get('provider')}:{exame.get('value')}", safe=""): {
            "carregado": exame.get("carregado", False) is True,
            "contador": int(exame.get("contador", 0) or 0),
        }
        for exame in exames
    }
    contadores_zerados = sum(
        int(estado_atual.get(key, {}).get("contador", 0) or 0) != 0
        for key in estado
    )
    campos_carregado_alterados = sum(
        estado_atual.get(key, {}).get("carregado", False) is True
        for key in estado
    )
    request = urllib.request.Request(
        FIREBASE_ORDER_STATUS_URL,
        data=json.dumps(estado).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="PUT",
    )
    with urllib.request.urlopen(request, timeout=30):
        pass
    return contadores_zerados, campos_carregado_alterados


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
        for provider in dados:
            for exame in provider.get("exams", []):
                exame["provider"] = provider.get("provider")
        contadores_zerados = 0
        campos_carregado_alterados = 0
        try:
            estado_atual = ler_estado_firebase()
            contadores_zerados, campos_carregado_alterados = atualizar_estado_firebase(
                exames, estado_atual
            )
            if not zerar_contadores:
                contadores_zerados = 0
            if not mudar_carregado:
                campos_carregado_alterados = 0
            firebase_atualizado = True
        except (TimeoutError, ConnectionResetError, urllib.error.URLError) as error:
            firebase_atualizado = False
            print(f"Aviso: nao foi possivel atualizar o Firebase: {error}")
        for exame in exames:
            exame.pop("provider", None)
        FILE_PATH.write_text(
            json.dumps(dados, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"Ficheiro atualizado: {len(exames)} exames processados.")
        if zerar_contadores:
            print(f"Contadores zerados: {contadores_zerados}.")
        if mudar_carregado:
            print(f"Campos carregado alterados para false: {campos_carregado_alterados}.")
        print(f"Firebase orderStatus atualizado: {'sim' if firebase_atualizado else 'nao'}.")
    else:
        print("Nenhuma alteracao feita.")


if __name__ == "__main__":
    main()
