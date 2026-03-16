import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"


def run(command: list[str], cwd: Path):
    print(f"\n==> {' '.join(command)}")
    if command[0] in {"npm", "npx"}:
        subprocess.run(" ".join(command), cwd=cwd, check=True, shell=True)
        return
    subprocess.run(command, cwd=cwd, check=True)


def main():
    run([str(BACKEND / "venv" / "Scripts" / "python.exe"), "-m", "pytest"], BACKEND)
    run(["npm", "run", "test:unit"], FRONTEND)
    run(["npx", "playwright", "install", "chromium"], FRONTEND)
    run(["npm", "run", "test:e2e"], FRONTEND)


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as exc:
        sys.exit(exc.returncode)
