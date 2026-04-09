import httpx

OLLAMA_URL = "http://localhost:11434/api/chat"
DEFAULT_MODEL = "llama3.2:1b"


def chat(system_prompt, user_message, model=DEFAULT_MODEL, timeout=600):
    payload = {
        "model": model,
        "stream": False,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    }
    try:
        response = httpx.post(OLLAMA_URL, json=payload, timeout=timeout)
        response.raise_for_status()
    except httpx.ConnectError:
        raise RuntimeError("Cannot reach Ollama. Run: ollama serve")
    except httpx.HTTPStatusError as e:
        raise RuntimeError(f"Ollama error: {e.response.text}")
    return response.json()["message"]["content"]


def is_ollama_running():
    try:
        r = httpx.get("http://localhost:11434", timeout=3)
        return r.status_code == 200
    except Exception:
        return False


def list_local_models():
    try:
        r = httpx.get("http://localhost:11434/api/tags", timeout=5)
        r.raise_for_status()
        return [m["name"] for m in r.json().get("models", [])]
    except Exception:
        return []
